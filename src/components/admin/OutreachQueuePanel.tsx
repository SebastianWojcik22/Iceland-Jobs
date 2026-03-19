'use client';

import { useState, useEffect, useCallback } from 'react';

interface QueueItem {
  id: string;
  employer_name: string;
  email: string;
  region: string | null;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  subject: string | null;
  queued_at: string;
  sent_at: string | null;
  error_message: string | null;
}

interface QueueData {
  items: QueueItem[];
  counts: Record<string, number>;
}

interface SendResult {
  ok: boolean;
  sent: number;
  failed: number;
  sentToday: number;
  dailyLimit: number;
  remainingToday: number;
  error?: string;
  message?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  sending: 'bg-blue-900/40 text-blue-300 border-blue-700',
  sent: 'bg-green-900/40 text-green-300 border-green-700',
  failed: 'bg-red-900/40 text-red-300 border-red-700',
  skipped: 'bg-gray-700 text-gray-400 border-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekuje',
  sending: 'Wysyłanie',
  sent: 'Wysłano',
  failed: 'Błąd',
  skipped: 'Pominięto',
};

export function OutreachQueuePanel() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outreach/queue');
      const json = await res.json() as QueueData;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh when sending is in progress
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchQueue]);

  async function handleSendBatch() {
    setSending(true);
    setSendResult(null);
    setAutoRefresh(true);
    try {
      const res = await fetch('/api/outreach/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize }),
      });
      const result = await res.json() as SendResult;
      setSendResult(result);
      await fetchQueue();
    } finally {
      setSending(false);
      setTimeout(() => setAutoRefresh(false), 30000);
    }
  }

  const counts = data?.counts ?? {};
  const pending = counts['pending'] ?? 0;
  const sent = counts['sent'] ?? 0;
  const failed = counts['failed'] ?? 0;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const filtered = (data?.items ?? []).filter(i => filter === 'all' || i.status === filter);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Kolejka outreach</h3>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          {loading ? '↻ Ładowanie...' : '↻ Odśwież'}
        </button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Łącznie', value: total, color: 'text-white' },
          { label: 'Oczekuje', value: pending, color: 'text-yellow-400' },
          { label: 'Wysłano', value: sent, color: 'text-green-400' },
          { label: 'Błędy', value: failed, color: 'text-red-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-700 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.round((sent / total) * 100)}%` }}
          />
        </div>
      )}

      {/* Send controls */}
      {pending > 0 && (
        <div className="bg-gray-700 rounded-lg p-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Wyślij</span>
            <input
              type="number" min={1} max={50} value={batchSize}
              onChange={e => setBatchSize(Number(e.target.value))}
              className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm text-center"
            />
            <span className="text-sm text-gray-300">maili</span>
          </div>
          <button
            onClick={handleSendBatch}
            disabled={sending}
            className="px-4 py-1.5 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {sending && (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {sending ? 'Wysyłanie...' : '▶ Wyślij teraz'}
          </button>
          {autoRefresh && !sending && (
            <span className="text-xs text-blue-400 animate-pulse">auto-odświeżanie...</span>
          )}
        </div>
      )}

      {/* Send result */}
      {sendResult && (
        <div className={`p-3 rounded-lg text-sm ${sendResult.ok ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
          {sendResult.ok ? (
            sendResult.sent === 0
              ? <p>{sendResult.message ?? 'Brak oczekujących maili'}</p>
              : <>
                  <p className="font-medium">✓ Wysłano {sendResult.sent} maili</p>
                  {sendResult.failed > 0 && <p className="text-xs mt-0.5">Błędy: {sendResult.failed}</p>}
                  <p className="text-xs opacity-70 mt-1">Dziś: {sendResult.sentToday}/{sendResult.dailyLimit} · Pozostało: {sendResult.remainingToday}</p>
                </>
          ) : (
            <p>{sendResult.error}</p>
          )}
        </div>
      )}

      {/* Filter tabs */}
      {total > 0 && (
        <div className="flex gap-1 flex-wrap">
          {['all', 'pending', 'sent', 'failed', 'skipped'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                filter === s ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-700 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? `Wszystkie (${total})` : `${STATUS_LABELS[s]} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
      )}

      {/* Queue list */}
      {filtered.length > 0 ? (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-gray-700 rounded-lg text-xs">
              <span className={`px-1.5 py-0.5 rounded border text-xs shrink-0 ${STATUS_COLORS[item.status]}`}>
                {STATUS_LABELS[item.status]}
              </span>
              <span className="text-white font-medium truncate flex-1">{item.employer_name}</span>
              <span className="text-gray-400 truncate hidden sm:block">{item.email}</span>
              {item.sent_at && (
                <span className="text-gray-500 shrink-0">
                  {new Date(item.sent_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {item.error_message && (
                <span className="text-red-400 truncate max-w-32" title={item.error_message}>⚠ {item.error_message.slice(0, 30)}</span>
              )}
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Kolejka jest pusta. Zaznacz pracodawców i kliknij &quot;Wyślij aplikacje 1:1&quot;.</p>
      ) : null}
    </div>
  );
}
