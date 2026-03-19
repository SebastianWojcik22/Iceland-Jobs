import { createClient } from '@/lib/supabase/server';
import { AdminPanel } from '@/components/admin/AdminPanel';
import type { SyncRun, ParseLog } from '@/types';

export default async function AdminPage() {
  const supabase = await createClient();

  const [syncRunsResult, parseLogsResult] = await Promise.all([
    supabase
      .from('sync_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10),
    supabase
      .from('parse_logs')
      .select('*')
      .not('error_type', 'is', null)
      .order('logged_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Panel administracyjny</h1>
        <p className="text-gray-400 text-sm mt-1">
          Synchronizacja ofert, odkrywanie pracodawców, logi błędów
        </p>
      </div>

      <AdminPanel
        syncRuns={(syncRunsResult.data as SyncRun[]) ?? []}
        parseLogs={(parseLogsResult.data as ParseLog[]) ?? []}
      />
    </div>
  );
}
