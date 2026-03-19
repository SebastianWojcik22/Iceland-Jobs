import '../src/lib/utils/env-loader';
import { EuresProvider } from '../src/providers/eures/eures-provider';
import { filterNewJobs } from '../src/lib/dedup/job-dedup';
import { scoreJob } from '../src/lib/scoring/job-scorer';
import { createServerClient } from '../src/lib/supabase/server-internal';
import { logger } from '../src/lib/utils/logger';

async function main() {
  const provider = new EuresProvider();
  logger.info('Running EURES sync...');

  const raw = await provider.fetchListings();
  const normalized = raw.map(r => provider.normalize(r));
  logger.info(`Fetched ${normalized.length} listings`);

  const newOnes = await filterNewJobs(normalized);
  logger.info(`New jobs: ${newOnes.length}`);

  if (newOnes.length > 0) {
    const supabase = await createServerClient();
    const scored = newOnes.map(job => ({
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
      ...scoreJob(job),
    }));

    const { error } = await supabase.from('jobs').insert(scored);
    if (error) {
      logger.error('Insert error', error);
    } else {
      logger.info(`Inserted ${scored.length} jobs`);
    }
  }

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
