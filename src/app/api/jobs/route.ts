import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');
  const status = searchParams.get('status');
  const housing = searchParams.get('housing');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .order('priority_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (provider) query = query.eq('provider', provider);

  if (status) {
    query = query.eq('review_status', status);
  } else {
    query = query.neq('review_status', 'rejected');
  }

  if (housing) query = query.eq('housing_status', housing);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}
