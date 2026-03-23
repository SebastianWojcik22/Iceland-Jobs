export type TemplateId = 'hotel_general' | 'hotel_with_housing' | 'hotel_with_friends';

interface Template {
  id: TemplateId;
  label: string;
  subject: string;
  body: string;
}

const SUBJECT_VARIANTS = [
  'Seasonal Job Application – {{employer_name}}',
  'Job Enquiry – Seasonal Position at {{employer_name}}',
  'Application for Seasonal Work – {{employer_name}}',
  'Seasonal Staff Enquiry – {{employer_name}}',
];

const CV_LINE = `\n\nMy CV is available here: {{cv_link}}`;

export const TEMPLATES: Record<TemplateId, Template> = {
  hotel_general: {
    id: 'hotel_general',
    label: 'Ogólna + nocleg + 2 osoby',
    subject: 'Seasonal Job Application – {{employer_name}}',
    body: `Dear {{employer_name}} team,

My name is Sebastian and I am writing to enquire about seasonal job opportunities at your property{{region_line}}.

I am available for an immediate start and happy to work in any suitable role — housekeeping, reception support, kitchen assistance, general maintenance, or whatever is most needed. I am hardworking, reliable, quick to learn, and comfortable working in a team environment.

I have one important question: do you offer staff accommodation? I am relocating from Poland specifically to work in Iceland, so having housing provided would make a real difference. Even a basic shared room would be ideal.

Additionally, I am travelling together with a close friend who is equally motivated and looking for work. If you have openings for two people at the same property, we would both be very interested. We are flexible on roles and would adapt to whatever is available.{{cv_line}}

If you are currently hiring or expecting seasonal openings soon, I would love to hear from you. I am happy to answer any questions.

Thank you for your time.

Best regards,
Sebastian Wojcik
+48 500 270 098`,
  },

  hotel_with_housing: {
    id: 'hotel_with_housing',
    label: 'Priorytet: zakwaterowanie',
    subject: 'Seasonal Work Enquiry with Accommodation – {{employer_name}}',
    body: `Dear {{employer_name}} team,

I am writing to enquire about seasonal job openings at your property{{region_line}} — particularly positions where staff accommodation is included.

I am relocating to Iceland from Poland and am available for an immediate start. I am flexible on role: housekeeping, kitchen support, reception, maintenance — anything where I can contribute. I am hardworking and easy to work with.

Could you let me know:
1. Are there any seasonal positions currently available or opening soon?
2. Is staff housing provided for employees?{{cv_line}}

If yes to both, I would be very happy to discuss further.

Thank you for considering my enquiry.

Kind regards,
Sebastian Wojcik
+48 500 270 098`,
  },

  hotel_with_friends: {
    id: 'hotel_with_friends',
    label: '2 osoby + nocleg',
    subject: 'Two Seasonal Workers – {{employer_name}}',
    body: `Dear {{employer_name}} team,

We are two friends from Poland looking for seasonal work at your property{{region_line}}. We are both motivated, hardworking and available for an immediate start.

We are flexible on roles and happy to do whatever is needed — housekeeping, kitchen, reception support, maintenance. We work well independently and as a team.

Two questions:
1. Do you have openings for two people (same or different roles)?
2. Is staff accommodation available for seasonal employees?{{cv_line}}

We are serious about relocating to Iceland for the season and would love to discuss further.

Thank you for your time.

Best regards,
Sebastian & Bartosz
+48 500 270 098`,
  },
};

export function fillTemplate(
  templateId: TemplateId,
  vars: { employer_name?: string; region?: string | null; variant?: number; cv_link?: string }
): { subject: string; bodyHtml: string } {
  const tpl = TEMPLATES[templateId];
  const name = vars.employer_name ?? 'Hiring Manager';
  const regionLine = vars.region && vars.region !== 'Iceland' ? ` in ${vars.region}` : '';
  const cvLine = vars.cv_link ? CV_LINE : '';

  const variantIdx = (vars.variant ?? 0) % SUBJECT_VARIANTS.length;
  const subjectTemplate = templateId === 'hotel_general'
    ? SUBJECT_VARIANTS[variantIdx]
    : tpl.subject;

  const replace = (s: string) =>
    s
      .replace(/\{\{employer_name\}\}/g, name)
      .replace(/\{\{region_line\}\}/g, regionLine)
      .replace(/\{\{cv_line\}\}/g, cvLine)
      .replace(/\{\{cv_link\}\}/g, vars.cv_link ?? '');

  const body = replace(tpl.body);

  // Convert plain text to simple HTML (preserves line breaks, makes CV link clickable)
  const bodyHtml = body
    .split('\n')
    .map(line => {
      // Make URLs clickable
      const withLinks = line.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1">$1</a>'
      );
      return withLinks || '&nbsp;';
    })
    .join('<br>\n');

  return {
    subject: replace(subjectTemplate),
    bodyHtml: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222;">${bodyHtml}</div>`,
  };
}
