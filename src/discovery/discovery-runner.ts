import { searchCategory, type CategoryKey } from './places-searcher';
import { filterNewEmployers, insertEmployers } from './employer-dedup';
import { crawlEmployerWebsite } from './website-crawler';
import { rankContacts } from './email-ranker';
import { createServerClient } from '@/lib/supabase/server-internal';
import { logger } from '@/lib/utils/logger';
import { closeBrowser } from '@/lib/scraping/playwright-helpers';

export async function runDiscovery(
  category: CategoryKey = 'hotel'
): Promise<{ newEmployers: number; emailsFound: number }> {
  logger.info(`Starting employer discovery for category: ${category}`);

  const places = await searchCategory(category);
  const newPlaces = await filterNewEmployers(places);
  logger.info(`New employers to process: ${newPlaces.length}`);

  await insertEmployers(newPlaces);

  // Now crawl websites for emails (includes already-existing employers without email)
  const supabase = await createServerClient();
  const { data: employers } = await supabase
    .from('employers')
    .select('id, website_url, place_name')
    .is('best_email', null)
    .eq('category', category)
    .not('website_url', 'is', null)
    .limit(100);

  let emailsFound = 0;

  for (const employer of employers ?? []) {
    if (!employer.website_url) continue;
    logger.info(`Crawling: ${employer.place_name} (${employer.website_url})`);

    try {
      const crawl = await crawlEmployerWebsite(employer.website_url as string);
      const ranked = rankContacts(crawl);

      await supabase
        .from('employers')
        .update({
          ...ranked,
          application_form_url: crawl.applicationFormUrl,
          careers_page_url: crawl.careersPageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employer.id);

      if (crawl.emails.length > 0) {
        emailsFound++;
        await supabase.from('employer_contacts').insert(
          crawl.emails.map(e => ({
            employer_id: employer.id,
            email: e.email,
            priority: e.priority,
            source_url: e.sourceUrl,
          }))
        );
      }
    } catch (err) {
      logger.error(`Crawl failed for ${employer.place_name}`, err);
    }
  }

  await closeBrowser();
  logger.info(
    `Discovery complete. New: ${newPlaces.length}, Emails found: ${emailsFound}`
  );

  return { newEmployers: newPlaces.length, emailsFound };
}
