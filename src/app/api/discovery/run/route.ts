import { NextRequest, NextResponse } from 'next/server';
import { searchCategory } from '@/discovery/places-searcher';
import { filterNewEmployers, insertEmployers } from '@/discovery/employer-dedup';
import { crawlEmployerWebsite } from '@/discovery/website-crawler';
import { rankContacts } from '@/discovery/email-ranker';
import { createServerClient } from '@/lib/supabase/server-internal';
import { closeBrowser } from '@/lib/scraping/playwright-helpers';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 300;

// step=places  → only search Google Places and save employers (fast, ~30s)
// step=emails  → crawl websites of employers that have no email yet (slow, batch of 10)
// step=all     → both (default, but limited batch)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { step?: string };
  const step = body.step ?? 'places';

  const supabase = await createServerClient();

  try {
    if (step === 'places' || step === 'all') {
      // Step 1: Search Google Places – max 3 queries for speed
      const FAST_QUERIES = [
        'hotel in Iceland',
        'guesthouse in Iceland',
        'hostel in Iceland',
        'hotel in Reykjavik Iceland',
        'hotel in South Iceland',
      ];

      logger.info('Discovery step 1: searching Google Places...');
      const { CATEGORY_CONFIG } = await import('@/discovery/places-searcher');
      const allQueries = CATEGORY_CONFIG.hotel.map_queries;
      const queries = step === 'all' ? allQueries.slice(0, 3) : FAST_QUERIES;

      let totalNew = 0;
      for (const query of queries) {
        try {
          const { searchPlaces } = await import('@/lib/google/places');
          const places = await searchPlaces(query);
          const mapped = places.map(p => ({
            place_id: p.place_id,
            place_name: p.name,
            category: 'hotel' as const,
            address: p.formatted_address,
            website_url: p.website ?? null,
            phone: p.formatted_phone_number ?? null,
            maps_url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
            region: extractRegion(p.formatted_address),
          }));
          const newOnes = await filterNewEmployers(mapped);
          await insertEmployers(newOnes);
          totalNew += newOnes.length;
          logger.info(`Query "${query}": ${places.length} found, ${newOnes.length} new`);
        } catch (err) {
          logger.error(`Places query failed: ${query}`, err);
        }
      }

      if (step === 'places') {
        const { data: total } = await supabase.from('employers').select('id', { count: 'exact', head: true });
        return NextResponse.json({ ok: true, newEmployers: totalNew, totalInDB: total });
      }
    }

    // Step 2: Crawl emails – batch of 10 at a time
    logger.info('Discovery step 2: crawling emails...');
    const { data: employers } = await supabase
      .from('employers')
      .select('id, website_url, place_name')
      .is('best_email', null)
      .eq('best_contact_method', 'unknown')
      .not('website_url', 'is', null)
      .limit(10);

    let emailsFound = 0;
    for (const employer of employers ?? []) {
      if (!employer.website_url) continue;
      try {
        const crawl = await crawlEmployerWebsite(employer.website_url);
        const ranked = rankContacts(crawl);
        await supabase.from('employers').update({
          ...ranked,
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
        // Mark as processed so we don't retry forever
        await supabase.from('employers').update({ best_contact_method: 'unknown', confidence_score: -1 }).eq('id', employer.id);
      }
    }

    await closeBrowser();

    const { count: remaining } = await supabase
      .from('employers')
      .select('id', { count: 'exact', head: true })
      .is('best_email', null)
      .eq('best_contact_method', 'unknown')
      .not('website_url', 'is', null);

    return NextResponse.json({
      ok: true,
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

function extractRegion(address: string): string {
  const regions = ['Reykjavik', 'Akureyri', 'Selfoss', 'Keflavik', 'Vik', 'Hofn', 'Husavik', 'Borgarnes'];
  for (const r of regions) {
    if (address.toLowerCase().includes(r.toLowerCase())) return r;
  }
  if (address.includes('South')) return 'South Iceland';
  if (address.includes('North')) return 'North Iceland';
  return 'Iceland';
}
