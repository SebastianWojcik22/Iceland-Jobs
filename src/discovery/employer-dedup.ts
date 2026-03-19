import { createServerClient } from '@/lib/supabase/server-internal';
import { extractDomain, toNameSlug } from '@/lib/utils/slug';
import type { DiscoveredPlace } from './places-searcher';
import { logger } from '@/lib/utils/logger';

export async function filterNewEmployers(places: DiscoveredPlace[]): Promise<DiscoveredPlace[]> {
  if (places.length === 0) return [];

  const supabase = await createServerClient();
  const placeIds = places.map(p => p.place_id);
  const domains = places
    .map(p => (p.website_url ? extractDomain(p.website_url) : null))
    .filter((d): d is string => d !== null);
  const slugs = places.map(p => toNameSlug(p.place_name));

  const [byPlaceId, byDomain, bySlug] = await Promise.all([
    supabase.from('employers').select('place_id').in('place_id', placeIds),
    domains.length > 0
      ? supabase.from('employers').select('domain').in('domain', domains)
      : Promise.resolve({ data: [] }),
    supabase.from('employers').select('name_slug').in('name_slug', slugs),
  ]);

  const existingPlaceIds = new Set(
    ((byPlaceId.data ?? []) as Array<{ place_id: string }>).map(r => r.place_id)
  );
  const existingDomains = new Set(
    ((byDomain.data ?? []) as Array<{ domain: string }>).map(r => r.domain)
  );
  const existingSlugs = new Set(
    ((bySlug.data ?? []) as Array<{ name_slug: string }>).map(r => r.name_slug)
  );

  return places.filter(p => {
    if (existingPlaceIds.has(p.place_id)) return false;
    const domain = p.website_url ? extractDomain(p.website_url) : null;
    if (domain && existingDomains.has(domain)) return false;
    if (existingSlugs.has(toNameSlug(p.place_name))) return false;
    return true;
  });
}

export async function insertEmployers(places: DiscoveredPlace[]): Promise<void> {
  if (places.length === 0) return;

  const supabase = await createServerClient();
  const rows = places.map(p => ({
    place_id: p.place_id,
    place_name: p.place_name,
    category: p.category,
    region: p.region,
    address: p.address,
    phone: p.phone,
    maps_url: p.maps_url,
    website_url: p.website_url,
    domain: p.website_url ? extractDomain(p.website_url) : null,
    name_slug: toNameSlug(p.place_name),
  }));

  const { error } = await supabase.from('employers').insert(rows);
  if (error) logger.error('Failed to insert employers', error);
  else logger.info(`Inserted ${rows.length} new employers`);
}
