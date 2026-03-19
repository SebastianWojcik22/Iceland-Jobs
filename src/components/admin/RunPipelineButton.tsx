'use client';

import { useState } from 'react';
import type { ProviderName } from '@/types';

const ALL_PROVIDERS: ProviderName[] = ['eures', 'alfred', 'jobs_is', 'island', 'storf'];

interface SyncResult {
  ok: boolean;
  newJobs?: number;
  totalFetched?: number;
  duplicates?: number;
  errors?: Array<{ provider: string; message: string }>;
  error?: string;
}

export function RunPipelineButton() {
  const [providers, setProviders] = useState<Set<ProviderName>>(new Set(ALL_PROVIDERS));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  function toggleProvider(p: ProviderName) {
    setProviders(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: [...providers] }),
      });
      const data = await res.json() as SyncResult;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Błąd połączenia' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-4">Synchronizacja ofert pracy</h3>

      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Źródła danych:</p>
        <div className="flex flex-wrap gap-2">
          {ALL_PROVIDERS.map(p => (
            <label key={p} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={providers.has(p)}
                onChange={() => toggleProvider(p)}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm text-gray-300">{p}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSync}
        disabled={loading || providers.size === 0}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Synchronizacja trwa...
          </span>
        ) : (
          '🔄 Synchronizuj oferty'
        )}
      </button>

      {result && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${result.ok ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
          {result.ok ? (
            <div className="space-y-1">
              <p className="font-medium">Synchronizacja zakończona</p>
              <p>Nowe oferty: <strong>{result.newJobs ?? 0}</strong></p>
              <p>Łącznie pobrano: {result.totalFetched ?? 0} · Duplikaty: {result.duplicates ?? 0}</p>
              {result.errors && result.errors.length > 0 && (
                <p className="text-yellow-400 mt-1">Błędy: {result.errors.map(e => `${e.provider}: ${e.message}`).join(', ')}</p>
              )}
            </div>
          ) : (
            <p>Błąd: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
