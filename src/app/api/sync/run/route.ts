import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/app/api/cron/sync-jobs/route';
import type { ProviderName } from '@/types';

const ALL_PROVIDERS: ProviderName[] = ['eures', 'alfred', 'jobs_is', 'island', 'storf'];

interface SyncRequest {
  providers?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SyncRequest;
    const requested = body.providers ?? ALL_PROVIDERS;

    // Validate provider names
    const valid = requested.filter(p =>
      (ALL_PROVIDERS as string[]).includes(p)
    );

    if (valid.length === 0) {
      return NextResponse.json({ error: 'No valid providers specified' }, { status: 400 });
    }

    return runSync('manual', valid);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
