import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { translateJobsBatch } from '@/lib/openai/translator';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 300;

export async function POST() {
  const supabase = await createServerClient();

  // Fetch jobs without Polish translation
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, dedup_hash, title, raw_description')
    .is('title_pl', null)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!jobs || jobs.length === 0) return NextResponse.json({ ok: true, translated: 0 });

  logger.info(`Translating ${jobs.length} existing jobs...`);

  const toTranslate = jobs.map((j: { id: string; dedup_hash: string; title: string; raw_description: string | null }) => ({
    id: j.dedup_hash,
    title: j.title,
    raw_description: j.raw_description ?? '',
  }));

  const translations = await translateJobsBatch(toTranslate);

  for (const job of jobs as Array<{ id: string; dedup_hash: string; title: string; raw_description: string | null }>) {
    const t = translations.get(job.dedup_hash);
    if (!t) continue;
    await supabase.from('jobs').update({
      title_pl: t.titlePL,
      summary_pl: t.summaryPL,
      requirements_pl: t.requirementsPL,
      language_note: t.languageNote,
    }).eq('id', job.id);
  }

  logger.info(`Translation complete: ${jobs.length} jobs`);
  return NextResponse.json({ ok: true, translated: jobs.length });
}
