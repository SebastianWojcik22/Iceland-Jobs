import { BaseProvider, type RawListing } from '@/providers/types';
import { withPage, safeNavigate } from '@/lib/scraping/playwright-helpers';
import { RateLimiter } from '@/lib/scraping/rate-limiter';
import { logger } from '@/lib/utils/logger';

const CANDIDATE_URLS = [
  'https://island.is/en/o/directorate-of-labour/jobs',
  'https://vinnumalastofnun.is/en/job-seekers/find-a-job',
  'https://vinnumalastofnun.is/en',
];

export class IslandProvider extends BaseProvider {
  readonly name = 'island' as const;
  private limiter = new RateLimiter(3000);

  async fetchListings(): Promise<RawListing[]> {
    const results: RawListing[] = [];

    for (const baseUrl of CANDIDATE_URLS) {
      try {
        const links = await withPage(async page => {
          const ok = await safeNavigate(page, baseUrl);
          if (!ok) return [];

          await page.waitForTimeout(2000);

          return page.evaluate((): Array<{ href: string }> => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            return anchors
              .map(a => ({ href: (a as HTMLAnchorElement).href }))
              .filter(l => {
                const u = l.href.toLowerCase();
                return (
                  u.includes('/job') ||
                  u.includes('/starf') ||
                  u.includes('/work') ||
                  u.includes('/position')
                );
              })
              .filter(l => !l.href.endsWith('/jobs') && !l.href.endsWith('/starf'))
              .slice(0, 80);
          });
        });

        if (links.length === 0) continue;

        logger.info(`Island.is: found ${links.length} job links at ${baseUrl}`);

        for (const link of links.slice(0, 60)) {
          await this.limiter.throttle();
          try {
            const listing = await withPage(async page => {
              const ok = await safeNavigate(page, link.href);
              if (!ok) return null;

              return page.evaluate((url: string) => {
                const title =
                  document.querySelector('h1, h2, .job-title')?.textContent?.trim() ?? '';
                const company =
                  document
                    .querySelector('.employer, .company, [class*="employer"]')
                    ?.textContent?.trim() ?? null;
                const location =
                  document
                    .querySelector('.location, [class*="location"]')
                    ?.textContent?.trim() ?? 'Iceland';
                const description =
                  document.querySelector('article, main, .content, .description')
                    ?.textContent?.trim() ??
                  document.body.textContent?.trim() ??
                  '';
                const slug = url.split('/').filter(Boolean).pop() ?? url;
                return { providerJobId: slug, title, company, location, jobUrl: url, description };
              }, link.href);
            });

            if (listing && listing.title) {
              results.push({
                providerJobId: `island_${listing.providerJobId}`,
                title: listing.title,
                company: listing.company,
                location: listing.location,
                jobUrl: listing.jobUrl,
                applyUrl: null,
                postedAt: null,
                rawDescription: this.cleanText(listing.description),
                scrapedAt: new Date().toISOString(),
                salaryText: null,
                employmentType: null,
              });
            }
          } catch (err) {
            logger.warn(`Island.is: failed to scrape ${link.href}`, err);
          }
        }

        if (results.length > 0) break; // success with this URL, no need to try fallbacks
      } catch (err) {
        logger.warn(`Island.is: failed to load ${baseUrl}`, err);
      }
    }

    logger.info(`Island.is: scraped ${results.length} listings`);
    return results;
  }
}
