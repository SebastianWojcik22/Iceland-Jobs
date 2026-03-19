import { createClient } from '@/lib/supabase/server';
import { JobsTable } from '@/components/jobs/JobsTable';
import type { Job } from '@/types';

interface PageProps {
  searchParams: Promise<{
    provider?: string;
    status?: string;
    housing?: string;
    pair?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function JobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .order('priority_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.provider) {
    query = query.eq('provider', params.provider);
  }

  if (params.status) {
    query = query.eq('review_status', params.status);
  } else {
    query = query.neq('review_status', 'rejected');
  }

  if (params.housing) {
    query = query.eq('housing_status', params.housing);
  }

  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,company.ilike.%${params.search}%,location.ilike.%${params.search}%`
    );
  }

  const { data, count } = await query;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Oferty pracy</h1>
        <p className="text-gray-400 text-sm mt-1">
          {count ?? 0} ofert znalezionych na Islandii
        </p>
      </div>

      <JobsTable
        jobs={(data as Job[]) ?? []}
        total={count ?? 0}
        page={page}
        limit={limit}
        filters={{
          provider: params.provider as Job['provider'] | undefined,
          status: params.status as Job['review_status'] | undefined,
          housing: params.housing as Job['housing_status'] | undefined,
          search: params.search,
        }}
      />
    </div>
  );
}
