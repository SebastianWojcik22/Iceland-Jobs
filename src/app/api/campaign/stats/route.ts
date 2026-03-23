import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';

const WARMUP_STAGES = [
  { sentSoFar: 0,   dailyMax: 10  },
  { sentSoFar: 50,  dailyMax: 25  },
  { sentSoFar: 150, dailyMax: 50  },
  { sentSoFar: 300, dailyMax: 80  },
  { sentSoFar: 500, dailyMax: 100 },
] as const;

function getDailyMax(totalEverSent: number): number {
  const stage = [...WARMUP_STAGES].reverse().find(s => totalEverSent >= s.sentSoFar);
  return stage?.dailyMax ?? WARMUP_STAGES[0].dailyMax;
}

export async function GET() {
  const supabase = await createServerClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pending, sent, failed, sentToday] = await Promise.all([
    supabase.from('outreach_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('outreach_queue').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('outreach_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('outreach_queue').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', todayStart.toISOString()),
  ]);

  const totalSent = sent.count ?? 0;
  const dailyMax = getDailyMax(totalSent);

  return NextResponse.json({
    ok: true,
    stats: {
      pending: pending.count ?? 0,
      sent: totalSent,
      failed: failed.count ?? 0,
      sentToday: sentToday.count ?? 0,
      dailyMax,
      warmupStage: dailyMax,
    },
  });
}
