const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const OBFUSCATED_REGEX = /([a-zA-Z0-9._%+\-]+)\s*[\[\(]?\s*(?:at|AT)\s*[\]\)]?\s*([a-zA-Z0-9.\-]+)\s*[\[\(]?\s*(?:dot|DOT)\s*[\]\)]?\s*([a-zA-Z]{2,})/g;

const BLOCKED_PREFIXES = [
  'noreply', 'no-reply', 'donotreply', 'bounce',
  'mailer', 'daemon', 'postmaster', 'webmaster',
];

// Fake domains from JS/CSS artifacts
const BLOCKED_DOMAINS = [
  'sentry.io', 'example.com', 'test.com', 'wixpress.com',
  'squarespace.com', 'wordpress.com', 'w3.org', 'schema.org',
  'ion.search', 'googleapis.com', 'gstatic.com', 'cloudflare.com',
  'jsdelivr.net', 'cdnjs.com', 'unpkg.com', 'amazonaws.com',
  'plesk.com', 'guesty.com', 'dynatrace.com',
];

// Patterns in local part that indicate JS/CSS artifacts (not real emails)
const FAKE_LOCAL_PATTERNS = [
  /^\./, // starts with dot
  /href/i,
  /block-post/i,
  /colorful|firework|beautiful|vibrant/i, // Wix builder artifacts
  /__/,  // double underscore (template vars)
  /\d{5,}/, // 5+ consecutive digits
  /^[a-z]\.[a-z]+\+/, // e.g. e.href+
  /%[0-9a-f]{2}/i, // URL encoded chars like %20
  /^data[_-]/i, // data_ prefix (JS data attributes)
  /^\.ast-/i, // Astra theme CSS class artifacts
  /template/i, // template artifacts
  /gst$/i, // gstatic split (fonts.gst @ ic.com)
  /dyn$/i, // dynatrace split (js-cdn.dyn @ race.com)
];

// Valid email TLDs — must be 2-6 chars, real TLDs
const INVALID_TLDS = [
  'min', 'js', 'css', 'map', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'search', 'html', 'htm', 'post', 'some', 'txt', 'xml', 'woff', 'woff2', 'ttf',
];

function isValidEmail(email: string): boolean {
  const [local, domain] = email.split('@');
  if (!local || !domain) return false;

  // Local part: 2-64 chars
  if (local.length < 2 || local.length > 64) return false;

  // Domain: must have at least one dot, valid TLD
  const parts = domain.split('.');
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || tld.length > 6) return false;
  if (INVALID_TLDS.includes(tld.toLowerCase())) return false;

  // Check fake local patterns
  if (FAKE_LOCAL_PATTERNS.some(p => p.test(local))) return false;

  // Blocked domains
  if (BLOCKED_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`))) return false;

  // Blocked prefixes
  if (BLOCKED_PREFIXES.some(p => local.toLowerCase().startsWith(p))) return false;

  return true;
}

export function extractEmails(text: string): string[] {
  const found = new Set<string>();

  // URL-decode first (catches %20hr@ → hr@)
  const decoded = text.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Method 1: Standard email regex
  for (const m of decoded.matchAll(EMAIL_REGEX)) {
    found.add(m[0].toLowerCase().trim());
  }

  // Method 2: Obfuscated "user [at] domain [dot] tld"
  for (const m of decoded.matchAll(OBFUSCATED_REGEX)) {
    found.add(`${m[1]}@${m[2]}.${m[3]}`.toLowerCase());
  }

  return [...found].filter(isValidEmail);
}

export type EmailPriority = 1 | 2 | 3;

export function getEmailPriority(email: string): EmailPriority {
  const local = email.split('@')[0].toLowerCase();
  const p1 = ['jobs', 'careers', 'career', 'hr', 'work', 'starf', 'hiring', 'recruitment', 'apply'];
  const p2 = ['info', 'contact', 'reception', 'post', 'office', 'general', 'mail', 'hello', 'hallo'];
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
