'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateEmployerNotes(employerId: string, notes: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('employers')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', employerId);
  revalidatePath('/dashboard/employers');
}
