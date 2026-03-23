import { NextRequest, NextResponse } from 'next/server';
import { EuresProvider } from '@/providers/eures/eures-provider';
import { AlfredProvider } from '@/providers/alfred/alfred-provider';
import { filterNewJobs } from '@/lib/dedup/job-dedup';
import { scoreJob } from '@/lib/scoring/job-scorer';
import { translateJobsBatch } from '@/lib/openai/translator';
import { createServerClient } from '@/lib/supabase/server-internal';
import { logger } from '@/lib/utils/logger';
import { closeBrowser } from '@/lib/scraping/playwright-helpers';
import type { BaseProvider } from '@/providers/types';

export const maxDuration = 300; // 5 min for Vercel Pro

export async function GET(req: NextRequest) {
  // CRON secret check
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runSync('cron', ['eures', 'alfred']);
}

export async function runSync(
  trigger: 'cron' | 'manual',
  providerNames: string[]
): Promise<NextResponse> {
  const supabase = await createServerClient();
  const runId = crypto.randomUUID();

  await supabase.from('sync_runs').insert({
    id: runId,
    trigger,
    providers_run: providerNames,
    status: 'running',
  });

  const allProviders: BaseProvider[] = [new EuresProvider(), new AlfredProvider()];
  const providers = allProviders.filter(p => providerNames.includes(p.name));

  let totalFetched = 0;
  let newJobs = 0;
  let duplicates = 0;
  const errors: Array<{ provider: string; message: string }> = [];

  for (const provider of providers) {
    try {
      logger.info(`Syncing provider: ${provider.name}`);
      const raw = await provider.fetchListings();
      totalFetched += raw.length;
      const normalized = raw.map(r => provider.normalize(r));
      const newOnes = await filterNewJobs(normalized);
      duplicates += normalized.length - newOnes.length;
      newJobs += newOnes.length;

      const scored = newOnes.map(job => {
        const scores = scoreJob(job);
        return {
          dedup_hash: job.dedup_hash,
          provider: job.provider,
          provider_job_id: job.provider_job_id,
          title: job.title,
          company: job.company,
          location: job.location,
          job_url: job.job_url,
          apply_url: job.apply_url,
          posted_at: job.posted_at?.toISOString() ?? null,
          employment_type: job.employment_type,
          salary_text: job.salary_text,
          language_requirements: job.language_requirements,
          raw_description: job.raw_description,
          ...scores,
        };
      });

      if (scored.length > 0) {
        // Insert jobs first
        const { error } = await supabase.from('jobs').insert(scored);
        if (error) {
          logger.error(`Insert error for ${provider.name}`, error);
        } else {
          // Translate all new jobs to Polish in batch
          logger.info(`Translating ${scored.length} jobs to Polish...`);
          const toTranslate = scored.map(j => ({
            id: j.dedup_hash, // use as temp key
            title: j.title,
            raw_description: j.raw_description ?? '',
          }));
          const translations = await translateJobsBatch(toTranslate);

          // Update each job with Polish translations
          for (const job of scored) {
            const t = translations.get(job.dedup_hash);
            if (!t) continue;
            const autoReject = t.icelandicRequired || t.kennitalRequired || job.junior_fit_score < 25;
            await supabase.from('jobs').update({
              title_pl: t.titlePL,
              summary_pl: t.summaryPL,
              requirements_pl: t.requirementsPL,
              language_note: t.languageNote,
              housing_status: t.housingMentioned && job.housing_status === 'unknown'
                ? 'maybe'
                : job.housing_status,
              ...((t.icelandicRequired || t.kennitalRequired) ? { icelandic_required_status: 'yes' } : {}),
              ...(autoReject ? { review_status: 'rejected' } : {}),
            }).eq('dedup_hash', job.dedup_hash);
            if (autoReject) {
              logger.info(`Auto-rejected: "${job.title}" (icelandic=${t.icelandicRequired}, junior_fit=${job.junior_fit_score})`);
            }
          }
          logger.info(`Translations complete for ${provider.name}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ provider: provider.name, message: msg });
      logger.error(`Provider ${provider.name} failed`, err);

      await supabase.from('parse_logs').insert({
        sync_run_id: runId,
        provider: provider.name,
        error_type: 'scraper_failure',
        message: msg,
      });
    }
  }

  await closeBrowser();

  // Translate any untranslated jobs (new or existing)
  try {
    const { data: untranslated } = await supabase
      .from('jobs')
      .select('id, dedup_hash, title, raw_description')
      .is('title_pl', null)
      .limit(50);

    if (untranslated && untranslated.length > 0) {
      logger.info(`Translating ${untranslated.length} untranslated jobs...`);
      const translations = await translateJobsBatch(
        untranslated.map((j: { id: string; dedup_hash: string; title: string; raw_description: string | null }) => ({
          id: j.dedup_hash,
          title: j.title,
          raw_description: j.raw_description ?? '',
        }))
      );
      for (const job of untranslated as Array<{ id: string; dedup_hash: string }>) {
        const t = translations.get(job.dedup_hash);
        if (!t) continue;
        await supabase.from('jobs').update({
          title_pl: t.titlePL,
          summary_pl: t.summaryPL,
          requirements_pl: t.requirementsPL,
          language_note: t.languageNote,
        }).eq('id', job.id);
      }
      logger.info(`Auto-translation complete`);
    }
  } catch (err) {
    logger.error('Auto-translation failed', err);
  }

  await supabase
    .from('sync_runs')
    .update({
      completed_at: new Date().toISOString(),
      total_fetched: totalFetched,
      new_jobs: newJobs,
      duplicates,
      errors_json: errors,
      status: errors.length === providers.length && providers.length > 0 ? 'failed' : 'completed',
    })
    .eq('id', runId);

  return NextResponse.json({ ok: true, newJobs, totalFetched, duplicates, errors });
}
