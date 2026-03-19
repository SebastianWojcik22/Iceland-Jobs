import axios from 'axios';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

async function getTokens(): Promise<GmailTokens | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_settings')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', 'gmail_tokens')
    .single();

  return (data?.value as GmailTokens) ?? null;
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

  // Persist updated tokens
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      key: 'gmail_tokens',
      value: refreshed,
    });
  }

  return refreshed;
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

function makeRaw(params: { bcc: string[]; subject: string; bodyHtml: string }): string {
  const message = [
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Bcc: ${params.bcc.join(', ')}`,
    `Subject: ${encodeSubject(params.subject)}`,
    '',
    params.bodyHtml,
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  bodyHtml: string;
}): Promise<string> {
  const tokens = await getTokens();
  if (!tokens) throw new Error('Gmail not connected');

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
  bcc: string[];
  subject: string;
  bodyHtml: string;
}): Promise<string> {
  const tokens = await getTokens();
  if (!tokens) throw new Error('Gmail not connected');

  const refreshed = await refreshIfNeeded(tokens);
  const raw = makeRaw(params);

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
