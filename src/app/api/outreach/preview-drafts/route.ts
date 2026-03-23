import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type { EmailTemplate } from '@/app/api/template/route';
import axios from 'axios';

const SUBJECT_VARIANTS = [
  null, // 0 = use template subject as-is
  'Job Enquiry – Seasonal Position at {{employer_name}}',
  'Application for Seasonal Work – {{employer_name}}',
  'Seasonal Staff Enquiry – {{employer_name}}',
];

function buildEmail(
  template: EmailTemplate,
  employerName: string,
  region: string | null,
  variant: number,
): { subject: string; bodyHtml: string } {
  const regionLine = region && region !== 'Iceland' ? ` in ${region}` : '';
  const cvLine = template.cv_link ? `\n\nMy CV is available here: ${template.cv_link}` : '';

  const replace = (s: string) =>
    s
      .replace(/\{\{employer_name\}\}/g, employerName ?? 'Hiring Manager')
      .replace(/\{\{region_line\}\}/g, regionLine)
      .replace(/\{\{cv_line\}\}/g, cvLine)
      .replace(/\{\{cv_link\}\}/g, template.cv_link ?? '');

  const subjectTemplate = variant % 4 === 0 || !SUBJECT_VARIANTS[variant % 4]
    ? template.subject
    : SUBJECT_VARIANTS[variant % 4]!;

  const bodyText = replace(template.body);
  const bodyHtml = bodyText
    .split('\n')
    .map(line => {
      const withLinks = line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
      return withLinks || '&nbsp;';
    })
    .join('<br>\n');

  return {
    subject: replace(subjectTemplate),
    bodyHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222;">${bodyHtml}</div>`,
  };
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

async function createIndividualDraft(params: {
  to: string;
  subject: string;
  bodyHtml: string;
  accessToken: string;
}): Promise<string> {
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
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    { message: { raw } },
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.id;
}

export async function POST() {
  const supabase = await createServerClient();
  const supabaseUser = await createClient();

  // Load template
  const { data: tplFile, error: tplError } = await supabase.storage.from('config').download('email-template.json');
  if (tplError || !tplFile) {
    return NextResponse.json({ ok: false, error: 'Brak szablonu — zapisz szablon najpierw.' }, { status: 400 });
  }
  const template = JSON.parse(await tplFile.text()) as EmailTemplate;

  // Fetch first 3 employers with email
  const { data: employers, error } = await supabase
    .from('employers')
    .select('id, place_name, region, best_email, confidence_score')
    .not('best_email', 'is', null)
    .order('confidence_score', { ascending: false })
    .limit(3);

  if (error || !employers || employers.length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak pracodawców z emailem w bazie.' }, { status: 400 });
  }

  // Get Gmail tokens
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Brak sesji użytkownika.' }, { status: 401 });

  const { data: settingsRow } = await supabaseUser
    .from('user_settings')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', 'gmail_tokens')
    .single();

  if (!settingsRow?.value) {
    return NextResponse.json({ ok: false, error: 'Gmail nie jest podłączony.' }, { status: 400 });
  }

  const tokens = settingsRow.value as { access_token: string; refresh_token: string; expires_at: number };

  // Refresh token if needed
  let accessToken = tokens.access_token;
  if (Date.now() >= tokens.expires_at - 60000) {
    const refreshRes = await axios.post<{ access_token: string; expires_in: number }>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    accessToken = refreshRes.data.access_token;
    await supabaseUser.from('user_settings').upsert({
      user_id: user.id,
      key: 'gmail_tokens',
      value: { ...tokens, access_token: accessToken, expires_at: Date.now() + refreshRes.data.expires_in * 1000 },
    });
  }

  // Create one draft per employer
  const results: Array<{ employer: string; email: string; draftId?: string; error?: string }> = [];

  for (let i = 0; i < employers.length; i++) {
    const emp = employers[i];
    const { subject, bodyHtml } = buildEmail(template, emp.place_name, emp.region, i);
    try {
      const draftId = await createIndividualDraft({
        to: emp.best_email as string,
        subject,
        bodyHtml,
        accessToken,
      });
      logger.info(`Preview draft created for ${emp.place_name}: ${draftId}`);
      results.push({ employer: emp.place_name, email: emp.best_email as string, draftId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Draft failed for ${emp.place_name}`, err);
      results.push({ employer: emp.place_name, email: emp.best_email as string, error: msg });
    }
  }

  return NextResponse.json({ ok: true, drafts: results });
}
