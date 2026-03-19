'use client';

import { useState, useTransition } from 'react';
import type { Employer } from '@/types';
import { updateEmployerNotes } from '@/actions/employers';

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-green-900/60 text-green-300 border-green-700',
  2: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  3: 'bg-gray-700/60 text-gray-400 border-gray-600',
};

interface Props {
  employer: Employer;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function EmployerRow({ employer, selected, onToggle }: Props) {
  const [notes, setNotes] = useState(employer.notes ?? '');
  const [isPending, startTransition] = useTransition();

  function handleNotesBlur() {
    if (notes !== (employer.notes ?? '')) {
      startTransition(async () => {
        await updateEmployerNotes(employer.id, notes);
      });
    }
  }

  function copyEmail() {
    if (employer.best_email) {
      navigator.clipboard.writeText(employer.best_email).catch(() => {});
    }
  }

  return (
    <tr className={`border-b border-gray-700 hover:bg-gray-800/50 transition-colors ${selected ? 'bg-blue-900/20' : ''}`}>
      {/* Checkbox */}
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(employer.id)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer"
        />
      </td>

      {/* Name + website */}
      <td className="px-3 py-3 min-w-[160px]">
        <div className="font-medium text-white text-sm">{employer.place_name}</div>
        {employer.website_url && (
          <a
            href={employer.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs truncate block max-w-[180px]"
          >
            {employer.domain ?? employer.website_url}
          </a>
        )}
      </td>

      {/* Category */}
      <td className="px-3 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-blue-900/40 text-blue-300 border-blue-800">
          {employer.category}
        </span>
      </td>

      {/* Region */}
      <td className="px-3 py-3 text-sm text-gray-300">{employer.region ?? '—'}</td>

      {/* Email */}
      <td className="px-3 py-3">
        {employer.best_email ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-300 truncate max-w-[160px]">{employer.best_email}</span>
            <button
              onClick={copyEmail}
              title="Kopiuj email"
              className="p-0.5 text-gray-500 hover:text-gray-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        ) : (
          <span className="text-gray-600 text-xs">Brak</span>
        )}
      </td>

      {/* Priority badge */}
      <td className="px-3 py-3">
        {employer.email_priority ? (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[employer.email_priority] ?? PRIORITY_COLORS[3]}`}>
            P{employer.email_priority}
          </span>
        ) : (
          <span className="text-gray-600 text-xs">—</span>
        )}
      </td>

      {/* Maps */}
      <td className="px-3 py-3">
        {employer.maps_url ? (
          <a
            href={employer.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            📍 Maps
          </a>
        ) : (
          <span className="text-gray-600 text-xs">—</span>
        )}
      </td>

      {/* Confidence */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${employer.confidence_score >= 70 ? 'bg-green-500' : employer.confidence_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${employer.confidence_score}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{employer.confidence_score}</span>
        </div>
      </td>

      {/* Notes */}
      <td className="px-3 py-3 min-w-[160px]">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={1}
          placeholder="Notatka..."
          className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 transition-opacity ${isPending ? 'opacity-50' : ''}`}
        />
      </td>
    </tr>
  );
}
