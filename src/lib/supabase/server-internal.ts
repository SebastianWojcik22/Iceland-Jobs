import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client that bypasses RLS.
 * Use only in cron routes, server-side discovery, and internal jobs pipeline.
 * Never expose the service role key to the client.
 */
export async function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
