import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { logger } from '@/lib/utils/logger';
import type { EmailTemplate } from '@/app/api/template/route';

// Neutral subject lines — avoid spam keywords like "job", "seasonal", "work", "hiring"
// Gmail filters aggressively on these in cold outreach. Tested: neutral subjects deliver,
// job-related subjects get silently dropped.
const SUBJECT_VARIANTS = [
  'Hej {{employer_name}}',
  'Hi {{employer_name}}',
  'Quick question – {{employer_name}}',
  'Hi there – {{employer_name}}',
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

  // Rotate subject for variety (anti-spam)
  const subjectTemplate = variant % 4 === 0
    ? template.subject
    : SUBJECT_VARIANTS[variant % 4].replace('{{subject}}', template.subject);

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    resetExisting?: boolean;
  };

  const supabase = await createServerClient();

  // Load template from storage
  const { data: tplFile, error: tplError } = await supabase.storage.from('config').download('email-template.json');
  if (tplError || !tplFile) {
    return NextResponse.json({ ok: false, error: 'Brak szablonu — zapisz szablon najpierw.' }, { status: 400 });
  }
  const template = JSON.parse(await tplFile.text()) as EmailTemplate;

  if (!template.subject || !template.body) {
    return NextResponse.json({ ok: false, error: 'Szablon jest pusty — uzupełnij temat i treść.' }, { status: 400 });
  }

  // Load blocked domains from Storage (add via /api/admin/block-domain)
  let blockedDomains: string[] = [];
  try {
    const { data: bdFile } = await supabase.storage.from('config').download('blocked-domains.json');
    if (bdFile) blockedDomains = JSON.parse(await bdFile.text()) as string[];
  } catch { /* no file yet = none blocked */ }

  // Fetch all employers with a known email.
  // Employers with careers_page_url are excluded from the mailing campaign
  // (they have their own application process) but remain in the DB with the
  // careers_page_url field visible as a note.
  const { data: employers, error } = await supabase
    .from('employers')
    .select('id, place_name, region, best_email, confidence_score, website_url')
    .not('best_email', 'is', null)
    .is('careers_page_url', null)
    .order('confidence_score', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!employers || employers.length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak pracodawców z emailem w bazie.' }, { status: 400 });
  }

  // If resetExisting, mark failed/skipped back to pending
  if (body.resetExisting) {
    await supabase
      .from('outreach_queue')
      .update({ status: 'pending', error_message: null })
      .in('status', ['failed', 'skipped']);
  }

  // Filter out blocked domains (opt-outs / negative replies)
  function isBlocked(email: string) {
    const domain = email.split('@')[1]?.toLowerCase() ?? '';
    return blockedDomains.some(d => domain === d || domain.endsWith('.' + d));
  }
  const filtered = employers.filter(emp => !isBlocked(emp.best_email as string));
  const blockedCount = employers.length - filtered.length;
  if (blockedCount > 0) logger.info(`Skipped ${blockedCount} employers from blocked domains`);

  // Build queue rows using DB template
  const rows = filtered.map((emp, i) => {
    const { subject, bodyHtml } = buildEmail(template, emp.place_name, emp.region, i);
    return {
      employer_id: emp.id,
      email: emp.best_email as string,
      employer_name: emp.place_name,
      region: emp.region,
      template_id: 'custom',
      subject,
      body_html: bodyHtml,
      status: 'pending',
      priority: emp.confidence_score ?? 50,
    };
  });

  const { error: insertError, count } = await supabase
    .from('outreach_queue')
    .upsert(rows, { onConflict: 'employer_id,email', ignoreDuplicates: true });

  if (insertError) {
    logger.error('Campaign create error', insertError);
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  const { count: totalPending } = await supabase
    .from('outreach_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  logger.info(`Campaign created: ${count ?? rows.length} queued, ${totalPending} total pending`);

  return NextResponse.json({ ok: true, queued: rows.length, totalPending: totalPending ?? 0 });
}
