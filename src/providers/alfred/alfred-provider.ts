import { BaseProvider, type RawListing } from '@/providers/types';
import { withPage, safeNavigate } from '@/lib/scraping/playwright-helpers';
import { RateLimiter } from '@/lib/scraping/rate-limiter';
import { logger } from '@/lib/utils/logger';

export class AlfredProvider extends BaseProvider {
  readonly name = 'alfred' as const;
  private limiter = new RateLimiter(3000);

  async fetchListings(): Promise<RawListing[]> {
    const results: RawListing[] = [];

    try {
      // Step 1: Collect all job links from the listing page
      // Try multiple alfred.is URL patterns (site structure may vary)
      const ALFRED_URLS = [
        'https://alfred.is/en',
        'https://alfred.is/en/sumarstorf', // summer jobs
      ];

      const jobLinks = await withPage(async page => {
        let loaded = false;
        for (const url of ALFRED_URLS) {
          loaded = await safeNavigate(page, url);
          if (loaded) break;
        }
        if (!loaded) return [];

        // Wait for any content to load
        await page.waitForTimeout(3000);

        const links = await page.evaluate((): Array<{ href: string; text: string }> => {
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          return anchors
            .map(a => ({
              href: (a as HTMLAnchorElement).href,
              text: a.textContent?.trim() ?? '',
            }))
            .filter(l => {
              const h = l.href;
              // alfred.is job detail URLs use /en/starf/{slug}
              return h.includes('alfred.is/en/starf/');
            })
            .slice(0, 100);
        });

        // Fallback: if no job links found, try to find any article/card links
        if (links.length === 0) {
          const fallback = await page.evaluate((): Array<{ href: string; text: string }> => {
            const cards = Array.from(document.querySelectorAll('article a, .job-card a, .listing a, [class*="job"] a'));
            return cards
              .map(a => ({ href: (a as HTMLAnchorElement).href, text: a.textContent?.trim() ?? '' }))
              .filter(l => l.href.includes('alfred.is') && l.href.length > 30)
              .slice(0, 100);
          });
          return [...new Map(fallback.map(l => [l.href, l])).values()];
        }

        return [...new Map(links.map(l => [l.href, l])).values()];
      });

      logger.info(`Alfred: found ${jobLinks.length} job links`);

      // Step 2: Visit each job page
      for (const link of jobLinks.slice(0, 80)) {
        await this.limiter.throttle();
        try {
          const listing = await withPage(async page => {
            const ok = await safeNavigate(page, link.href);
            if (!ok) return null;

            return page.evaluate((url: string) => {
              const title = document.querySelector('h1')?.textContent?.trim() ?? '';
              const company =
                document
                  .querySelector('.company, .employer, [class*="company"]')
                  ?.textContent?.trim() ?? null;
              const location =
                document
                  .querySelector('.location, [class*="location"]')
                  ?.textContent?.trim() ?? 'Iceland';
              const description =
                document
                  .querySelector('.job-description, article, main, .content')
                  ?.textContent?.trim() ??
                document.body.textContent?.trim() ??
                '';
              const applyLink =
                (
                  document.querySelector(
                    'a[href*="apply"], a[href*="application"]'
                  ) as HTMLAnchorElement | null
                )?.href ?? null;
              const slug = url.split('/').pop() ?? url;
              return {
                providerJobId: slug,
                title,
                company,
                location,
                jobUrl: url,
                applyUrl: applyLink,
                description,
              };
            }, link.href);
          });

          if (listing && listing.title) {
            results.push({
              providerJobId: listing.providerJobId,
              title: listing.title,
              company: listing.company,
              location: listing.location,
              jobUrl: listing.jobUrl,
              applyUrl: listing.applyUrl,
              postedAt: null,
              rawDescription: this.cleanText(listing.description),
              scrapedAt: new Date().toISOString(),
              salaryText: null,
              employmentType: null,
            });
          }
        } catch (err) {
          logger.warn(`Alfred: failed to scrape ${link.href}`, err);
        }
      }
    } catch (err) {
      logger.error('Alfred: scraper failed', err);
    }

    logger.info(`Alfred: scraped ${results.length} listings`);
    return results;
  }
}
