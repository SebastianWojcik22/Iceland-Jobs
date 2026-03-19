'use client';

import { useState } from 'react';
import type { Employer } from '@/types';
import { EmployerRow } from './EmployerRow';
import { OutreachQueueDialog } from './OutreachQueueDialog';

interface Props {
  employers: Employer[];
}

type CategoryFilter = string;

export function EmployersTable({ employers }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [regionFilter, setRegionFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState<'all' | 'with_email' | 'without_email'>('all');
  const [search, setSearch] = useState('');

  const categories = [...new Set(employers.map(e => e.category))].sort();
  const regions = [...new Set(employers.map(e => e.region).filter(Boolean))].sort() as string[];

  const filtered = employers.filter(e => {
    if (categoryFilter && e.category !== categoryFilter) return false;
    if (regionFilter && e.region !== regionFilter) return false;
    if (emailFilter === 'with_email' && !e.best_email) return false;
    if (emailFilter === 'without_email' && e.best_email) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.place_name.toLowerCase().includes(q) ||
        (e.region ?? '').toLowerCase().includes(q) ||
        (e.best_email ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(e => e.id)));
    }
  }

  const selectedEmployers = employers.filter(e => selected.has(e.id));
  const selectedEmails = selectedEmployers.map(e => e.best_email).filter(Boolean) as string[];
  const selectedNames = selectedEmployers.map(e => e.place_name);

  return (
    <div className="relative">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Szukaj..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Wszystkie regiony</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={emailFilter}
          onChange={e => setEmailFilter(e.target.value as typeof emailFilter)}
          className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Wszystkie</option>
          <option value="with_email">Z emailem</option>
          <option value="without_email">Bez emaila</option>
        </select>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        Wyświetlono: {filtered.length} z {employers.length} pracodawców
        {selected.size > 0 && ` · Wybrano: ${selected.size}`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700">
              <th className="px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Firma</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Kategoria</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Region</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Typ</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Maps</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pewność</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Notatki</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-gray-500">
                  Brak pracodawców · Uruchom odkrywanie w panelu Admin
                </td>
              </tr>
            ) : (
              filtered.map(employer => (
                <EmployerRow
                  key={employer.id}
                  employer={employer}
                  selected={selected.has(employer.id)}
                  onToggle={toggleOne}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Outreach bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-700 px-6 py-3 flex items-center justify-between shadow-2xl">
          <span className="text-sm text-gray-300">
            <span className="font-bold text-white">{selected.size}</span> wybranych ·{' '}
            <span className="font-bold text-blue-400">{selectedEmails.length}</span> z emailem
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors"
            >
              Odznacz
            </button>
            <button
              onClick={() => setShowDraftDialog(true)}
              disabled={selectedEmails.length === 0}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              📧 Wyślij aplikacje 1:1
            </button>
          </div>
        </div>
      )}

      {/* Outreach dialog */}
      {showDraftDialog && (
        <OutreachQueueDialog
          employerIds={[...selected]}
          employerNames={selectedNames}
          onClose={() => setShowDraftDialog(false)}
          onQueued={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
