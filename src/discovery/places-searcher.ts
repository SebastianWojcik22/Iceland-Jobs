import { searchPlaces } from '@/lib/google/places';
import { logger } from '@/lib/utils/logger';

// 47 lokalizacji × 9 kategorii = 423 zapytania → ~3000-5000 unikalnych miejsc
const ICELAND_LOCATIONS = [
  // Reykjavik + okolice
  'Reykjavik', 'Hafnarfjordur', 'Kopavogur', 'Mosfellsbaer', 'Gardabaer',
  // Półwysep Reykjanes
  'Keflavik', 'Grindavik', 'Selfoss',
  // Południe
  'Hveragerdi', 'Hvolsvollur', 'Hella', 'Vik Iceland', 'Kirkjubaejarklaustur',
  'Hofn Iceland', 'Jokulsarlon', 'Skaftafell', 'Laugarvatn', 'Fludir',
  // Snæfellsnes / Zachód
  'Borgarnes', 'Stykkisholmur', 'Grundarfjordur', 'Olafsvik', 'Snaefellsnes',
  // Fjordy Zachodnie
  'Isafjordur', 'Holmavik', 'Patreksfjordur',
  // Północ
  'Akureyri', 'Husavik', 'Myvatn', 'Dalvik', 'Siglufjordur',
  'Saudarkrokur', 'Blonduos', 'Skagafjordur', 'Olafsfjordur',
  // Wschód
  'Egilsstadir', 'Seydisfjordur', 'Neskaupstadur',
  'Vopnafjordur', 'Eskifjordur', 'Djupivogur', 'Stodvarfjordur',
  // Popularne miejsca turystyczne
  'Golden Circle Iceland', 'South Coast Iceland', 'Westfjords Iceland',
  'Pingvellir Iceland', 'Landmannalaugar Iceland', 'Vatnajokull Iceland',
];

const SEARCH_CATEGORIES = [
  'hotel',
  'guesthouse',
  'hostel',
  'bed and breakfast',
  'restaurant',
  'cafe',
  'tour operator',
  'farm stay',
  'resort',
];

export function buildAllQueries(): string[] {
  const queries: string[] = [];
  for (const location of ICELAND_LOCATIONS) {
    for (const category of SEARCH_CATEGORIES) {
      queries.push(`${category} in ${location}`);
    }
  }
  return queries;
}

// Keep for backward compat (used by cron route)
export const CATEGORY_CONFIG = {
  hotel: {
    map_queries: buildAllQueries(),
    site_keywords: ['hotel', 'guesthouse', 'hostel', 'resort', 'lodge', 'restaurant', 'cafe'],
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

const REGION_MAP: Array<{ match: string; label: string }> = [
  { match: 'reykjavik', label: 'Reykjavik' },
  { match: 'hafnarfjordur', label: 'Hafnarfjörður' },
  { match: 'kopavogur', label: 'Kópavogur' },
  { match: 'keflavik', label: 'Keflavik' },
  { match: 'selfoss', label: 'Selfoss' },
  { match: 'akureyri', label: 'Akureyri' },
  { match: 'husavik', label: 'Húsavík' },
  { match: 'myvatn', label: 'Mývatn' },
  { match: 'egilsstadir', label: 'Egilsstaðir' },
  { match: 'seydisfjordur', label: 'Seyðisfjörður' },
  { match: 'hofn', label: 'Höfn' },
  { match: 'vik', label: 'Vík' },
  { match: 'borgarnes', label: 'Borgarnes' },
  { match: 'stykkisholmur', label: 'Stykkishólmur' },
  { match: 'isafjordur', label: 'Ísafjörður' },
  { match: 'siglufjordur', label: 'Siglufjörður' },
  { match: 'saudarkrokur', label: 'Sauðárkrókur' },
  { match: 'hvolsvollur', label: 'Hvolsvöllur' },
  { match: 'hella', label: 'Hella' },
  { match: 'grindavik', label: 'Grindavík' },
  { match: 'hveragerdi', label: 'Hveragerði' },
  { match: 'dalvik', label: 'Dalvík' },
  { match: 'olafsfjordur', label: 'Ólafsfjörður' },
  { match: 'grundarfjordur', label: 'Grundarfjörður' },
  { match: 'olafsvik', label: 'Ólafsvík' },
  { match: 'patreksfjordur', label: 'Patreksfjörður' },
  { match: 'holmavik', label: 'Hólmavík' },
  { match: 'blonduos', label: 'Blönduós' },
  { match: 'djupivogur', label: 'Djúpivogur' },
  { match: 'vopnafjordur', label: 'Vopnafjörður' },
  { match: 'eskifjordur', label: 'Eskifjörður' },
  { match: 'neskaupstadur', label: 'Neskaupstaður' },
  { match: 'kirkjubaejarklaustur', label: 'Kirkjubæjarklaustur' },
  { match: 'laugarvatn', label: 'Laugarvatn' },
  { match: 'jokulsarlon', label: 'Jökulsárlón' },
  { match: 'skaftafell', label: 'Skaftafell' },
  { match: 'mosfellsbaer', label: 'Mosfellsbær' },
  { match: 'gardabaer', label: 'Garðabær' },
];

function extractRegion(address: string): string {
  const lower = address.toLowerCase().replace(/[^a-z ]/g, '');
  for (const { match, label } of REGION_MAP) {
    if (lower.includes(match)) return label;
  }
  if (lower.includes('south')) return 'South Iceland';
  if (lower.includes('north')) return 'North Iceland';
  if (lower.includes('east')) return 'East Iceland';
  if (lower.includes('west')) return 'West Iceland';
  return 'Iceland';
}

/**
 * Search Google Places for a given category.
 * @param queryOffset Resume from this query index (for batched runs)
 * @param maxQueries Max queries to run in this batch (default: all)
 */
export async function searchCategory(
  category: CategoryKey,
  queryOffset = 0,
  maxQueries = Infinity
): Promise<DiscoveredPlace[]> {
  const allQueries = buildAllQueries();
  const batch = allQueries.slice(queryOffset, queryOffset + maxQueries);

  const all: DiscoveredPlace[] = [];
  const seenIds = new Set<string>();

  for (const query of batch) {
    logger.info(`Places search [${queryOffset + batch.indexOf(query) + 1}/${allQueries.length}]: "${query}"`);
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

  logger.info(`Places search: found ${all.length} unique places in this batch`);
  return all;
}
