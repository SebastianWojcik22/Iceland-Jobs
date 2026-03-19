import { BaseProvider, type RawListing } from '@/providers/types';
import { withPage, safeNavigate } from '@/lib/scraping/playwright-helpers';
import { RateLimiter } from '@/lib/scraping/rate-limiter';
import { logger } from '@/lib/utils/logger';

export class JobsIsProvider extends BaseProvider {
  readonly name = 'jobs_is' as const;
  private limiter = new RateLimiter(3000);

  async fetchListings(): Promise<RawListing[]> {
    const results: RawListing[] = [];

    try {
      // Step 1: Gather job card links from listing page
      const jobLinks = await withPage(async page => {
        await safeNavigate(page, 'https://www.jobs.is/jobs');
        await page
          .waitForSelector('a[href*="/jobs/"]', { timeout: 12000 })
          .catch(() => {});

        // Scroll to load more listings
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);

        const links = await page.evaluate((): Array<{ href: string }> => {
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          return anchors
            .map(a => ({ href: (a as HTMLAnchorElement).href }))
            .filter(
              l =>
                l.href.match(/\/jobs\/\d+/) !== null ||
                (l.href.includes('jobs.is/jobs/') && !l.href.endsWith('/jobs'))
            )
            .slice(0, 120);
        });

        return [...new Map(links.map(l => [l.href, l])).values()];
      });

      logger.info(`Jobs.is: found ${jobLinks.length} job links`);

      // Step 2: Visit each job page
      for (const link of jobLinks.slice(0, 80)) {
        await this.limiter.throttle();
        try {
          const listing = await withPage(async page => {
            const ok = await safeNavigate(page, link.href);
            if (!ok) return null;

            return page.evaluate((url: string) => {
              const title =
                document.querySelector('h1, .job-title, [class*="title"]')?.textContent?.trim() ?? '';
              const company =
                document
                  .querySelector('.company-name, .employer, [class*="company"], [class*="employer"]')
                  ?.textContent?.trim() ?? null;
              const location =
                document
                  .querySelector('.location, [class*="location"], [class*="place"]')
                  ?.textContent?.trim() ?? 'Iceland';
              const description =
                document.querySelector('.job-description, .description, article, main')
                  ?.textContent?.trim() ??
                document.body.textContent?.trim() ??
                '';
              const salaryEl = document.querySelector('.salary, [class*="salary"], [class*="wage"]');
              const salaryText = salaryEl?.textContent?.trim() ?? null;
              const typeEl = document.querySelector('.employment-type, [class*="type"], [class*="contract"]');
              const employmentType = typeEl?.textContent?.trim() ?? null;
              const applyLink =
                (document.querySelector('a[href*="apply"]') as HTMLAnchorElement | null)?.href ?? null;

              const slug = url.split('/').pop() ?? url;
              return {
                providerJobId: slug,
                title,
                company,
                location,
                jobUrl: url,
                applyUrl: applyLink,
                description,
                salaryText,
                employmentType,
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
              salaryText: listing.salaryText,
              employmentType: listing.employmentType,
            });
          }
        } catch (err) {
          logger.warn(`Jobs.is: failed to scrape ${link.href}`, err);
        }
      }
    } catch (err) {
      logger.error('Jobs.is: scraper failed', err);
    }

    logger.info(`Jobs.is: scraped ${results.length} listings`);
    return results;
  }
}
