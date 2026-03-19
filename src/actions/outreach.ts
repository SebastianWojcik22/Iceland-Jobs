'use server';

import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import type { TemplateId } from '@/lib/google/gmail-templates';

interface DraftInput {
  employerIds: string[];
  templateId: TemplateId;
  subject: string;
  body: string;
}

interface DraftResult {
  gmailDraftId: string | null;
  gmailError: string | null;
  mailto: string;
  batchId: string;
}

export async function createGmailDraft(input: DraftInput): Promise<DraftResult> {
  const supabase = await createClient();

  const { data: employers } = await supabase
    .from('employers')
    .select('best_email')
    .in('id', input.employerIds)
    .not('best_email', 'is', null);

  const emails = (employers ?? [])
    .map((e: { best_email: string | null }) => e.best_email)
    .filter((e): e is string => Boolean(e));

  const batchId = uuidv4();

  // Generate mailto fallback
  const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.body)}`;

  // Try Gmail API
  let gmailDraftId: string | null = null;
  let gmailError: string | null = null;
  try {
    const { createDraft } = await import('@/lib/google/gmail');
    gmailDraftId = await createDraft({
      bcc: emails,
      subject: input.subject,
      bodyHtml: input.body.replace(/\n/g, '<br>'),
    });
  } catch (err) {
    gmailError = err instanceof Error ? err.message : String(err);
  }

  await supabase.from('outreach_drafts').insert({
    batch_id: batchId,
    template_id: input.templateId,
    subject: input.subject,
    body_html: input.body,
    bcc_emails: emails,
    gmail_draft_id: gmailDraftId,
    mailto_fallback: mailto,
  });

  return { gmailDraftId, gmailError, mailto, batchId };
}
