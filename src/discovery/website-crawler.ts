import { withPage, safeNavigate } from '@/lib/scraping/playwright-helpers';
import { extractEmails, getEmailPriority, getEvidence } from '@/lib/utils/email-extractor';
import { RateLimiter } from '@/lib/scraping/rate-limiter';
import { logger } from '@/lib/utils/logger';

export interface CrawlResult {
  emails: Array<{ email: string; priority: number; sourceUrl: string; evidence: string }>;
  applicationFormUrl: string | null;
  careersPageUrl: string | null;
}

// Icelandic diacritics → ASCII mapping for name matching
const ICEL_MAP: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ý: 'y',
  ö: 'o', ä: 'a', ü: 'u', æ: 'ae', ð: 'd', þ: 'th',
};

/** Normalize an employer name into searchable keywords for email matching */
function nameKeywords(name: string): string[] {
  // Remove diacritics
  let n = name.toLowerCase();
  for (const [ic, asc] of Object.entries(ICEL_MAP)) n = n.replaceAll(ic, asc);
  // Remove common stop-words (chain names, type words)
  n = n.replace(/\b(hotel|hostel|guesthouse|guest house|fosshótel|fosshotel|icehotels|keahotels|kea|foss|hótel|restaurant|cafe|cafė|inn|lodge|resort|farm|b&b|bed and breakfast)\b/gi, ' ');
  // Extract words with 3+ chars
  return n.match(/[a-z]{3,}/g) ?? [];
}

/** Boost priority to 0 if the email's local part matches the employer's name */
function applyNameBoost(
  emails: Array<{ email: string; priority: number; sourceUrl: string; evidence: string }>,
  employerName: string,
): Array<{ email: string; priority: number; sourceUrl: string; evidence: string }> {
  const keywords = nameKeywords(employerName);
  if (keywords.length === 0) return emails;

  return emails.map(e => {
    const local = e.email.split('@')[0].toLowerCase();
    const matched = keywords.some(kw => local.includes(kw) || kw.includes(local));
    return matched ? { ...e, priority: 0 } : e;
  });
}

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/about', '/about-us',
  '/jobs', '/careers', '/work-with-us', '/join-our-team',
  '/join-us', '/employment', '/vacancies', '/hiring', '/work-here',
  '/opportunities', '/team',
  '/hafa-samband', '/um-okkur', '/starfsfolk', '/starf', '/leidbeining',
];

const limiter = new RateLimiter(3000);

/**
 * Extract emails from a page using trusted sources only — NO raw JS/CSS.
 * Order of trust:
 *   1. mailto: href links (most reliable — explicitly set by site owner)
 *   2. <address> tags and contact/footer semantic elements
 *   3. Visible body text (innerText — no scripts)
 */
function extractEmailsFromPage(): { emails: string[]; text: string } {
  // Source 1: mailto: links — always intentional, highest trust
  const mailtoEmails: string[] = Array.from(
    document.querySelectorAll('a[href^="mailto:"]')
  ).map(a => {
    const href = (a as HTMLAnchorElement).href;
    return href.replace(/^mailto:/i, '').split('?')[0].trim();
  }).filter(e => e.includes('@'));

  // Source 2: semantic contact areas — footer, address, contact sections
  const contactSelectors = [
    'footer', 'address',
    '[class*="contact"]', '[id*="contact"]',
    '[class*="footer"]', '[id*="footer"]',
    '[class*="info"]', '[class*="reach"]',
  ];
  const semanticText = contactSelectors
    .map(sel => document.querySelector(sel)?.textContent ?? '')
    .join(' ');

  // Source 3: visible body text (innerText skips hidden elements and scripts)
  const bodyText = document.body.innerText ?? '';

  // Combine in order: mailto first, then semantic areas, then full body
  const combined = mailtoEmails.join(' ') + ' ' + semanticText + ' ' + bodyText;

  return { emails: mailtoEmails, text: combined };
}

/** Block SSRF: reject non-http(s) URLs and private/localhost IP ranges */
function isSafeUrl(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  // Block localhost, loopback, and private RFC1918 ranges
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host === '169.254.169.254') return false; // AWS/GCP metadata endpoint
  return true;
}

export async function crawlEmployerWebsite(websiteUrl: string, employerName?: string): Promise<CrawlResult> {
  if (!isSafeUrl(websiteUrl)) {
    logger.warn(`Skipping unsafe URL: ${websiteUrl}`);
    return { emails: [], applicationFormUrl: null, careersPageUrl: null };
  }

  await limiter.throttle();

  const result: CrawlResult = {
    emails: [],
    applicationFormUrl: null,
    careersPageUrl: null,
  };

  // Priority map: email → { priority, sourceUrl, evidence }
  // Lower number = higher trust (1 = mailto link, 2 = contact area, 3 = body text)
  const allEmails = new Map<string, { priority: number; sourceUrl: string; evidence: string }>();

  function addEmails(
    found: string[],
    text: string,
    sourceUrl: string,
    sourcePriority: 'mailto' | 'page'
  ) {
    for (const email of found) {
      if (allEmails.has(email)) continue; // first source wins
      const emailPriority = sourcePriority === 'mailto'
        ? 1  // mailto links are always priority 1 regardless of address
        : getEmailPriority(email);
      allEmails.set(email, {
        priority: emailPriority,
        sourceUrl,
        evidence: getEvidence(text, email),
      });
    }
  }

  try {
    await withPage(async page => {
      // --- Homepage ---
      const ok = await safeNavigate(page, websiteUrl);
      if (!ok) return;

      const homeResult = await page.evaluate(extractEmailsFromPage);

      // Add mailto: links with top priority
      addEmails(homeResult.emails, homeResult.text, websiteUrl, 'mailto');

      // Extract from combined trusted text
      const fromText = extractEmails(homeResult.text);
      addEmails(fromText, homeResult.text, websiteUrl, 'page');

      // Find contact/careers sub-pages
      const subLinks = await page.evaluate((paths: string[]) => {
        const base = window.location.origin;
        const links: string[] = [];
        document.querySelectorAll('a[href]').forEach(a => {
          const href = (a as HTMLAnchorElement).href;
          const text = a.textContent?.toLowerCase() ?? '';
          const isContactPage = paths.some(
            p => href.toLowerCase().includes(p) || text.includes(p.slice(1))
          );
          if (isContactPage && href.startsWith(base)) links.push(href);
        });
        return [...new Set(links)].slice(0, 4);
      }, CONTACT_PATHS);

      // Detect form/careers links
      const formUrl = await page.evaluate((): string | null => {
        const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        return links.find(a => /typeform|jotform|google\.com\/forms|application|apply/i.test(a.href))?.href ?? null;
      });
      if (formUrl) result.applicationFormUrl = formUrl;

      const careersUrl = await page.evaluate((): string | null => {
        const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        return links.find(a => /careers|jobs|starf|work-with-us/i.test(a.href + a.textContent))?.href ?? null;
      });
      if (careersUrl) result.careersPageUrl = careersUrl;

      // --- Sub-pages (contact, about, jobs...) ---
      for (const subUrl of subLinks.slice(0, 4)) {
        try {
          const subOk = await safeNavigate(page, subUrl);
          if (!subOk) continue;

          const subResult = await page.evaluate(extractEmailsFromPage);
          addEmails(subResult.emails, subResult.text, subUrl, 'mailto');
          addEmails(extractEmails(subResult.text), subResult.text, subUrl, 'page');
        } catch {
          // ignore sub-page errors
        }
      }
    }, { timeout: 25000 });
  } catch (err) {
    logger.warn(`Crawl failed for ${websiteUrl}`, err);
  }

  let emailList = Array.from(allEmails.entries())
    .map(([email, data]) => ({ email, ...data }));

  // Boost emails that match the employer's name (e.g. raudara@fosshotel.is for "Fosshotel Rauðará")
  if (employerName) {
    emailList = applyNameBoost(emailList, employerName);
  }

  result.emails = emailList.sort((a, b) => a.priority - b.priority);

  logger.info(`Crawled ${websiteUrl}: found ${result.emails.length} emails`);
  return result;
}
