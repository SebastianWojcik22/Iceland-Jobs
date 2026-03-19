const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const BLOCKED_PREFIXES = [
  'noreply',
  'no-reply',
  'donotreply',
  'bounce',
  'mailer',
  'daemon',
  'postmaster',
];

export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return [
    ...new Set(
      matches
        .map(e => e.toLowerCase())
        .filter(e => !BLOCKED_PREFIXES.some(p => e.startsWith(p)))
    ),
  ];
}

export type EmailPriority = 1 | 2 | 3;

export function getEmailPriority(email: string): EmailPriority {
  const local = email.split('@')[0].toLowerCase();
  const p1 = [
    'jobs',
    'careers',
    'career',
    'hr',
    'work',
    'starf',
    'hiring',
    'recruitment',
    'apply',
  ];
  const p2 = ['info', 'contact', 'reception', 'post', 'office', 'general', 'mail'];
  if (p1.some(k => local.includes(k))) return 1;
  if (p2.some(k => local.includes(k))) return 2;
  return 3;
}

export function getEvidence(text: string, email: string, contextLen = 80): string {
  const idx = text.indexOf(email);
  if (idx === -1) return '';
  const start = Math.max(0, idx - contextLen);
  const end = Math.min(text.length, idx + email.length + contextLen);
  return `...${text.slice(start, end)}...`;
}
