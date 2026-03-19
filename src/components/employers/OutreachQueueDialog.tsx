'use client';

import { useState, useEffect } from 'react';
import type { TemplateId } from '@/lib/google/gmail-templates';
import { TEMPLATES, fillTemplate } from '@/lib/google/gmail-templates';

interface Props {
  employerIds: string[];
  employerNames: string[];
  onClose: () => void;
  onQueued: () => void;
}

interface QueueResult { queued: number }
interface SendResult {
  ok: boolean; sent: number; failed: number;
  sentToday: number; dailyLimit: number; remainingToday: number; error?: string;
}

const STORAGE_KEY = 'outreach_custom_template';

function loadSaved(templateId: TemplateId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${templateId}`);
    if (raw) return JSON.parse(raw) as { subject: string; body: string };
  } catch {}
  return null;
}

function saveTpl(templateId: TemplateId, subject: string, body: string) {
  localStorage.setItem(`${STORAGE_KEY}_${templateId}`, JSON.stringify({ subject, body }));
}

export function OutreachQueueDialog({ employerIds, employerNames, onClose, onQueued }: Props) {
  const [templateId, setTemplateId] = useState<TemplateId>('hotel_general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [step, setStep] = useState<'configure' | 'queued'>('configure');
  const [loading, setLoading] = useState(false);
  const [queueResult, setQueueResult] = useState<QueueResult | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(10);

  // Load template (saved custom or default)
  useEffect(() => {
    const saved = loadSaved(templateId);
    if (saved) {
      setSubject(saved.subject);
      setBody(saved.body);
    } else {
      const tpl = TEMPLATES[templateId];
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
    setEditing(false);
  }, [templateId]);

  function handleSave() {
    saveTpl(templateId, subject, body);
    setSavedMsg(true);
    setEditing(false);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  function handleReset() {
    const tpl = TEMPLATES[templateId];
    setSubject(tpl.subject);
    setBody(tpl.body);
    localStorage.removeItem(`${STORAGE_KEY}_${templateId}`);
  }

  // Preview with first employer's data
  const previewSubject = subject
    .replace(/\{\{employer_name\}\}/g, employerNames[0] ?? 'Hotel Example')
    .replace(/\{\{region_line\}\}/g, ' in Reykjavik');
  const previewBody = body
    .replace(/\{\{employer_name\}\}/g, employerNames[0] ?? 'Hotel Example')
    .replace(/\{\{region_line\}\}/g, ' in Reykjavik');

  async function handleAddToQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/outreach/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerIds,
          templateId,
          customSubject: subject,
          customBody: body,
        }),
      });
      const data = await res.json() as QueueResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Błąd kolejki');
      setQueueResult(data);
      setStep('queued');
      onQueued();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendBatch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/outreach/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize }),
      });
      const data = await res.json() as SendResult;
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Błąd wysyłki');
      setSendResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div>
              <h2 className="text-base font-bold text-white">Wyślij aplikacje 1:1</h2>
              <p className="text-xs text-gray-400">{employerIds.length} pracodawców · osobny mail do każdego</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {step === 'configure' && (
              <>
                {/* Template selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Szablon</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.values(TEMPLATES)).map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => setTemplateId(tpl.id)}
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors text-left ${
                          templateId === tpl.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-400">Temat maila</label>
                    <span className="text-xs text-gray-500">użyj {'{{employer_name}}'}</span>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setEditing(true); }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Body editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-400">Treść maila</label>
                    <span className="text-xs text-gray-500">{'{{employer_name}}'} · {'{{region_line}}'}</span>
                  </div>
                  <textarea
                    value={body}
                    onChange={e => { setBody(e.target.value); setEditing(true); }}
                    rows={10}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y font-mono"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 text-xs bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
                    >
                      {savedMsg ? '✓ Zapisano!' : 'Zapisz jako wzór'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg transition-colors"
                    >
                      Przywróć domyślny
                    </button>
                    {loadSaved(templateId) && !editing && (
                      <span className="text-xs text-blue-400 flex items-center">✓ Własny wzór aktywny</span>
                    )}
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-600">
                  <p className="text-xs text-gray-500 mb-1">Podgląd dla: <span className="text-gray-300">{employerNames[0] ?? 'Hotel Example'}</span></p>
                  <p className="text-xs font-medium text-white mb-1">Temat: {previewSubject}</p>
                  <p className="text-xs text-gray-400 whitespace-pre-wrap line-clamp-4">{previewBody}</p>
                </div>

                {/* Info */}
                <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3 text-xs text-blue-300">
                  Każdy mail będzie miał unikalną nazwę hotelu i region. Wysyłka po dodaniu do kolejki z limitem 50/dzień.
                </div>

                {error && (
                  <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors border border-gray-600">
                    Anuluj
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    disabled={loading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {loading ? 'Dodawanie...' : `Dodaj ${employerIds.length} do kolejki →`}
                  </button>
                </div>
              </>
            )}

            {step === 'queued' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">{queueResult?.queued} maili gotowych w kolejce</span>
                </div>

                {sendResult ? (
                  <div className={`p-3 rounded-lg text-sm ${sendResult.ok ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'}`}>
                    {sendResult.ok ? (
                      <>
                        <p className="font-medium">Wysłano {sendResult.sent} maili!</p>
                        {sendResult.failed > 0 && <p className="text-xs mt-0.5">Błędy: {sendResult.failed}</p>}
                        <p className="text-xs opacity-70 mt-1">Dziś: {sendResult.sentToday}/{sendResult.dailyLimit} · Pozostało dziś: {sendResult.remainingToday}</p>
                      </>
                    ) : (
                      <p>{sendResult.error}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-white font-medium">Wyślij teraz:</p>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400">Ile maili:</label>
                      <input
                        type="number" min={1} max={50} value={batchSize}
                        onChange={e => setBatchSize(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm text-center"
                      />
                      <span className="text-xs text-gray-500">max 50/dzień</span>
                    </div>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                    <button
                      onClick={handleSendBatch}
                      disabled={loading}
                      className="w-full py-2.5 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {loading ? 'Wysyłanie...' : `Wyślij ${batchSize} maili teraz`}
                    </button>
                  </div>
                )}

                <button onClick={onClose} className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors border border-gray-600">
                  Zamknij
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
