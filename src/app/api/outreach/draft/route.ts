import { NextRequest, NextResponse } from 'next/server';
import { createGmailDraft } from '@/actions/outreach';
import type { TemplateId } from '@/lib/google/gmail-templates';

interface DraftRequestBody {
  employerIds: string[];
  templateId: TemplateId;
  subject: string;
  body: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DraftRequestBody;

    if (!body.employerIds || !Array.isArray(body.employerIds) || body.employerIds.length === 0) {
      return NextResponse.json({ error: 'employerIds required' }, { status: 400 });
    }

    const result = await createGmailDraft({
      employerIds: body.employerIds,
      templateId: body.templateId,
      subject: body.subject,
      body: body.body,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
