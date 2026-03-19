'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ReviewStatus } from '@/types';

export async function updateJobStatus(jobId: string, status: ReviewStatus): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('jobs')
    .update({ review_status: status, updated_at: new Date().toISOString() })
    .eq('id', jobId);
  revalidatePath('/dashboard/jobs');
}

export async function saveJob(jobId: string): Promise<void> {
  return updateJobStatus(jobId, 'saved');
}
