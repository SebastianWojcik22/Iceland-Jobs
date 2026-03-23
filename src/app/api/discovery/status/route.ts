import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';

export async function GET() {
  const supabase = await createServerClient();

  const [{ count: totalInDB }, { count: withEmail }, { count: remaining }] = await Promise.all([
    supabase.from('employers').select('id', { count: 'exact', head: true }),
    supabase.from('employers').select('id', { count: 'exact', head: true }).not('best_email', 'is', null),
    supabase.from('employers').select('id', { count: 'exact', head: true })
      .is('best_email', null)
      .not('confidence_score', 'eq', -1)
      .not('website_url', 'is', null),
  ]);

  return NextResponse.json({
    totalInDB: totalInDB ?? 0,
    emailsFound: withEmail ?? 0,
    remaining: remaining ?? 0,
  });
}
