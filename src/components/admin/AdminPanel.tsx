'use client';

import { useState, useEffect } from 'react';
import type { SyncRun, ParseLog } from '@/types';
import { RunPipelineButton } from './RunPipelineButton';
import { SyncLogsTable } from './SyncLogsTable';
import { ParseFailuresTable } from './ParseFailuresTable';
import { OutreachQueuePanel } from './OutreachQueuePanel';
import { CampaignPanel } from './CampaignPanel';
import { EmailRunnerWidget } from './EmailRunnerWidget';
import { TemplateEditor } from './TemplateEditor';

interface Props {
  syncRuns: SyncRun[];
  parseLogs: ParseLog[];
}

const TOTAL_QUERIES = 432;
const QUERIES_PER_BATCH = 20;
const EMAILS_PER_BATCH = 10;

type DiscoveryPhase = 'idle' | 'paused' | 'places' | 'emails' | 'done' | 'error';

interface DiscoveryState {
  phase: DiscoveryPhase;
  queriesDone: number;
  totalInDB: number;
  newEmployers: number;
  emailsFound: number;
  emailsRemaining: number;
  error?: string;
}

const STORAGE_KEY = 'discovery_state';

const DISCOVERY_DEFAULT: DiscoveryState = { phase: 'idle', queriesDone: 0, totalInDB: 0, newEmployers: 0, emailsFound: 0, emailsRemaining: 0 };

function RunDiscoveryButton() {
  const [state, setState] = useState<DiscoveryState>(DISCOVERY_DEFAULT);
  const abortRef = useState<{ stopped: boolean }>({ stopped: false })[0];

  // Load persisted state after hydration (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DiscoveryState;
        const phase = (parsed.phase === 'places' || parsed.phase === 'emails') ? 'paused' : parsed.phase;
        setState({ ...parsed, phase });
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch real DB stats on mount
  useEffect(() => {
    fetch('/api/discovery/status')
      .then(r => r.json())
      .then((data: { totalInDB?: number; emailsFound?: number; remaining?: number }) => {
        setState(s => ({
          ...s,
          totalInDB: data.totalInDB ?? s.totalInDB,
          emailsFound: data.emailsFound ?? s.emailsFound,
          emailsRemaining: data.remaining ?? s.emailsRemaining,
          queriesDone: data.totalInDB && data.totalInDB > 0 ? TOTAL_QUERIES : s.queriesDone,
        }));
      })
      .catch(() => {});
  }, []);

  function updateState(update: Partial<DiscoveryState> | ((s: DiscoveryState) => DiscoveryState)) {
    setState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  async function runFullDiscovery() {
    abortRef.stopped = false;
    updateState(s => ({ ...s, phase: 'places', newEmployers: 0, emailsFound: 0, error: undefined }));

    // Phase 1: find all places (skip if already done)
    let offset = state.queriesDone >= TOTAL_QUERIES ? TOTAL_QUERIES : 0;
    let totalNew = 0;
    let totalInDB = state.totalInDB;

    while (offset < TOTAL_QUERIES) {
      if (abortRef.stopped) break;
      try {
        const res = await fetch('/api/discovery/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'places', queryOffset: offset, maxQueries: QUERIES_PER_BATCH }),
        });
        const data = await res.json() as { ok: boolean; newEmployers?: number; totalInDB?: number; nextOffset?: number; done?: boolean; error?: string };
        if (!data.ok) throw new Error(data.error ?? 'Błąd API');
        totalNew += data.newEmployers ?? 0;
        totalInDB = data.totalInDB ?? totalInDB;
        offset = data.nextOffset ?? TOTAL_QUERIES;
        updateState(s => ({ ...s, queriesDone: Math.min(offset, TOTAL_QUERIES), newEmployers: totalNew, totalInDB }));
        if (data.done) break;
      } catch (err) {
        updateState(s => ({ ...s, phase: 'error', error: err instanceof Error ? err.message : 'Błąd miejsca' }));
        return;
      }
    }

    if (abortRef.stopped) { updateState(s => ({ ...s, phase: 'idle' })); return; }

    updateState(s => ({ ...s, phase: 'done' }));
  }

  function stop() { abortRef.stopped = true; }

  const running = state.phase === 'places';
  const hasProgress = state.queriesDone > 0 || state.totalInDB > 0;
  const placesProgress = Math.round((state.queriesDone / TOTAL_QUERIES) * 100);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 col-span-1 lg:col-span-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-white">Odkrywanie pracodawców</h3>
        {running && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 border border-green-700 text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Działa
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Automatycznie znajdzie wszystkie hotele, restauracje i hostele w Islandii, a następnie wyciągnie z ich stron adresy email.
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={runFullDiscovery}
          disabled={running}
          className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Szukam miejsc… ({state.queriesDone}/{TOTAL_QUERIES})
            </span>
          ) : '🚀 Szukaj nowych miejsc'}
        </button>
        {running && (
          <button onClick={stop} className="px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg">
            Stop
          </button>
        )}
      </div>

      {/* Progress – always visible when there's data */}
      {hasProgress && (
        <div className="mt-4 space-y-2">
          {/* Places progress */}
          {state.queriesDone > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Miejsca z Google Maps</span>
                <span>{state.queriesDone}/{TOTAL_QUERIES} zapytań · razem w bazie: <strong className="text-white">{state.totalInDB}</strong></span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${placesProgress}%` }} />
              </div>
            </div>
          )}

          {/* Emails progress */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>Emaile znalezione</span>
            <span>
              <strong className="text-green-400">{state.emailsFound}</strong>
              {state.emailsRemaining > 0 && <span className="ml-2 text-gray-500">· do sprawdzenia: {state.emailsRemaining}</span>}
            </span>
          </div>
          {state.emailsRemaining > 0 && (
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.round((state.emailsFound / (state.emailsFound + state.emailsRemaining)) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {state.phase === 'done' && (
        <div className="mt-3 p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-300 text-sm">
          ✓ Gotowe! Znaleziono <strong>{state.totalInDB}</strong> pracodawców, wyciągnięto <strong>{state.emailsFound}</strong> emaili.
        </div>
      )}
      {state.phase === 'error' && (
        <div className="mt-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          Błąd: {state.error}
        </div>
      )}
    </div>
  );
}

function CleanEmailsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; cleaned?: number; examples?: Array<{ name: string; email: string }>; error?: string } | null>(null);

  async function handle() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/clean-emails', { method: 'POST' });
      const data = await res.json() as typeof result;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Błąd' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-1">Wyczyść błędne emaile</h3>
      <p className="text-xs text-gray-400 mb-4">
        Usuwa fałszywe emaile (artefakty JS/CSS) i resetuje te firmy do ponownego crawlowania.
      </p>
      <button
        onClick={handle}
        disabled={loading}
        className="w-full py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? 'Czyszczę...' : '🧹 Wyczyść błędne emaile'}
      </button>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.ok ? 'bg-orange-900/40 border border-orange-700 text-orange-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
          {result.ok ? (
            <>
              <p>Wyczyszczono: <strong>{result.cleaned}</strong> błędnych emaili</p>
              {result.examples && result.examples.length > 0 && (
                <ul className="mt-1 text-xs opacity-70 space-y-0.5">
                  {result.examples.map((e, i) => <li key={i}>{e.name}: {e.email}</li>)}
                </ul>
              )}
            </>
          ) : <p>Błąd: {result.error}</p>}
        </div>
      )}
    </div>
  );
}

function GmailOAuthSection() {
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') setStatus('connected');
    if (params.get('gmail') === 'error') setStatus('error');
  }, []);

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

function ReprocessJobsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; reprocessed?: number; autoRejected?: number; icelandicFlagged?: number; error?: string } | null>(null);

  async function handle(resetRejected = false) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/reprocess-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetRejected, batchSize: 50 }),
      });
      const data = await res.json() as typeof result;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Błąd' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-1">Przelicz istniejące oferty</h3>
      <p className="text-xs text-gray-400 mb-4">
        Przetłumaczy i ponownie oceni oferty — usunie te wymagające islandzkiego lub dużego doświadczenia.
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handle(false)}
          disabled={loading}
          className="w-full py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Przetwarzam (do 2 min)...
            </span>
          ) : '🔁 Przelicz oferty (×50)'}
        </button>
        <button
          onClick={() => handle(true)}
          disabled={loading}
          className="w-full py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Przelicz też odrzucone
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.ok ? 'bg-purple-900/40 border border-purple-700 text-purple-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
          {result.ok ? (
            <>
              <p>Przetworzone: <strong>{result.reprocessed}</strong> ofert</p>
              <p>Odrzucone automatycznie: <strong>{result.autoRejected}</strong></p>
              <p>Wymagające islandzkiego: <strong>{result.icelandicFlagged}</strong></p>
            </>
          ) : (
            <p>Błąd: {result.error}</p>
          )}
        </div>
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
        <GmailOAuthSection />
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <RunDiscoveryButton />
        <EmailRunnerWidget />
      </div>

      {/* Reprocess + clean panel */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <ReprocessJobsButton />
        <CleanEmailsButton />
      </div>

      {/* Template editor */}
      <TemplateEditor />

      {/* Campaign + Outreach */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <CampaignPanel />
        <OutreachQueuePanel />
      </div>

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
