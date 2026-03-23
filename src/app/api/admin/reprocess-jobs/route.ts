import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { translateJobsBatch } from '@/lib/openai/translator';
import { scoreJob } from '@/lib/scoring/job-scorer';
import { logger } from '@/lib/utils/logger';
import type { NormalizedJob } from '@/providers/types';

export const maxDuration = 300;

interface ReprocessRequest {
  resetRejected?: boolean; // if true, also reprocess jobs marked as rejected
  batchSize?: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const body = (await req.json().catch(() => ({}))) as ReprocessRequest;
  const batchSize = Math.min(body.batchSize ?? 50, 100);

  // Fetch jobs to reprocess
  let query = supabase
    .from('jobs')
    .select('id, dedup_hash, title, raw_description, junior_fit_score, icelandic_required_status, review_status')
    .order('created_at', { ascending: false })
    .limit(batchSize);

  if (!body.resetRejected) {
    query = query.neq('review_status', 'rejected');
  }

  const { data: jobs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!jobs || jobs.length === 0) return NextResponse.json({ ok: true, reprocessed: 0 });

  logger.info(`Reprocessing ${jobs.length} jobs...`);

  type JobRow = { id: string; dedup_hash: string; title: string; raw_description: string | null; junior_fit_score: number; icelandic_required_status: string; review_status: string };
  const toTranslate = (jobs as JobRow[]).map(j => ({
    id: j.dedup_hash,
    title: j.title,
    raw_description: j.raw_description ?? '',
  }));

  const translations = await translateJobsBatch(toTranslate);

  let autoRejected = 0;
  let icelandicFlagged = 0;

  // Build updates in parallel, then batch upsert
  const updates = await Promise.all(
    (jobs as JobRow[]).map(async job => {
      const t = translations.get(job.dedup_hash);
      if (!t) return null;

      const rescored = scoreJob({
        raw_description: job.raw_description ?? '',
        title: job.title,
        provider: 'alfred',
        dedup_hash: job.dedup_hash,
        provider_job_id: job.dedup_hash,
        company: null, location: null, job_url: '', apply_url: null,
        posted_at: null, salary_text: null, employment_type: null,
        language_requirements: null, experience_signals_json: null,
        scrapedAt: new Date().toISOString(),
      } as unknown as NormalizedJob);

      const icelandicStatus = (t.icelandicRequired || t.kennitalRequired) ? 'yes' : rescored.icelandic_required_status;
      const autoReject = t.icelandicRequired || t.kennitalRequired || rescored.junior_fit_score < 25;

      return {
        id: job.id,
        autoReject,
        icelandicRequired: t.icelandicRequired,
        update: {
          title_pl: t.titlePL,
          summary_pl: t.summaryPL,
          requirements_pl: t.requirementsPL,
          language_note: t.languageNote,
          junior_fit_score: rescored.junior_fit_score,
          priority_score: rescored.priority_score,
          icelandic_required_status: icelandicStatus,
          ...(autoReject ? { review_status: 'rejected' } : {}),
        },
      };
    })
  );

  // Apply all updates in parallel
  await Promise.all(
    updates
      .filter(u => u !== null)
      .map(u => supabase.from('jobs').update(u!.update).eq('id', u!.id))
  );

  for (const u of updates) {
    if (!u) continue;
    if (u.autoReject) autoRejected++;
    if (u.icelandicRequired) icelandicFlagged++;
  }

  logger.info(`Reprocess done: ${autoRejected} auto-rejected, ${icelandicFlagged} icelandic flagged`);
  return NextResponse.json({
    ok: true,
    reprocessed: jobs.length,
    autoRejected,
    icelandicFlagged,
  });
}
