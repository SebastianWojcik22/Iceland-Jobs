'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import type { ProviderName, ReviewStatus, HousingStatus } from '@/types';

export function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const provider = searchParams.get('provider') ?? '';
  const status = searchParams.get('status') ?? '';
  const housing = searchParams.get('housing') ?? '';
  const search = searchParams.get('search') ?? '';

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Szukaj (tytuł, firma, lokalizacja)..."
        value={search}
        onChange={e => setParam('search', e.target.value)}
        className="flex-1 min-w-48 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Provider */}
      <select
        value={provider}
        onChange={e => setParam('provider', e.target.value)}
        className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Wszystkie źródła</option>
        {(['alfred', 'island', 'jobs_is', 'storf', 'eures'] satisfies ProviderName[]).map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={status}
        onChange={e => setParam('status', e.target.value)}
        className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Wszystkie statusy</option>
        {(['new', 'saved', 'applied', 'rejected'] satisfies ReviewStatus[]).map(s => (
          <option key={s} value={s}>
            {{ new: 'Nowe', saved: 'Zapisane', applied: 'Aplikowano', rejected: 'Odrzucone' }[s]}
          </option>
        ))}
      </select>

      {/* Housing */}
      <select
        value={housing}
        onChange={e => setParam('housing', e.target.value)}
        className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Zakwaterowanie: Wszystkie</option>
        {(['yes', 'maybe', 'unknown'] satisfies HousingStatus[]).map(h => (
          <option key={h} value={h}>
            {{ yes: 'Tak', maybe: 'Może', unknown: 'Nieznane', no: 'Brak' }[h]}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {(provider || status || housing || search) && (
        <button
          onClick={() => router.push(pathname)}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors"
        >
          Wyczyść filtry
        </button>
      )}
    </div>
  );
}
