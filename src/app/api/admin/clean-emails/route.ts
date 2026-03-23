import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server-internal';
import { logger } from '@/lib/utils/logger';

const FAKE_PATTERNS = [
  /%[0-9a-f]{2}/i,                     // URL encoded chars (%20hr@ etc)
  /href/i,                              // JS artifacts
  /block-post/i,                        // WordPress artifacts
  /colorful|firework|beautiful|vibrant|dazzling/i, // Wix builder artifacts
  /^\.wp-/i,
  /^\.ast-/i,                           // Astra theme CSS artifacts
  /\.(min|js|css|map|json|svg|png|jpg|html)@/i,
  /ion\.search$/i,
  /^[a-z]\.[a-z]+\+/i,                 // e.g. e.href+
  /template/i,                          // template artifacts
  /example\.com$/i,
  /test\.(com|is)$/i,
  /localhost/i,
  /127\.0\.0/i,
  /gst@ic\./i,                          // gstatic.com split
  /dyn@race\./i,                        // dynatrace.com split
  /navig@or\./i,                        // navigator split
  /accommod@ion\./i,                    // accommodation split
  /inform@ion\./i,                      // information split
  /^data[_-]/i,                         // data_ prefix (JS data attrs)
  /plesk\.com$/i,                       // Plesk hosting panel
  /guesty\.com$/i,                      // Guesty booking software
  /^st@ic\./i,                          // static. subdomain artifacts
  /setdate$/i,                          // JS Date artifacts
  /matters\.attention$/i,               // JS attention artifacts
  /400x[0-9]+\.(jpg|png|gif|webp)$/i,   // image filename artifacts
  /[0-9]+x[0-9]+\.(jpg|png|gif|webp)$/i, // image dimension artifacts
  /-section\.\w+$/i,                    // CSS section artifacts
];

// TLDs that are never used for real emails
const INVALID_TLDS = [
  'min', 'js', 'css', 'map', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'search', 'gz', 'zip', 'html', 'htm', 'post', 'setdate', 'some', 'attention',
  'online_invalid', 'txt', 'xml', 'woff', 'woff2', 'ttf', 'eot',
];

// Domains that are clearly not real employer contact emails
const BLOCKED_DOMAINS = [
  'plesk.com', 'guesty.com', 'gstatic.com', 'dynatrace.com',
  'sentry.io', 'example.com', 'test.com', 'wixpress.com',
  'squarespace.com', 'wordpress.com', 'w3.org', 'schema.org',
  'googleapis.com', 'cloudflare.com', 'jsdelivr.net', 'cdnjs.com',
  'unpkg.com', 'amazonaws.com',
];

function isFakeEmail(email: string): boolean {
  if (!email || !email.includes('@')) return true;

  // Check original (before decoding) for URL-encoded chars
  if (/%[0-9a-f]{2}/i.test(email)) return true;

  const decoded = decodeURIComponent(email);
  const [local, domain] = decoded.split('@');
  if (!domain || !local) return true;

  // Local part too short or too long
  if (local.length < 2 || local.length > 64) return true;

  // Must not start with whitespace or dot
  if (/^[\s.]/.test(local)) return true;

  // TLD check
  const tld = domain.split('.').pop()?.toLowerCase() ?? '';
  if (INVALID_TLDS.includes(tld)) return true;
  if (tld.length < 2 || tld.length > 6) return true;

  // Blocked domains
  if (BLOCKED_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`))) return true;

  // Fake patterns (checked on decoded string)
  if (FAKE_PATTERNS.some(p => p.test(decoded))) return true;

  return false;
}

export async function POST() {
  const supabase = await createServerClient();

  const { data: employers } = await supabase
    .from('employers')
    .select('id, best_email, place_name');

  if (!employers) return NextResponse.json({ ok: true, cleaned: 0 });

  const toReset = employers.filter(e => e.best_email && isFakeEmail(e.best_email));

  logger.info(`Cleaning ${toReset.length} employers with fake emails`);

  if (toReset.length > 0) {
    const ids = toReset.map(e => e.id);
    await supabase.from('employers').update({
      best_email: null,
      confidence_score: null,
      best_contact_method: 'unknown',
    }).in('id', ids);
    await supabase.from('employer_contacts').delete().in('employer_id', ids);
  }

  return NextResponse.json({
    ok: true,
    cleaned: toReset.length,
    examples: toReset.slice(0, 20).map(e => ({ name: e.place_name, email: e.best_email })),
  });
}
