import crypto from 'crypto';
import { createServerClient } from '@/lib/supabase/server-internal';
import type { NormalizedJob } from '@/providers/types';

export function makeJobHash(provider: string, providerJobId: string): string {
  return crypto.createHash('sha256').update(`${provider}::${providerJobId}`).digest('hex');
}

export async function filterNewJobs(jobs: NormalizedJob[]): Promise<NormalizedJob[]> {
  if (jobs.length === 0) return [];

  const supabase = await createServerClient();
  const hashes = jobs.map(j => j.dedup_hash);

  const { data } = await supabase.from('jobs').select('dedup_hash').in('dedup_hash', hashes);

  const existingHashes = new Set(
    (data ?? []).map((r: { dedup_hash: string }) => r.dedup_hash)
  );

  return jobs.filter(j => !existingHashes.has(j.dedup_hash));
}
