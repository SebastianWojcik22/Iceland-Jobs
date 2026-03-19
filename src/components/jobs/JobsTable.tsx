'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Job, ReviewStatus } from '@/types';
import { JobCard } from './JobCard';
import { JobFilters } from './JobFilters';
import { JobDetailPanel } from './JobDetailPanel';

type Tab = 'all' | 'review' | 'saved' | 'applied';

const TABS: Array<{ id: Tab; label: string; status?: ReviewStatus | null }> = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'review', label: 'Do przejrzenia' },
  { id: 'saved', label: 'Zapisane' },
  { id: 'applied', label: 'Aplikowano' },
];

interface Props {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  filters: {
    provider?: string;
    status?: string;
    housing?: string;
    search?: string;
  };
}

function JobsTableInner({ jobs, total, page, limit, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const currentTab: Tab = (() => {
    const s = filters.status;
    if (s === 'saved') return 'saved';
    if (s === 'applied') return 'applied';
    if (!s || s === 'new') return 'all';
    return 'all';
  })();

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (tab === 'all') params.delete('status');
    else if (tab === 'review') params.set('status', 'new');
    else params.set('status', tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.ceil(total / limit);

  function setPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-700 pb-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              currentTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <JobFilters />

      {/* Count */}
      <div className="text-xs text-gray-500 mb-3">
        Znaleziono: {total} ofert · Strona {page} z {Math.max(1, totalPages)}
      </div>

      {/* Grid */}
      {jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-base font-medium text-gray-400">Brak ofert</p>
          <p className="text-sm mt-1">Zmień filtry lub zsynchronizuj oferty w panelu Admin</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onOpen={setSelectedJob} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg border border-gray-600 transition-colors"
          >
            ← Poprzednia
          </button>
          <span className="text-sm text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg border border-gray-600 transition-colors"
          >
            Następna →
          </button>
        </div>
      )}

      {/* Detail panel */}
      {selectedJob && (
        <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

export function JobsTable(props: Props) {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm">Ładowanie...</div>}>
      <JobsTableInner {...props} />
    </Suspense>
  );
}
