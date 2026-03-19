'use client';

import type { Job } from '@/types';
import { HousingBadge } from './HousingBadge';
import { PairBadge } from './PairBadge';
import { JobStatusBadge } from './JobStatusBadge';
import { Badge } from '@/components/ui/badge';

const PROVIDER_COLORS: Record<string, 'blue' | 'green' | 'yellow' | 'purple' | 'gray'> = {
  eures: 'blue',
  alfred: 'green',
  jobs_is: 'yellow',
  island: 'purple',
  storf: 'gray',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Data nieznana';
  try {
    return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function PriorityBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-green-500' : score >= 45 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{score}</span>
    </div>
  );
}

interface Props {
  job: Job;
  onOpen: (job: Job) => void;
}

export function JobCard({ job, onOpen }: Props) {
  const providerColor = PROVIDER_COLORS[job.provider] ?? 'gray';

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors cursor-pointer"
      onClick={() => onOpen(job)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-tight truncate pr-2">
            {job.title_pl || job.title}
          </h3>
          {job.title_pl && job.title_pl !== job.title && (
            <p className="text-gray-500 text-xs truncate">{job.title}</p>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {job.company && (
              <span className="text-gray-300 text-xs">{job.company}</span>
            )}
            {job.location && (
              <span className="text-gray-500 text-xs">· {job.location}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <JobStatusBadge jobId={job.id} status={job.review_status} />
          <Badge label={job.provider} color={providerColor} />
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <PriorityBar score={job.priority_score} />
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
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

      {/* Polish summary – primary; fallback to normalized_summary */}
      {(job.summary_pl || job.normalized_summary) && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">
          {job.summary_pl || job.normalized_summary}
        </p>
      )}

      {/* Language note */}
      {job.language_note && (
        <p className="text-blue-400 text-xs mb-2">🗣️ {job.language_note}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-500 text-xs">{formatDate(job.posted_at)}</span>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600"
          >
            Oferta
          </a>
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors border border-blue-600"
            >
              Aplikuj
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
