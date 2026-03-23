import axios from 'axios';
import { createServerClient } from '@/lib/supabase/server-internal';
import { logger } from '@/lib/utils/logger';

const BUCKET = 'config';
const TOKEN_FILE = 'gmail-tokens.json';

interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Load Gmail tokens from Supabase Storage.
 * Using Storage (not user_settings) so the cron job on Vercel can read them
 * without an active user session — cron requests are anonymous server calls.
 */
async function getTokens(): Promise<GmailTokens | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(TOKEN_FILE);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as GmailTokens;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: GmailTokens): Promise<void> {
  const supabase = await createServerClient();
  const bytes = Buffer.from(JSON.stringify(tokens));
  await supabase.storage.from(BUCKET).upload(TOKEN_FILE, bytes, {
    contentType: 'application/json',
    upsert: true,
  });
}

async function refreshIfNeeded(tokens: GmailTokens): Promise<GmailTokens> {
  if (Date.now() < tokens.expires_at - 60000) return tokens;

  const response = await axios.post<{ access_token: string; expires_in: number }>(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const refreshed: GmailTokens = {
    ...tokens,
    access_token: response.data.access_token,
    expires_at: Date.now() + response.data.expires_in * 1000,
  };

  await saveTokens(refreshed);
  return refreshed;
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  bodyHtml: string;
}): Promise<string> {
  const tokens = await getTokens();
  if (!tokens) throw new Error('Gmail not connected — authorize in Admin panel');

  const refreshed = await refreshIfNeeded(tokens);

  const message = [
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
    `To: ${params.to}`,
    `Subject: ${encodeSubject(params.subject)}`,
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
        Authorization: `Bearer ${refreshed.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  logger.info(`Email sent to ${params.to}: ${response.data.id}`);
  return response.data.id;
}

export async function createDraft(params: {
  bcc?: string[];
  to?: string;
  subject: string;
  bodyHtml: string;
}): Promise<string> {
  const tokens = await getTokens();
  if (!tokens) throw new Error('Gmail not connected — authorize in Admin panel');

  const refreshed = await refreshIfNeeded(tokens);

  const toLine = params.to ? `To: ${params.to}` : `Bcc: ${(params.bcc ?? []).join(', ')}`;

  const message = [
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
    toLine,
    `Subject: ${encodeSubject(params.subject)}`,
    '',
    params.bodyHtml,
  ].join('\r\n');

  const raw = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await axios.post<{ id: string }>(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    { message: { raw } },
    {
      headers: {
        Authorization: `Bearer ${refreshed.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  logger.info(`Gmail draft created: ${response.data.id}`);
  return response.data.id;
}

export { saveTokens };
