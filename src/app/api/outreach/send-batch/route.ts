import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { sendEmail } from '@/lib/google/gmail';
import { logger } from '@/lib/utils/logger';

export const maxDuration = 300;

const DELAY_MS = 3000; // 3s between emails to avoid rate limits
const DEFAULT_BATCH = 10;
const DAILY_LIMIT = 150;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { batchSize?: number };
  const batchSize = Math.min(body.batchSize ?? DEFAULT_BATCH, DAILY_LIMIT);

  const supabase = await createServerClient();

  // Check how many sent today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: sentToday } = await supabase
    .from('outreach_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString());

  const remaining = DAILY_LIMIT - (sentToday ?? 0);
  const toSend = Math.min(batchSize, remaining);

  if (toSend <= 0) {
    return NextResponse.json({ ok: false, error: `Daily limit reached (${DAILY_LIMIT}/day)` });
  }

  // Fetch pending items ordered by priority
  const { data: items } = await supabase
    .from('outreach_queue')
    .select('id, email, employer_name, subject, body_html')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('queued_at', { ascending: true })
    .limit(toSend);

  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No pending emails in queue' });
  }

  let sent = 0;
  let failed = 0;

  for (const item of items) {
    // Mark as sending
    await supabase.from('outreach_queue').update({ status: 'sending' }).eq('id', item.id);

    try {
      const msgId = await sendEmail({
        to: item.email,
        subject: item.subject ?? `Job Application – ${item.employer_name}`,
        bodyHtml: item.body_html ?? '',
      });

      await supabase.from('outreach_queue').update({
        status: 'sent',
        gmail_message_id: msgId,
        sent_at: new Date().toISOString(),
      }).eq('id', item.id);

      sent++;
      logger.info(`Sent to ${item.employer_name} <${item.email}>`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from('outreach_queue').update({
        status: 'failed',
        error_message: msg,
      }).eq('id', item.id);
      failed++;
      logger.error(`Failed to send to ${item.email}: ${msg}`);
    }

    if (sent + failed < items.length) {
      await sleep(DELAY_MS);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    sentToday: (sentToday ?? 0) + sent,
    dailyLimit: DAILY_LIMIT,
    remainingToday: remaining - sent,
  });
}
