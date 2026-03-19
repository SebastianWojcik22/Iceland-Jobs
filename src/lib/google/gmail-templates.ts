export type TemplateId = 'hotel_general' | 'hotel_with_housing' | 'hotel_with_friends';

interface Template {
  id: TemplateId;
  label: string;
  subject: string;
  body: string;
}

// Subject line variants to avoid spam filters
const SUBJECT_VARIANTS = [
  'Seasonal Job Application - {{employer_name}}',
  'Job Enquiry - Seasonal Position at {{employer_name}}',
  'Application for Seasonal Work - {{employer_name}}',
  'Seasonal Staff Enquiry - {{employer_name}}',
];

export const TEMPLATES: Record<TemplateId, Template> = {
  hotel_general: {
    id: 'hotel_general',
    label: 'Ogólna + nocleg + 2 osoby',
    subject: 'Seasonal Job Application - {{employer_name}}',
    body: `Dear {{employer_name}} team,

My name is Sebastian and I am writing to enquire about seasonal job opportunities at your property{{region_line}}.

I am available for an immediate start and happy to work in any suitable role — housekeeping, reception support, kitchen assistance, general maintenance, or whatever is most needed. I am hardworking, reliable, quick to learn, and comfortable working in a team environment.

I have one important question: do you offer staff accommodation? I am relocating from Poland specifically to work in Iceland, so having housing provided would make a real difference. Even a basic shared room would be ideal.

Additionally, I am travelling together with a close friend who is equally motivated and looking for work. If you have openings for two people at the same property, we would both be very interested. We are flexible on roles and would adapt to whatever is available.

If you are currently hiring or expecting seasonal openings soon, I would love to hear from you. I am happy to send a CV or answer any questions.

Thank you for your time.

Best regards,
Sebastian
(+48 500 270 098)`,
  },
  hotel_with_housing: {
    id: 'hotel_with_housing',
    label: 'Priorytet: zakwaterowanie',
    subject: 'Seasonal Work Enquiry with Accommodation - {{employer_name}}',
    body: `Dear {{employer_name}} team,

I am writing to enquire about seasonal job openings at your property{{region_line}} — particularly positions where staff accommodation is included.

I am relocating to Iceland from Poland and am available for an immediate start. I am flexible on role: housekeeping, kitchen support, reception, maintenance — anything where I can contribute. I am hardworking and easy to work with.

Could you let me know:
1. Are there any seasonal positions currently available or opening soon?
2. Is staff housing provided for employees?

If yes to both, I would be very happy to send my CV right away.

Thank you for considering my enquiry.

Kind regards,
Sebastian`,
  },
  hotel_with_friends: {
    id: 'hotel_with_friends',
    label: '2 osoby + nocleg',
    subject: 'Two Seasonal Workers Looking for Positions - {{employer_name}}',
    body: `Dear {{employer_name}} team,

We are two friends from Poland looking for seasonal work at your property{{region_line}}. We are both motivated, hardworking and available for an immediate start.

We are flexible on roles and happy to do whatever is needed — housekeeping, kitchen, reception support, maintenance. We work well independently and as a team.

Two questions we would appreciate you answering:
1. Do you have openings for two people (same or different roles)?
2. Is staff accommodation available for seasonal employees?

We are serious about relocating to Iceland for the season and would love to discuss further. Happy to send CVs on request.

Thank you for your time.

Best regards,
Sebastian & [Friend's Name]`,
  },
};

export function fillTemplate(
  templateId: TemplateId,
  vars: { employer_name?: string; region?: string | null; variant?: number }
): { subject: string; body: string } {
  const tpl = TEMPLATES[templateId];
  const name = vars.employer_name ?? 'Hiring Manager';
  const regionLine = vars.region && vars.region !== 'Iceland'
    ? ` in ${vars.region}`
    : '';

  // Pick subject variant for diversity (falls back to template default)
  const variantIdx = (vars.variant ?? 0) % SUBJECT_VARIANTS.length;
  const subjectTemplate = templateId === 'hotel_general'
    ? SUBJECT_VARIANTS[variantIdx]
    : tpl.subject;

  const replace = (s: string) =>
    s
      .replace(/\{\{employer_name\}\}/g, name)
      .replace(/\{\{region_line\}\}/g, regionLine);

  return {
    subject: replace(subjectTemplate),
    body: replace(tpl.body),
  };
}
