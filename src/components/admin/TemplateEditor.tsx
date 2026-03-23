'use client';

import { useState, useEffect } from 'react';
import type { EmailTemplate } from '@/app/api/template/route';

const VARIABLES = [
  { tag: '{{employer_name}}', desc: 'Nazwa pracodawcy' },
  { tag: '{{region_line}}', desc: 'Region (np. " in Reykjavik", puste gdy Iceland)' },
  { tag: '{{cv_line}}', desc: 'Wstawia link do CV jeśli podany' },
];

function fillPreview(subject: string, body: string, cvLink: string): { subject: string; body: string } {
  const cvLine = cvLink ? `\n\nMy CV is available here: ${cvLink}` : '';
  const replace = (s: string) =>
    s
      .replace(/\{\{employer_name\}\}/g, 'Hotel Geysir')
      .replace(/\{\{region_line\}\}/g, ' in Selfoss')
      .replace(/\{\{cv_line\}\}/g, cvLine)
      .replace(/\{\{cv_link\}\}/g, cvLink);
  return { subject: replace(subject), body: replace(body) };
}

export function TemplateEditor() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cvLink, setCvLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<Array<{ employer: string; email: string; draftId?: string; error?: string }> | null>(null);

  useEffect(() => {
    fetch('/api/template')
      .then(r => r.json())
      .then((data: { ok: boolean; template?: EmailTemplate }) => {
        if (data.ok && data.template) {
          setSubject(data.template.subject);
          setBody(data.template.body);
          setCvLink(data.template.cv_link ?? '');
          setLastSaved(data.template.updated_at);
        }
      })
      .catch(() => setError('Nie udało się załadować szablonu'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, cv_link: cvLink }),
      });
      const data = await res.json() as { ok: boolean; template?: EmailTemplate; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Błąd zapisu');
      setSaved(true);
      setLastSaved(data.template?.updated_at ?? new Date().toISOString());
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreviewDrafts() {
    setDrafting(true);
    setDraftResult(null);
    try {
      const res = await fetch('/api/outreach/preview-drafts', { method: 'POST' });
      const data = await res.json() as { ok: boolean; drafts?: typeof draftResult; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Błąd');
      setDraftResult(data.drafts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd tworzenia szkiców');
    } finally {
      setDrafting(false);
    }
  }

  function insertVariable(tag: string) {
    setBody(b => b + tag);
  }

  const prev = preview ? fillPreview(subject, body, cvLink) : null;

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-24 bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Szablon wiadomości</h3>
          {lastSaved && (
            <p className="text-xs text-gray-500 mt-0.5">
              Ostatnio zapisano: {new Date(lastSaved).toLocaleString('pl-PL')}
            </p>
          )}
        </div>
        <button
          onClick={() => setPreview(p => !p)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors"
        >
          {preview ? '✏️ Edytuj' : '👁 Podgląd'}
        </button>
      </div>

      {/* Variables reference */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center">Zmienne:</span>
        {VARIABLES.map(v => (
          <button
            key={v.tag}
            onClick={() => insertVariable(v.tag)}
            title={v.desc}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded font-mono text-blue-300 transition-colors"
          >
            {v.tag}
          </button>
        ))}
      </div>

      {preview && prev ? (
        /* Preview mode */
        <div className="space-y-3">
          <div className="p-3 bg-gray-900 rounded-lg border border-gray-600">
            <div className="text-xs text-gray-500 mb-1">Temat:</div>
            <div className="text-sm text-white font-medium">{prev.subject}</div>
          </div>
          <div className="p-3 bg-gray-900 rounded-lg border border-gray-600">
            <div className="text-xs text-gray-500 mb-2">Treść (przykład: Hotel Geysir, Selfoss):</div>
            <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
              {prev.body}
            </pre>
          </div>
        </div>
      ) : (
        /* Edit mode */
        <div className="space-y-3">
          {/* Subject */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Temat</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Seasonal Job Application – {{employer_name}}"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Treść wiadomości</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
              placeholder="Dear {{employer_name}} team, ..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Kliknij zmienną powyżej żeby wstawić ją do kursora. Plik z CV zostanie dodany przez <code className="text-blue-400">{'{{cv_line}}'}</code>.
            </p>
          </div>

          {/* CV Link */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Link do CV (domyślny)</label>
            <input
              type="url"
              value={cvLink}
              onChange={e => setCvLink(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="https://drive.google.com/..."
            />
          </div>
        </div>
      )}

      {/* Save + Preview Drafts buttons */}
      {!preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving || !subject.trim() || !body.trim()}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? 'Zapisuję...' : '💾 Zapisz szablon'}
            </button>
            <button
              onClick={handlePreviewDrafts}
              disabled={drafting || !subject.trim() || !body.trim()}
              className="px-5 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {drafting ? 'Tworzę szkice...' : '📧 Wyślij 3 szkice do Gmail'}
            </button>
            {saved && <span className="text-green-400 text-sm">✓ Zapisano</span>}
            {error && <span className="text-red-400 text-sm">{error}</span>}
          </div>

          {draftResult && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400">Szkice utworzone w Gmail — sprawdź folder Drafts:</p>
              {draftResult.map((d, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${d.error ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-green-900/20 border border-green-800 text-green-300'}`}>
                  <span>{d.error ? '✗' : '✓'}</span>
                  <span className="font-medium">{d.employer}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono">{d.email}</span>
                  {d.error && <span className="text-red-400 ml-auto">{d.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
