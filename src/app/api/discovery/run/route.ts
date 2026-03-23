import { NextRequest, NextResponse } from 'next/server';
import { searchCategory, buildAllQueries } from '@/discovery/places-searcher';
import { filterNewEmployers, insertEmployers } from '@/discovery/employer-dedup';
import { crawlEmployerWebsite } from '@/discovery/website-crawler';
import { rankContacts } from '@/discovery/email-ranker';
import { createServerClient } from '@/lib/supabase/server-internal';
import { closeBrowser } from '@/lib/scraping/playwright-helpers';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 300;

// step=places  → search Google Places and save employers (use queryOffset to batch)
// step=emails  → crawl websites of employers missing emails (batch of 10)
// step=all     → both (limited batch for speed)

interface RequestBody {
  step?: string;
  queryOffset?: number;  // Resume from this query index
  maxQueries?: number;   // Max queries per run (default: 20)
  emailBatch?: number;   // Emails to crawl per run (default: 10)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as RequestBody;
  const step = body.step ?? 'places';
  const queryOffset = body.queryOffset ?? 0;
  const maxQueries = body.maxQueries ?? 20;
  const emailBatch = body.emailBatch ?? 10;

  const supabase = await createServerClient();
  const totalQueries = buildAllQueries().length;

  try {
    let newEmployers = 0;

    if (step === 'places' || step === 'all') {
      logger.info(`Discovery: searching Google Places (offset=${queryOffset}, max=${maxQueries})...`);

      const places = await searchCategory('hotel', queryOffset, maxQueries);
      const newOnes = await filterNewEmployers(places);
      await insertEmployers(newOnes);
      newEmployers = newOnes.length;

      logger.info(`Discovery: ${places.length} found, ${newOnes.length} new employers`);

      if (step === 'places') {
        const { count: totalInDB } = await supabase
          .from('employers')
          .select('id', { count: 'exact', head: true });

        const nextOffset = queryOffset + maxQueries;
        return NextResponse.json({
          ok: true,
          newEmployers,
          totalInDB: totalInDB ?? 0,
          queriesRun: Math.min(maxQueries, totalQueries - queryOffset),
          totalQueries,
          nextOffset: nextOffset < totalQueries ? nextOffset : null,
          done: nextOffset >= totalQueries,
        });
      }
    }

    // Step 2: Crawl emails
    logger.info(`Discovery: crawling emails (batch=${emailBatch})...`);
    const { data: employers } = await supabase
      .from('employers')
      .select('id, website_url, place_name')
      .is('best_email', null)
      .not('confidence_score', 'eq', -1)
      .not('website_url', 'is', null)
      .limit(emailBatch);

    // Skip large chain/booking sites that never have individual contact emails
    const SKIP_DOMAINS = [
      'hilton.com', 'marriott.com', 'booking.com', 'airbnb.com',
      'hotels.com', 'expedia.com', 'tripadvisor.com', 'agoda.com',
      'hostelworld.com', 'hostelbookers.com', 'google.com', 'facebook.com',
    ];
    function shouldSkip(url: string) {
      try {
        const host = new URL(url).hostname.replace('www.', '');
        return SKIP_DOMAINS.some(d => host === d || host.endsWith('.' + d));
      } catch { return true; }
    }

    // Mark chain sites immediately, collect crawlable ones
    const toCrawl: typeof employers = [];
    for (const employer of employers ?? []) {
      if (!employer.website_url) continue;
      if (shouldSkip(employer.website_url as string)) {
        await supabase.from('employers').update({ confidence_score: -1 }).eq('id', employer.id);
      } else {
        toCrawl.push(employer);
      }
    }

    // Crawl in parallel batches of 3
    const PARALLEL = 3;
    let emailsFound = 0;

    for (let i = 0; i < toCrawl.length; i += PARALLEL) {
      const chunk = toCrawl.slice(i, i + PARALLEL);
      await Promise.allSettled(chunk.map(async employer => {
        try {
          const crawl = await crawlEmployerWebsite(
            employer.website_url as string,
            employer.place_name ?? undefined,
          );
          const ranked = rankContacts(crawl);
          // If no email was found, mark as -1 so this employer is never re-queued.
          // confidence_score=0 means "nothing found" but would keep cycling forever.
          const finalScore = ranked.best_email ? ranked.confidence_score : -1;
          await supabase.from('employers').update({
            ...ranked,
            confidence_score: finalScore,
            application_form_url: crawl.applicationFormUrl,
            careers_page_url: crawl.careersPageUrl,
            updated_at: new Date().toISOString(),
          }).eq('id', employer.id);

          if (crawl.emails.length > 0) {
            emailsFound++;
            await supabase.from('employer_contacts').insert(
              crawl.emails.map(e => ({
                employer_id: employer.id,
                email: e.email,
                priority: e.priority,
                source_url: e.sourceUrl,
              }))
            );
          }
        } catch (err) {
          logger.error(`Crawl failed: ${employer.place_name}`, err);
          await supabase.from('employers')
            .update({ confidence_score: -1 })
            .eq('id', employer.id);
        }
      }));
    }

    await closeBrowser();

    const { count: remaining } = await supabase
      .from('employers')
      .select('id', { count: 'exact', head: true })
      .is('best_email', null)
      .not('confidence_score', 'eq', -1)
      .not('website_url', 'is', null);

    return NextResponse.json({
      ok: true,
      newEmployers,
      emailsFound,
      crawledBatch: employers?.length ?? 0,
      remaining: remaining ?? 0,
    });

  } catch (err) {
    await closeBrowser();
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Discovery failed', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
