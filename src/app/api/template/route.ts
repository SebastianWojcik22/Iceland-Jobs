import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';

const BUCKET = 'config';
const FILE = 'email-template.json';

export interface EmailTemplate {
  subject: string;
  body: string;
  cv_link: string;
  updated_at: string;
}

export async function GET() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(FILE);
  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'Szablon nie istnieje' }, { status: 404 });
  }
  const text = await data.text();
  return NextResponse.json({ ok: true, template: JSON.parse(text) as EmailTemplate });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Partial<EmailTemplate>;
  if (!body.subject || !body.body) {
    return NextResponse.json({ ok: false, error: 'Brak tematu lub treści' }, { status: 400 });
  }

  const template: EmailTemplate = {
    subject: body.subject.trim(),
    body: body.body.trim(),
    cv_link: body.cv_link?.trim() ?? '',
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServerClient();
  const bytes = Buffer.from(JSON.stringify(template, null, 2));
  const { error } = await supabase.storage.from(BUCKET).upload(FILE, bytes, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, template });
}
