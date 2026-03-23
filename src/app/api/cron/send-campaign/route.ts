import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { logger } from '@/lib/utils/logger';
import axios from 'axios';

export const maxDuration = 300;

// ─── Limits & timing ──────────────────────────────────────────────────────────

/**
 * Warm-up schedule based on total emails sent from this account.
 * Starts small so Gmail doesn't flag the account as a new spammer.
 * Each stage allows more sends per day.
 */
const WARMUP_STAGES = [
  { sentSoFar: 0,   dailyMax: 10  },  // Stage 1: brand new account
  { sentSoFar: 50,  dailyMax: 25  },  // Stage 2: some history
  { sentSoFar: 150, dailyMax: 50  },  // Stage 3: established
  { sentSoFar: 300, dailyMax: 80  },  // Stage 4: trusted
  { sentSoFar: 500, dailyMax: 100 },  // Stage 5: full speed
] as const;

/** Domain cooldown: skip if we already emailed same domain within N days */
const DOMAIN_COOLDOWN_DAYS = 7;

/** Random delay between emails (ms). Avoids machine-gun pattern. */
const DELAY_MIN_MS = 4000;
const DELAY_MAX_MS = 12000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay() {
  return sleep(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));
}

function getDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

function getDailyMax(totalEverSent: number): number {
  const stage = [...WARMUP_STAGES].reverse().find(s => totalEverSent >= s.sentSoFar);
  return stage?.dailyMax ?? WARMUP_STAGES[0].dailyMax;
}

interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

async function getValidAccessToken(supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<string | null> {
  // In a single-user app, grab the first gmail_tokens row (no session in cron context)
  const { data } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'gmail_tokens')
    .limit(1)
    .single();

  if (!data?.value) return null;
  let tokens = data.value as GmailTokens;

  // Refresh if expired
  if (Date.now() >= tokens.expires_at - 60_000) {
    try {
      const res = await axios.post<{ access_token: string; expires_in: number }>(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      tokens = {
        ...tokens,
        access_token: res.data.access_token,
        expires_at: Date.now() + res.data.expires_in * 1000,
      };
      // Persist refreshed token
      await supabase
        .from('user_settings')
        .update({ value: tokens })
        .eq('key', 'gmail_tokens');
    } catch (err) {
      logger.error('Gmail token refresh failed in cron', err);
      return null;
    }
  }

  return tokens.access_token;
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  bodyHtml: string;
  accessToken: string;
}): Promise<string> {
  // Add proper headers to improve deliverability:
  // - Message-ID: unique per message, prevents duplicate detection
  // - Date: explicit timestamp
  // - List-Unsubscribe: good practice, reduces spam score
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@campaign>`;
  const dateHeader = new Date().toUTCString();

  const message = [
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
    `Message-ID: ${messageId}`,
    `Date: ${dateHeader}`,
    'X-Mailer: WorkAbroad-Campaign/1.0',
    '',
    params.bodyHtml,
  ].join('\r\n');

  const raw = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await axios.post<{ id: string }>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    { raw },
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.id;
}

// ─── Shared run logic ─────────────────────────────────────────────────────────

async function runCampaignBatch() {

  const supabase = await createServerClient();

  // 1. Validate Gmail tokens
  const accessToken = await getValidAccessToken(supabase);
  if (!accessToken) {
    logger.error('Campaign cron: Gmail tokens missing or refresh failed — skipping run');
    return NextResponse.json({ ok: false, error: 'Gmail not connected or token refresh failed' });
  }

  // 2. Warm-up: determine today's limit based on total ever sent
  const { count: totalEverSent } = await supabase
    .from('outreach_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent');

  const dailyMax = getDailyMax(totalEverSent ?? 0);

  // 3. How many sent today already?
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: sentToday } = await supabase
    .from('outreach_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString());

  const toSendCount = dailyMax - (sentToday ?? 0);

  if (toSendCount <= 0) {
    logger.info(`Campaign cron: daily limit reached (${sentToday}/${dailyMax}), skipping`);
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'daily_limit_reached', dailyMax });
  }

  // 4. Domain cooldown — get domains emailed in last N days
  const cooldownStart = new Date(Date.now() - DOMAIN_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const { data: recentSent } = await supabase
    .from('outreach_queue')
    .select('email')
    .eq('status', 'sent')
    .gte('sent_at', cooldownStart.toISOString());

  const cooldownDomains = new Set((recentSent ?? []).map(r => getDomain(r.email)));
  logger.info(`Campaign cron: ${cooldownDomains.size} domains on cooldown (last ${DOMAIN_COOLDOWN_DAYS}d)`);

  // 5. Fetch pending items — take extra to account for cooldown skips
  const fetchLimit = Math.min(toSendCount * 3, 100);
  const { data: candidates } = await supabase
    .from('outreach_queue')
    .select('id, email, employer_name, subject, body_html')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('queued_at', { ascending: true })
    .limit(fetchLimit);

  if (!candidates || candidates.length === 0) {
    logger.info('Campaign cron: no pending emails in queue');
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'queue_empty' });
  }

  // 6. Filter out cooldown domains
  const toSend = candidates
    .filter(item => !cooldownDomains.has(getDomain(item.email)))
    .slice(0, toSendCount);

  const skipped = candidates.length - toSend.length;
  logger.info(`Campaign cron: ${toSend.length} to send, ${skipped} skipped (cooldown), limit ${dailyMax}/day, stage total=${totalEverSent}`);

  // 7. Send with random delay between each
  let sent = 0;
  let failed = 0;

  for (const item of toSend) {
    await supabase.from('outreach_queue').update({ status: 'sending' }).eq('id', item.id);

    try {
      const gmailId = await sendEmail({
        to: item.email,
        subject: item.subject ?? `Job Application – ${item.employer_name}`,
        bodyHtml: item.body_html ?? '',
        accessToken,
      });

      await supabase.from('outreach_queue').update({
        status: 'sent',
        gmail_message_id: gmailId,
        sent_at: new Date().toISOString(),
        error_message: null,
      }).eq('id', item.id);

      sent++;
      logger.info(`Sent → ${item.employer_name} <${item.email}>`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from('outreach_queue').update({
        status: 'failed',
        error_message: msg,
      }).eq('id', item.id);
      failed++;
      logger.error(`Failed → ${item.email}: ${msg}`);

      // Stop immediately on auth error — token likely revoked
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid_grant')) {
        logger.error('Campaign cron: Gmail auth error — stopping batch');
        break;
      }
    }

    // Random delay before next email — avoids machine-gun send pattern
    if (sent + failed < toSend.length) {
      await randomDelay();
    }
  }

  logger.info(`Campaign cron complete: sent=${sent}, failed=${failed}, skipped=${skipped}`);

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skipped,
    sentToday: (sentToday ?? 0) + sent,
    dailyMax,
    warmupStage: getDailyMax(totalEverSent ?? 0),
    remainingToday: toSendCount - sent,
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** Called by Vercel Cron (GET + Authorization: Bearer CRON_SECRET) */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runCampaignBatch();
}

/** Called manually from AdminPanel (POST + same secret) */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runCampaignBatch();
}
