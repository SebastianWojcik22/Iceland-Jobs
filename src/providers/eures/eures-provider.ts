import axios from 'axios';
import { BaseProvider, type RawListing } from '@/providers/types';
import { RateLimiter } from '@/lib/scraping/rate-limiter';
import { logger } from '@/lib/utils/logger';

interface EuresJob {
  id: string;
  title: string;
  employer?: { name?: string };
  location?: { city?: string; country?: string };
  publicationDate?: string;
  applicationUrl?: string;
  description?: string;
  salary?: string;
  contractType?: string;
  workingTimeType?: string;
}

interface EuresResponse {
  jobs?: EuresJob[];
  results?: EuresJob[];
  data?: EuresJob[];
}

export class EuresProvider extends BaseProvider {
  readonly name = 'eures' as const;
  private limiter = new RateLimiter(2000);

  async fetchListings(): Promise<RawListing[]> {
    const results: RawListing[] = [];
    let page = 0;
    const pageSize = 100;

    while (true) {
      await this.limiter.throttle();
      try {
        const response = await axios.post<EuresResponse>(
          'https://eures.europa.eu/api/jv-search/search',
          {
            countryCode: 'IS',
            pageSize,
            page,
            sortBy: 'MOST_RECENT',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Origin': 'https://eures.europa.eu',
              'Referer': 'https://eures.europa.eu/en/find-a-job',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 15000,
          }
        );

        const raw = response.data;
        const jobs: EuresJob[] = raw.jobs ?? raw.results ?? raw.data ?? [];

        if (jobs.length === 0) break;

        for (const job of jobs) {
          results.push({
            providerJobId: String(job.id),
            title: job.title ?? 'Untitled',
            company: job.employer?.name ?? null,
            location: job.location?.city ?? job.location?.country ?? 'Iceland',
            jobUrl: `https://eures.europa.eu/en/jobs/${job.id}`,
            applyUrl: job.applicationUrl ?? null,
            postedAt: job.publicationDate ?? null,
            rawDescription: this.cleanText(job.description ?? ''),
            scrapedAt: new Date().toISOString(),
            salaryText: job.salary ?? null,
            employmentType: job.contractType ?? job.workingTimeType ?? null,
          });
        }

        if (jobs.length < pageSize) break;
        page++;
      } catch (err) {
        logger.error('EURES fetch error', err);
        break;
      }
    }

    logger.info(`EURES: fetched ${results.length} listings`);
    return results;
  }
}
