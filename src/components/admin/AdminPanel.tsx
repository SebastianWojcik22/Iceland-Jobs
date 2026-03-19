'use client';

import { useState } from 'react';
import type { SyncRun, ParseLog } from '@/types';
import { RunPipelineButton } from './RunPipelineButton';
import { SyncLogsTable } from './SyncLogsTable';
import { ParseFailuresTable } from './ParseFailuresTable';
import { OutreachQueuePanel } from './OutreachQueuePanel';

interface Props {
  syncRuns: SyncRun[];
  parseLogs: ParseLog[];
}

interface DiscoveryResult {
  ok: boolean;
  newEmployers?: number;
  emailsFound?: number;
  error?: string;
}

interface DiscoveryResult {
  ok: boolean;
  newEmployers?: number;
  totalInDB?: number;
  emailsFound?: number;
  crawledBatch?: number;
  remaining?: number;
  error?: string;
}

function RunDiscoveryButton() {
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  async function handleStep(step: 'places' | 'emails') {
    const setter = step === 'places' ? setLoadingPlaces : setLoadingEmails;
    setter(true);
    setResult(null);
    try {
      const res = await fetch('/api/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      });
      const data = await res.json() as DiscoveryResult;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Błąd' });
    } finally {
      setter(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-1">Odkrywanie pracodawców</h3>
      <p className="text-xs text-gray-400 mb-4">
        Krok 1: znajdź hotele z Google Maps. Krok 2: wyciągnij emaile ze stron (po 10 na raz).
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleStep('places')}
          disabled={loadingPlaces || loadingEmails}
          className="w-full py-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loadingPlaces ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Szukam hoteli (~30 sek)...
            </span>
          ) : '🗺️ Krok 1: Znajdź hotele z Google Maps'}
        </button>
        <button
          onClick={() => handleStep('emails')}
          disabled={loadingPlaces || loadingEmails}
          className="w-full py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loadingEmails ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Crawluję emaile (porcja 10)...
            </span>
          ) : '📧 Krok 2: Wyciągnij emaile (×10)'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.ok ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
          {result.ok ? (
            <>
              {result.newEmployers !== undefined && <p>Nowi pracodawcy: <strong>{result.newEmployers}</strong> (razem w bazie: {result.totalInDB ?? '?'})</p>}
              {result.emailsFound !== undefined && <p>Emaile znalezione: <strong>{result.emailsFound}</strong> / {result.crawledBatch} crawlowanych · pozostało: {result.remaining}</p>}
            </>
          ) : (
            <p>Błąd: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function GmailOAuthSection() {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') setStatus('connected');
    if (params.get('gmail') === 'error') setStatus('error');
  });

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-2">Integracja Gmail</h3>
      <p className="text-xs text-gray-400 mb-4">
        Połącz konto Gmail, aby tworzyć szkice wiadomości bezpośrednio z aplikacji.
      </p>
      {status === 'connected' ? (
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
          <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
          Gmail połączony
          <a href="/api/auth/google" className="ml-auto text-xs text-gray-400 hover:text-white underline">Zmień konto</a>
        </div>
      ) : (
        <>
          {status === 'error' && <p className="text-red-400 text-xs mb-2">Błąd połączenia – spróbuj ponownie.</p>}
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg border border-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.908 8.908 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"/>
            </svg>
            Połącz z Google
          </a>
        </>
      )}
    </div>
  );
}

export function AdminPanel({ syncRuns, parseLogs }: Props) {
  return (
    <div className="space-y-6">
      {/* Action panels */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <RunPipelineButton />
        <RunDiscoveryButton />
        <GmailOAuthSection />
      </div>

      {/* Outreach queue */}
      <OutreachQueuePanel />

      {/* Sync history */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Historia synchronizacji</h2>
        <SyncLogsTable runs={syncRuns} />
      </div>

      {/* Parse failures */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Błędy parsowania</h2>
        <ParseFailuresTable logs={parseLogs} />
      </div>
    </div>
  );
}
