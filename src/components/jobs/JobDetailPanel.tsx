'use client';

import type { Job } from '@/types';
import { JobStatusBadge } from './JobStatusBadge';
import { HousingBadge } from './HousingBadge';
import { PairBadge } from './PairBadge';

interface Props {
  job: Job;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

export function JobDetailPanel({ job, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white leading-tight">{job.title_pl || job.title}</h2>
          {job.title_pl && job.title_pl !== job.title && (
            <p className="text-xs text-gray-500 mt-0.5">{job.title}</p>
          )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {job.company && <span className="text-sm text-gray-300">{job.company}</span>}
              {job.location && <span className="text-sm text-gray-500">· {job.location}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* Status + badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <JobStatusBadge jobId={job.id} status={job.review_status} />
            <HousingBadge status={job.housing_status} />
            <PairBadge status={job.pair_friendliness_status} />
            {job.english_friendly_status === 'yes' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-cyan-900/60 text-cyan-300 border-cyan-700">
                🇬🇧 English OK
              </span>
            )}
            {job.icelandic_required_status === 'yes' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-orange-900/60 text-orange-300 border-orange-700">
                🇮🇸 Islandzki wymagany
              </span>
            )}
          </div>

          {/* Language note */}
          {job.language_note && (
            <div className="mb-4 px-3 py-2 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <p className="text-blue-300 text-sm">🗣️ {job.language_note}</p>
            </div>
          )}

          {/* Polish summary */}
          {(job.summary_pl || job.normalized_summary) && (
            <Section title="Podsumowanie (PL)">
              <p className="text-gray-300 text-sm leading-relaxed">
                {job.summary_pl || job.normalized_summary}
              </p>
            </Section>
          )}

          {/* Polish requirements */}
          {(job.requirements_pl || job.requirement_summary) && (
            <Section title="Wymagania (PL)">
              <p className="text-gray-300 text-sm leading-relaxed">
                {job.requirements_pl || job.requirement_summary}
              </p>
            </Section>
          )}

          {/* Housing evidence */}
          {job.housing_evidence && (
            <Section title="📍 Dowód zakwaterowania">
              <p className="text-gray-400 text-xs bg-gray-800 rounded-lg px-3 py-2 italic leading-relaxed">
                {job.housing_evidence}
              </p>
            </Section>
          )}

          {/* Pair evidence */}
          {job.pair_friendliness_evidence && (
            <Section title="👥 Dowód przyjazności dla par">
              <p className="text-gray-400 text-xs bg-gray-800 rounded-lg px-3 py-2 italic leading-relaxed">
                {job.pair_friendliness_evidence}
              </p>
            </Section>
          )}

          {/* Experience signals */}
          {job.experience_signals_json && Object.keys(job.experience_signals_json).length > 0 && (
            <Section title="Sygnały doświadczenia">
              <div className="space-y-1">
                {Object.entries(job.experience_signals_json).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-gray-400">{key}</span>
                    <span className="text-gray-300">{String(val)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Meta */}
          <Section title="Informacje">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Źródło</span>
                <span className="text-gray-300">{job.provider}</span>
              </div>
              {job.salary_text && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Wynagrodzenie</span>
                  <span className="text-gray-300">{job.salary_text}</span>
                </div>
              )}
              {job.employment_type && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Typ zatrudnienia</span>
                  <span className="text-gray-300">{job.employment_type}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Wynik priorytetu</span>
                <span className="text-gray-300">{job.priority_score}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Wynik junior</span>
                <span className="text-gray-300">{job.junior_fit_score}/100</span>
              </div>
            </div>
          </Section>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors border border-gray-600"
            >
              Otwórz ofertę
            </a>
            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Aplikuj teraz
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
