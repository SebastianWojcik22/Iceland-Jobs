'use client';

import { useState } from 'react';
import type { TemplateId } from '@/lib/google/gmail-templates';
import { TEMPLATES, fillTemplate } from '@/lib/google/gmail-templates';

interface Props {
  employerIds: string[];
  employerEmails: string[];
  onClose: () => void;
}

export function GmailDraftDialog({ employerIds, employerEmails, onClose }: Props) {
  const [templateId, setTemplateId] = useState<TemplateId>('hotel_general');
  const [subject, setSubject] = useState(TEMPLATES.hotel_general.subject);
  const [body, setBody] = useState(TEMPLATES.hotel_general.body);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ gmailDraftId: string | null; gmailError: string | null; mailto: string; batchId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(id: TemplateId) {
    setTemplateId(id);
    const filled = fillTemplate(id, {});
    setSubject(filled.subject);
    setBody(filled.bodyHtml);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/outreach/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerIds, templateId, subject, body }),
      });
      if (!res.ok) throw new Error('Błąd serwera');
      const data = await res.json() as { gmailDraftId: string | null; gmailError: string | null; mailto: string; batchId: string };
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
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
            <h2 className="text-base font-bold text-white">Utwórz szkic Gmail</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {result ? (
              <div className="space-y-4">
                {result.gmailDraftId ? (
                  <>
                    <div className="flex items-center gap-2 text-green-400">
                      <span className="text-xl">✅</span>
                      <span className="font-medium">Szkic Gmail utworzony pomyślnie</span>
                    </div>
                    <a
                      href={`https://mail.google.com/mail/#drafts/${result.gmailDraftId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Otwórz szkic w Gmail
                    </a>
                  </>
                ) : (
                  <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm space-y-1">
                    <p className="font-medium">Nie udało się utworzyć szkicu Gmail</p>
                    {result.gmailError && <p className="text-xs opacity-80">{result.gmailError}</p>}
                    <p className="text-xs opacity-60 mt-1">Użyj fallback mailto poniżej lub włącz Gmail API w Google Cloud Console.</p>
                  </div>
                )}
                <a
                  href={result.mailto}
                  className="block w-full text-center py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Otwórz przez mailto (fallback)
                </a>
                <p className="text-xs text-gray-500">Batch ID: {result.batchId}</p>
              </div>
            ) : (
              <>
                {/* Template selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Szablon</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.values(TEMPLATES)).map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl.id)}
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

                {/* Subject */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Temat</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Treść</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y font-mono"
                  />
                </div>

                {/* BCC preview */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    BCC ({employerEmails.length} adresów)
                  </label>
                  <div className="bg-gray-700 rounded-lg px-3 py-2 max-h-24 overflow-y-auto">
                    {employerEmails.length === 0 ? (
                      <span className="text-gray-500 text-xs">Brak adresów email w wybranych pracodawcach</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(employerEmails)].map((email, i) => (
                          <span key={`${email}-${i}`} className="text-xs bg-gray-600 text-gray-200 px-1.5 py-0.5 rounded">
                            {email}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors border border-gray-600"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || employerEmails.length === 0}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {loading ? 'Tworzenie...' : 'Utwórz szkic'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
