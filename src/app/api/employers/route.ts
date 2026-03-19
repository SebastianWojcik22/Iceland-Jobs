import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const region = searchParams.get('region');
  const hasEmail = searchParams.get('hasEmail');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from('employers')
    .select('*', { count: 'exact' })
    .order('confidence_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);
  if (region) query = query.eq('region', region);

  if (hasEmail === 'true') {
    query = query.not('best_email', 'is', null);
  } else if (hasEmail === 'false') {
    query = query.is('best_email', null);
  }

  if (search) {
    query = query.or(
      `place_name.ilike.%${search}%,region.ilike.%${search}%,best_email.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}
