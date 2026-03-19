import { BaseProvider, type RawListing } from '@/providers/types';
import { withPage, safeNavigate } from '@/lib/scraping/playwright-helpers';
import { RateLimiter } from '@/lib/scraping/rate-limiter';
import { logger } from '@/lib/utils/logger';

/**
 * Detects if the text is predominantly Icelandic (no significant English content).
 * Flags common Icelandic words and absence of English markers.
 */
function isIcelandicOnly(text: string): boolean {
  const icelandicMarkers = [
    'starfsmaður',
    'störf',
    'launakjör',
    'starfstími',
    'umsókn',
    'menntu',
    'reynsla',
    'ferilskrá',
    'leitum',
    'óskum',
    'vinnutími',
    'hlutastarf',
    'fullt starf',
  ];
  const englishMarkers = [
    'experience',
    'required',
    'position',
    'duties',
    'salary',
    'apply',
    'responsibilities',
    'qualifications',
    'we are looking',
    'we are hiring',
    'you will',
  ];

  const lowerText = text.toLowerCase();
  const icelandicCount = icelandicMarkers.filter(m => lowerText.includes(m)).length;
  const englishCount = englishMarkers.filter(m => lowerText.includes(m)).length;

  return icelandicCount >= 3 && englishCount === 0;
}

export class StorfProvider extends BaseProvider {
  readonly name = 'storf' as const;
  private limiter = new RateLimiter(3000);

  async fetchListings(): Promise<RawListing[]> {
    const results: RawListing[] = [];

    try {
      const jobLinks = await withPage(async page => {
        await safeNavigate(page, 'https://storf.is');
        await page.waitForTimeout(2000);

        // Try to find job listing section
        await page
          .waitForSelector('a[href*="/starf"], a[href*="/job"], .job-card, .listing', {
            timeout: 8000,
          })
          .catch(() => {});

        return page.evaluate((): Array<{ href: string }> => {
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          return anchors
            .map(a => ({ href: (a as HTMLAnchorElement).href }))
            .filter(l => {
              const u = l.href.toLowerCase();
              return (
                (u.includes('storf.is') && (u.includes('/starf') || u.includes('/job'))) ||
                u.match(/storf\.is\/\d+/) !== null
              );
            })
            .slice(0, 100);
        });
      });

      logger.info(`Storf.is: found ${jobLinks.length} job links`);

      for (const link of jobLinks.slice(0, 70)) {
        await this.limiter.throttle();
        try {
          const listing = await withPage(async page => {
            const ok = await safeNavigate(page, link.href);
            if (!ok) return null;

            return page.evaluate((url: string) => {
              const title = document.querySelector('h1, h2')?.textContent?.trim() ?? '';
              const company =
                document
                  .querySelector('.company, .employer, [class*="company"]')
                  ?.textContent?.trim() ?? null;
              const location =
                document
                  .querySelector('.location, [class*="location"]')
                  ?.textContent?.trim() ?? null;
              const description =
                document.querySelector('article, main, .job-body, .content')
                  ?.textContent?.trim() ??
                document.body.textContent?.trim() ??
                '';
              const slug = url.split('/').filter(Boolean).pop() ?? url;
              return { providerJobId: slug, title, company, location, jobUrl: url, description };
            }, link.href);
          });

          if (listing && listing.title) {
            const languageRequirements = isIcelandicOnly(listing.description)
              ? 'Icelandic only'
              : null;

            results.push({
              providerJobId: `storf_${listing.providerJobId}`,
              title: listing.title,
              company: listing.company,
              location: listing.location ?? 'Iceland',
              jobUrl: listing.jobUrl,
              applyUrl: null,
              postedAt: null,
              rawDescription: this.cleanText(listing.description),
              scrapedAt: new Date().toISOString(),
              salaryText: null,
              employmentType: null,
            });

            // Override language_requirements after normalize() — we patch the NormalizedJob later
            void languageRequirements; // detected but used via overrideLanguageReqs
          }
        } catch (err) {
          logger.warn(`Storf.is: failed to scrape ${link.href}`, err);
        }
      }
    } catch (err) {
      logger.error('Storf.is: scraper failed', err);
    }

    logger.info(`Storf.is: scraped ${results.length} listings`);
    return results;
  }

  override normalize(raw: RawListing) {
    const normalized = super.normalize(raw);
    // Override language hints with our Icelandic-only detector
    if (isIcelandicOnly(raw.rawDescription)) {
      normalized.language_requirements = 'Icelandic only';
    }
    return normalized;
  }
}
