'use client';

import { useState, useTransition } from 'react';
import { updateJobStatus } from '@/actions/jobs';
import type { ReviewStatus } from '@/types';

const STATUS_CONFIG: Record<ReviewStatus, { label: string; colorClass: string }> = {
  new: { label: 'Nowe', colorClass: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  saved: { label: 'Zapisane', colorClass: 'bg-green-900/60 text-green-300 border-green-700' },
  applied: { label: 'Aplikowano', colorClass: 'bg-purple-900/60 text-purple-300 border-purple-700' },
  rejected: { label: 'Odrzucone', colorClass: 'bg-gray-700/60 text-gray-400 border-gray-600' },
};

const ALL_STATUSES: ReviewStatus[] = ['new', 'saved', 'applied', 'rejected'];

interface Props {
  jobId: string;
  status: ReviewStatus;
}

export function JobStatusBadge({ jobId, status: initialStatus }: Props) {
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(newStatus: ReviewStatus) {
    setOpen(false);
    setStatus(newStatus);
    startTransition(async () => {
      await updateJobStatus(jobId, newStatus);
    });
  }

  const current = STATUS_CONFIG[status];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(prev => !prev)}
        disabled={isPending}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border cursor-pointer transition-opacity ${current.colorClass} ${isPending ? 'opacity-50' : ''}`}
      >
        {current.label}
        <span className="text-[10px] opacity-60">▼</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[130px] py-1">
          {ALL_STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => handleChange(s)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors ${s === status ? 'font-semibold' : ''} text-gray-200`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
