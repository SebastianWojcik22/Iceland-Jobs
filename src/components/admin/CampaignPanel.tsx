'use client';

import { useState, useEffect } from 'react';


interface SendResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  sentToday?: number;
  dailyLimit?: number;
  remainingToday?: number;
  message?: string;
  error?: string;
}

interface CampaignStats {
  sent: number;
  failed: number;
  sentToday: number;
  batches: number;
  done: boolean;
}

const SEND_DELAY_MS = 5000; // 5s between batches
const BATCH_SIZE = 10;
const DAILY_LIMIT = 150;
const CAMPAIGN_STORAGE_KEY = 'campaign_state';

function loadStats(): CampaignStats | null {
  try {
    const s = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    return s ? JSON.parse(s) as CampaignStats : null;
  } catch { return null; }
}
function saveStats(stats: CampaignStats) {
  try { localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

export function CampaignPanel() {
  const [resetExisting, setResetExisting] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ ok: boolean; queued?: number; totalPending?: number; error?: string } | null>(null);

  const [sending, setSending] = useState(false);
  const [sendStats, setSendStats] = useState<CampaignStats | null>(null);
  const abortRef = useState<{ stopped: boolean }>({ stopped: false })[0];

  // Restore stats from localStorage on mount
  useEffect(() => {
    const saved = loadStats();
    if (saved) setSendStats(saved);
  }, []);

  async function handleCreate() {
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetExisting }),
      });
      const data = await res.json() as typeof createResult;
      setCreateResult(data);
    } catch (err) {
      setCreateResult({ ok: false, error: err instanceof Error ? err.message : 'Błąd' });
    } finally {
      setCreating(false);
    }
  }

  async function handleAutoSend() {
    abortRef.stopped = false;
    setSending(true);
    const initial: CampaignStats = { sent: 0, failed: 0, sentToday: sendStats?.sentToday ?? 0, batches: 0, done: false };
    setSendStats(initial);
    saveStats(initial);

    let totalSent = 0;
    let totalFailed = 0;
    let batches = 0;
    let sentToday = initial.sentToday;

    while (true) {
      if (abortRef.stopped) break;

      try {
        const res = await fetch('/api/outreach/send-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: BATCH_SIZE }),
        });
        const data = await res.json() as SendResult;

        if (!data.ok) break; // daily limit or error

        if ((data.sent ?? 0) === 0) break; // no more pending

        totalSent += data.sent ?? 0;
        totalFailed += data.failed ?? 0;
        batches++;
        sentToday = data.sentToday ?? sentToday;

        const updated: CampaignStats = { sent: totalSent, failed: totalFailed, sentToday, batches, done: false };
        setSendStats(updated);
        saveStats(updated);

        if ((data.remainingToday ?? 1) <= 0) break;
      } catch {
        break;
      }

      await new Promise(r => setTimeout(r, SEND_DELAY_MS));
    }

    const final: CampaignStats = { sent: totalSent, failed: totalFailed, sentToday, batches, done: true };
    setSendStats(final);
    saveStats(final);
    setSending(false);
  }

  function stopSending() {
    abortRef.stopped = true;
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-white mb-1">Kampania mailowa</h3>
        <p className="text-xs text-gray-400">
          Wysyła spersonalizowane wiadomości do wszystkich pracodawców z emailem w bazie.
          Limit: {DAILY_LIMIT} maili/dzień. Wysyłanie przebiega automatycznie z przerwami 5s.
        </p>
      </div>

      {/* Step 1: Configure */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Krok 1 – Ustawienia</div>

        <p className="text-xs text-gray-400">
          Używa szablonu zapisanego w sekcji <strong className="text-white">Szablon wiadomości</strong> powyżej (z CV i personalizacjami).
        </p>

        {/* Reset option */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={resetExisting}
            onChange={e => setResetExisting(e.target.checked)}
            className="accent-orange-500"
          />
          <span className="text-xs text-gray-300">Zresetuj nieudane/pominięte (wyślij ponownie)</span>
        </label>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {creating ? 'Tworzę kolejkę...' : '📋 Stwórz kolejkę kampanii'}
        </button>

        {createResult && (
          <div className={`p-3 rounded-lg text-sm ${createResult.ok ? 'bg-blue-900/40 border border-blue-700 text-blue-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
            {createResult.ok
              ? <p>Kolejka gotowa: <strong>{createResult.queued}</strong> maili · Oczekuje: <strong>{createResult.totalPending}</strong></p>
              : <p>Błąd: {createResult.error}</p>}
          </div>
        )}
      </div>

      {/* Step 2: Send */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Krok 2 – Auto-wysyłanie</div>
        <p className="text-xs text-gray-500">
          Automatycznie wysyła paczki {BATCH_SIZE} maili co 5 sekund aż do wyczerpania kolejki lub limitu dziennego ({DAILY_LIMIT}/dzień).
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleAutoSend}
            disabled={sending}
            className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wysyłam... ({sendStats?.sent ?? 0} wysłanych)
              </span>
            ) : '🚀 Uruchom auto-wysyłanie'}
          </button>
          {sending && (
            <button onClick={stopSending} className="px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg">
              Stop
            </button>
          )}
        </div>

        {sendStats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="text-xl font-bold text-green-400">{sendStats.sent}</div>
              <div className="text-xs text-gray-400">Wysłano</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="text-xl font-bold text-red-400">{sendStats.failed}</div>
              <div className="text-xs text-gray-400">Błędy</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="text-xl font-bold text-blue-400">{sendStats.sentToday}</div>
              <div className="text-xs text-gray-400">Dziś łącznie</div>
            </div>
          </div>
        )}

        {/* Daily limit progress bar */}
        {sendStats && sendStats.sentToday > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Limit dzienny</span>
              <span>{sendStats.sentToday} / {DAILY_LIMIT}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((sendStats.sentToday / DAILY_LIMIT) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {sendStats?.done && !sending && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700 text-green-300 text-sm">
            ✓ Zakończono. Wysłano <strong>{sendStats.sent}</strong> maili dziś.
            {(sendStats.sentToday) >= DAILY_LIMIT && ' Osiągnięto dzienny limit — kontynuuj jutro.'}
          </div>
        )}
      </div>
    </div>
  );
}
