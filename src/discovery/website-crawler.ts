import { withPage, safeNavigate } from '@/lib/scraping/playwright-helpers';
import { extractEmails, getEmailPriority, getEvidence } from '@/lib/utils/email-extractor';
import { RateLimiter } from '@/lib/scraping/rate-limiter';
import { logger } from '@/lib/utils/logger';

export interface CrawlResult {
  emails: Array<{ email: string; priority: number; sourceUrl: string; evidence: string }>;
  applicationFormUrl: string | null;
  careersPageUrl: string | null;
}

const CONTACT_PATHS = [
  '/contact',
  '/about',
  '/jobs',
  '/careers',
  '/work-with-us',
  '/team',
  '/about-us',
  '/starf',
  '/um-okkur',
];

const limiter = new RateLimiter(3000);

export async function crawlEmployerWebsite(websiteUrl: string): Promise<CrawlResult> {
  await limiter.throttle();

  const result: CrawlResult = {
    emails: [],
    applicationFormUrl: null,
    careersPageUrl: null,
  };
  const allEmails = new Map<string, { priority: number; sourceUrl: string; evidence: string }>();

  try {
    await withPage(async page => {
      // Step 1: Crawl homepage
      const ok = await safeNavigate(page, websiteUrl);
      if (!ok) return;

      const homepageContent = await page.evaluate(
        () => document.body.innerText ?? ''
      );

      for (const email of extractEmails(homepageContent)) {
        if (!allEmails.has(email)) {
          allEmails.set(email, {
            priority: getEmailPriority(email),
            sourceUrl: websiteUrl,
            evidence: getEvidence(homepageContent, email),
          });
        }
      }

      // Step 2: Find sub-page links on homepage
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

      // Step 3: Detect careers/form links on homepage
      const formUrl = await page.evaluate((): string | null => {
        const links = Array.from(
          document.querySelectorAll('a[href]')
        ) as HTMLAnchorElement[];
        const formLink = links.find(a =>
          /typeform|jotform|google\.com\/forms|application|apply/i.test(a.href)
        );
        return formLink?.href ?? null;
      });
      if (formUrl) result.applicationFormUrl = formUrl;

      const careersUrl = await page.evaluate((): string | null => {
        const links = Array.from(
          document.querySelectorAll('a[href]')
        ) as HTMLAnchorElement[];
        const cl = links.find(a =>
          /careers|jobs|starf|work-with-us/i.test(a.href + a.textContent)
        );
        return cl?.href ?? null;
      });
      if (careersUrl) result.careersPageUrl = careersUrl;

      // Step 4: Crawl sub-pages
      for (const subUrl of subLinks.slice(0, 3)) {
        try {
          const subOk = await safeNavigate(page, subUrl);
          if (!subOk) continue;

          const subContent = await page.evaluate(() => document.body.innerText ?? '');
          for (const email of extractEmails(subContent)) {
            if (!allEmails.has(email)) {
              allEmails.set(email, {
                priority: getEmailPriority(email),
                sourceUrl: subUrl,
                evidence: getEvidence(subContent, email),
              });
            }
          }
        } catch {
          // Ignore sub-page errors
        }
      }
    }, { timeout: 20000 });
  } catch (err) {
    logger.warn(`Crawl failed for ${websiteUrl}`, err);
  }

  result.emails = Array.from(allEmails.entries())
    .map(([email, data]) => ({ email, ...data }))
    .sort((a, b) => a.priority - b.priority);

  return result;
}
