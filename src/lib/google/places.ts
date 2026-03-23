import axios from 'axios';
import { logger } from '@/lib/utils/logger';
import { RateLimiter } from '@/lib/scraping/rate-limiter';

// Uses the new Places API (New) - no legacy API activation needed
// POST https://places.googleapis.com/v1/places:searchText

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  website?: string;
  formatted_phone_number?: string;
}

interface NewPlacesPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
}

interface NewPlacesResponse {
  places?: NewPlacesPlace[];
  nextPageToken?: string;
}

const limiter = new RateLimiter(3000);

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const results: PlaceResult[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    await limiter.throttle();

    try {
      const body: Record<string, unknown> = {
        textQuery: query,
        maxResultCount: 20,
        languageCode: 'en',
      };
      if (pageToken) body.pageToken = pageToken;

      const response = await axios.post<NewPlacesResponse>(
        'https://places.googleapis.com/v1/places:searchText',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,nextPageToken',
          },
          timeout: 10000,
        }
      );

      const places = response.data.places ?? [];
      pageToken = response.data.nextPageToken;

      for (const p of places) {
        if (!p.id || !p.displayName?.text) continue;
        results.push({
          place_id: p.id,
          name: p.displayName.text,
          formatted_address: p.formattedAddress ?? '',
          website: p.websiteUri,
          formatted_phone_number: p.nationalPhoneNumber ?? p.internationalPhoneNumber,
        });
      }

      page++;
    } catch (err) {
      logger.error(`Places API (New) error for query: ${query}`, err);
      break;
    }
  } while (pageToken && page < 5);

  return results;
}
