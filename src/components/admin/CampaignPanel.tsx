'use client';

import { useState, useEffect, useCallback } from 'react';

interface QueueStats {
  pending: number;
  sent: number;
  failed: number;
  sentToday: number;
  dailyMax: number;
  warmupStage: number;
}

interface CreateResult {
  ok: boolean;
  queued?: number;
  totalPending?: number;
  error?: string;
}

interface SendResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  sentToday?: number;
  dailyMax?: number;
  remainingToday?: number;
  warmupStage?: number;
  reason?: string;
  error?: string;
}

export function CampaignPanel() {
  const [resetExisting, setResetExisting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [manualSending, setManualSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/campaign/stats');
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; stats?: QueueStats };
      if (data.ok && data.stats) setStats(data.stats);
    } catch { /* ignore */ }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  async function handleCreate() {
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetExisting }),
      });
      const data = await res.json() as CreateResult;
      setCreateResult(data);
      if (data.ok) fetchStats();
    } catch (err) {
      setCreateResult({ ok: false, error: err instanceof Error ? err.message : 'Błąd' });
    } finally {
      setCreating(false);
    }
  }

  async function handleManualSend() {
    setManualSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/cron/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`,
        },
      });
      const data = await res.json() as SendResult;
      setSendResult(data);
      fetchStats();
    } catch (err) {
      setSendResult({ ok: false, error: err instanceof Error ? err.message : 'Błąd' });
    } finally {
      setManualSending(false);
    }
  }

  const todayPercent = stats ? Math.min(100, Math.round((stats.sentToday / Math.max(stats.dailyMax, 1)) * 100)) : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-white mb-1">Kampania mailowa</h3>
        <p className="text-xs text-gray-400">
          Maile wysyłają się automatycznie przez Vercel Cron — działa nawet gdy komputer jest wyłączony.
        </p>
      </div>

      {/* Cloud schedule info */}
      <div className="p-3 rounded-lg bg-blue-950/50 border border-blue-800 space-y-1.5">
        <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
          Automatyczny harmonogram (chmura)
        </div>
        <ul className="text-xs text-blue-200/70 space-y-0.5 pl-4">
          <li>• Pon–Pt o <strong className="text-blue-200">9:00</strong> i <strong className="text-blue-200">14:00</strong> UTC</li>
          <li>• Limit rośnie stopniowo: 10 → 25 → 50 → 80 → 100/dzień (warm-up)</li>
          <li>• Cooldown 7 dni: ta sama domena nie dostanie 2 maili w tygodniu</li>
          <li>• Losowe opóźnienie 4–12s między mailami (anti-spam pattern)</li>
          <li>• Wysyłka zatrzymuje się automatycznie przy błędzie autoryzacji Gmail</li>
        </ul>
      </div>

      {/* Live stats */}
      {!loadingStats && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="text-lg font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-gray-400">Kolejka</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="text-lg font-bold text-green-400">{stats.sent}</div>
              <div className="text-xs text-gray-400">Wysłano</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="text-lg font-bold text-blue-400">{stats.sentToday}</div>
              <div className="text-xs text-gray-400">Dziś</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2">
              <div className="text-lg font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-gray-400">Błędy</div>
            </div>
          </div>

          {stats.dailyMax > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Limit dzienny (etap warm-up)</span>
                <span>{stats.sentToday} / {stats.dailyMax}</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${todayPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Create queue */}
      <div className="space-y-3 border-t border-gray-700 pt-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Krok 1 – Załaduj kolejkę</div>
        <p className="text-xs text-gray-500">
          Tworzy listę maili do wysłania na podstawie szablonu i bazy pracodawców. Uruchom raz przed kampanią.
        </p>

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
              ? <p>✓ Kolejka gotowa: <strong>{createResult.queued}</strong> maili dodanych · Oczekuje łącznie: <strong>{createResult.totalPending}</strong></p>
              : <p>Błąd: {createResult.error}</p>}
          </div>
        )}
      </div>

      {/* Step 2: Manual trigger */}
      <div className="space-y-3 border-t border-gray-700 pt-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Krok 2 – Wyślij teraz (opcjonalnie)</div>
        <p className="text-xs text-gray-500">
          Cron wysyła automatycznie. Ten przycisk uruchamia jedną serię ręcznie — przydatny do pierwszego testu.
        </p>

        <button
          onClick={handleManualSend}
          disabled={manualSending}
          className="w-full py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {manualSending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Wysyłam...
            </span>
          ) : '🚀 Wyślij teraz (jeden batch)'}
        </button>

        {sendResult && (
          <div className={`p-3 rounded-lg text-sm space-y-1 ${sendResult.ok ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>
            {sendResult.ok ? (
              <>
                <p>✓ Wysłano: <strong>{sendResult.sent}</strong> · Błędy: <strong>{sendResult.failed ?? 0}</strong> · Pominięto (cooldown): <strong>{sendResult.skipped ?? 0}</strong></p>
                {sendResult.reason === 'daily_limit_reached' && <p className="text-yellow-300">⚠ Dzienny limit osiągnięty ({sendResult.sentToday}/{sendResult.dailyMax})</p>}
                {sendResult.reason === 'queue_empty' && <p>Kolejka pusta — załaduj pracodawców lub stwórz kolejkę ponownie.</p>}
              </>
            ) : (
              <p>Błąd: {sendResult.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
