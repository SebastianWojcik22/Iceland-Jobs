'use client';

import type { ParseLog } from '@/types';

interface Props {
  logs: ParseLog[];
}

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function ParseFailuresTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        Brak błędów parsowania
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Źródło</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Typ błędu</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Wiadomość</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">URL</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.logged_at)}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-orange-900/40 text-orange-300 border-orange-800">
                  {log.provider}
                </span>
              </td>
              <td className="px-4 py-3 text-red-400 text-xs">{log.error_type ?? '—'}</td>
              <td className="px-4 py-3 text-gray-300 text-xs max-w-xs">
                <span className="line-clamp-2">{log.message ?? '—'}</span>
              </td>
              <td className="px-4 py-3">
                {log.job_url ? (
                  <a
                    href={log.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs truncate block max-w-[200px]"
                  >
                    {log.job_url}
                  </a>
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
