/**
 * POST /api/admin/block-domain
 * Adds a domain to the blocked list (Supabase Storage: config/blocked-domains.json).
 * Also marks any pending outreach_queue entries for that domain as 'skipped'.
 *
 * Body: { domain: string }  e.g. { domain: "dynjandi.com" }
 *
 * Why Storage instead of a DB table: avoids needing a new SQL migration.
 * The blocked-domains.json file is a simple JSON array of domain strings.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';

const BUCKET = 'config';
const FILE = 'blocked-domains.json';

export async function GET() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
  if (error || !data) return NextResponse.json({ ok: true, domains: [] });
  const domains = JSON.parse(await data.text()) as string[];
  return NextResponse.json({ ok: true, domains });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { domain?: string };
  const domain = body.domain?.toLowerCase().trim().replace(/^www\./, '');
  if (!domain || !domain.includes('.')) {
    return NextResponse.json({ ok: false, error: 'Podaj domenę, np. dynjandi.com' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Load existing list
  let domains: string[] = [];
  try {
    const { data: existing } = await supabase.storage.from(BUCKET).download(FILE);
    if (existing) domains = JSON.parse(await existing.text()) as string[];
  } catch { /* first entry */ }

  if (!domains.includes(domain)) {
    domains.push(domain);
    const bytes = Buffer.from(JSON.stringify(domains, null, 2));
    await supabase.storage.from(BUCKET).upload(FILE, bytes, { contentType: 'application/json', upsert: true });
  }

  // Mark any pending/sending queue entries for this domain as skipped
  const { count } = await supabase
    .from('outreach_queue')
    .update({ status: 'skipped', error_message: `Domain blocked: ${domain}` })
    .like('email', `%@${domain}`)
    .in('status', ['pending', 'sending']);

  return NextResponse.json({ ok: true, domain, totalBlocked: domains.length, queueSkipped: count ?? 0 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { domain?: string };
  const domain = body.domain?.toLowerCase().trim().replace(/^www\./, '');
  if (!domain) return NextResponse.json({ ok: false, error: 'Brak domeny' }, { status: 400 });

  const supabase = await createServerClient();
  let domains: string[] = [];
  try {
    const { data: existing } = await supabase.storage.from(BUCKET).download(FILE);
    if (existing) domains = JSON.parse(await existing.text()) as string[];
  } catch { return NextResponse.json({ ok: true, domains: [] }); }

  domains = domains.filter(d => d !== domain);
  const bytes = Buffer.from(JSON.stringify(domains, null, 2));
  await supabase.storage.from(BUCKET).upload(FILE, bytes, { contentType: 'application/json', upsert: true });

  return NextResponse.json({ ok: true, domains });
}
