'use client';

import type { SyncRun } from '@/types';
import { Badge } from '@/components/ui/badge';

interface Props {
  runs: SyncRun[];
}

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function duration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function SyncLogsTable({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Brak historii synchronizacji
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Trigger</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Źródła</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Nowe</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Łącznie</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Czas</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Błędy</th>
          </tr>
        </thead>
        <tbody>
          {runs.map(run => (
            <tr key={run.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{formatDate(run.started_at)}</td>
              <td className="px-4 py-3">
                <Badge label={run.trigger} color={run.trigger === 'cron' ? 'blue' : 'purple'} />
              </td>
              <td className="px-4 py-3">
                <Badge
                  label={run.status}
                  color={run.status === 'completed' ? 'green' : run.status === 'failed' ? 'red' : 'yellow'}
                />
              </td>
              <td className="px-4 py-3 text-gray-300 text-xs">{run.providers_run.join(', ')}</td>
              <td className="px-4 py-3 text-right text-green-400 font-semibold">{run.new_jobs}</td>
              <td className="px-4 py-3 text-right text-gray-300">{run.total_fetched}</td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                {duration(run.started_at, run.completed_at)}
              </td>
              <td className="px-4 py-3">
                {run.errors_json.length > 0 ? (
                  <span className="text-red-400 text-xs">{run.errors_json.length} błąd(ów)</span>
                ) : (
                  <span className="text-gray-600 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
