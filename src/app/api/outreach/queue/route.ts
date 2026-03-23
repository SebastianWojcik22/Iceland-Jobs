import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { fillTemplate } from '@/lib/google/gmail-templates';
import type { TemplateId } from '@/lib/google/gmail-templates';

function applyVars(template: string, vars: { employer_name: string; region: string | null }) {
  const regionLine = vars.region && vars.region !== 'Iceland' ? ` in ${vars.region}` : '';
  return template
    .replace(/\{\{employer_name\}\}/g, vars.employer_name)
    .replace(/\{\{region_line\}\}/g, regionLine);
}

// POST /api/outreach/queue – add employers to send queue
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    employerIds: string[];
    templateId: TemplateId;
    customSubject?: string;
    customBody?: string;
  };
  const supabase = await createServerClient();

  const { data: employers } = await supabase
    .from('employers')
    .select('id, place_name, region, best_email, confidence_score')
    .in('id', body.employerIds)
    .not('best_email', 'is', null);

  if (!employers || employers.length === 0) {
    return NextResponse.json({ error: 'No employers with email found' }, { status: 400 });
  }

  const rows = employers.map((e, i) => {
    let subject: string;
    let bodyText: string;

    if (body.customSubject && body.customBody) {
      // Use custom template from editor
      subject = applyVars(body.customSubject, { employer_name: e.place_name, region: e.region });
      bodyText = applyVars(body.customBody, { employer_name: e.place_name, region: e.region });
    } else {
      const filled = fillTemplate(body.templateId, {
        employer_name: e.place_name,
        region: e.region,
        variant: i,
      });
      subject = filled.subject;
      bodyText = filled.bodyHtml;
    }

    return {
      employer_id: e.id,
      email: e.best_email,
      employer_name: e.place_name,
      region: e.region,
      template_id: body.templateId,
      subject,
      body_html: bodyText.replace(/\n/g, '<br>'),
      priority: e.confidence_score ?? 50,
      status: 'pending',
    };
  });

  const { error } = await supabase
    .from('outreach_queue')
    .upsert(rows, { onConflict: 'employer_id,email', ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ queued: rows.length });
}

// GET /api/outreach/queue – fetch queue status
export async function GET() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('outreach_queue')
    .select('id, employer_name, email, region, status, subject, queued_at, sent_at, priority, error_message')
    .order('priority', { ascending: false })
    .order('queued_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = (data ?? []).reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ items: data ?? [], counts });
}
