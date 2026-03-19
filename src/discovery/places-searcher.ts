import { searchPlaces } from '@/lib/google/places';
import { logger } from '@/lib/utils/logger';

export const CATEGORY_CONFIG = {
  hotel: {
    map_queries: [
      'hotel in Iceland',
      'guesthouse in Iceland',
      'hostel in Iceland',
      'hotel in Reykjavik Iceland',
      'hotel in South Iceland',
      'hotel in North Iceland',
      'hotel in East Iceland',
      'hotel in West Iceland',
      'guesthouse in Reykjavik Iceland',
      'hostel in Reykjavik Iceland',
    ],
    site_keywords: ['hotel', 'guesthouse', 'hostel', 'resort', 'lodge'],
  },
} as const;

export type CategoryKey = keyof typeof CATEGORY_CONFIG;

export interface DiscoveredPlace {
  place_id: string;
  place_name: string;
  category: CategoryKey;
  address: string;
  website_url: string | null;
  phone: string | null;
  maps_url: string;
  region: string | null;
}

const REGIONS = [
  'Reykjavik',
  'Akureyri',
  'Selfoss',
  'Keflavik',
  'Vik',
  'Hofn',
  'Egilsstadir',
  'Husavik',
  'Borgarnes',
  'Isafjordur',
];

function extractRegion(address: string): string | null {
  for (const r of REGIONS) {
    if (address.toLowerCase().includes(r.toLowerCase())) return r;
  }
  if (address.includes('South')) return 'South Iceland';
  if (address.includes('North')) return 'North Iceland';
  if (address.includes('East')) return 'East Iceland';
  if (address.includes('West')) return 'West Iceland';
  return 'Iceland';
}

export async function searchCategory(category: CategoryKey): Promise<DiscoveredPlace[]> {
  const config = CATEGORY_CONFIG[category];
  const all: DiscoveredPlace[] = [];
  const seenIds = new Set<string>();

  for (const query of config.map_queries) {
    logger.info(`Places search: "${query}"`);
    try {
      const places = await searchPlaces(query);
      for (const p of places) {
        if (seenIds.has(p.place_id)) continue;
        seenIds.add(p.place_id);
        all.push({
          place_id: p.place_id,
          place_name: p.name,
          category,
          address: p.formatted_address ?? '',
          website_url: p.website ?? null,
          phone: p.formatted_phone_number ?? null,
          maps_url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
          region: extractRegion(p.formatted_address ?? ''),
        });
      }
    } catch (err) {
      logger.error(`Places search failed for: ${query}`, err);
    }
  }

  logger.info(`Places search for ${category}: found ${all.length} unique places`);
  return all;
}
