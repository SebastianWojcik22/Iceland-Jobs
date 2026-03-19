import { createClient } from '@/lib/supabase/server';
import { EmployersTable } from '@/components/employers/EmployersTable';
import type { Employer } from '@/types';

export default async function EmployersPage() {
  const supabase = await createClient();

  const { data, count } = await supabase
    .from('employers')
    .select('*', { count: 'exact' })
    .order('confidence_score', { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Lista pracodawców</h1>
        <p className="text-gray-400 text-sm mt-1">
          {count ?? 0} pracodawców w bazie — hotele, guesthousy, hostele
        </p>
      </div>

      <EmployersTable employers={(data as Employer[]) ?? []} />
    </div>
  );
}
