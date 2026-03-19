import type { CrawlResult } from './website-crawler';

export interface RankedContact {
  best_email: string | null;
  email_priority: number | null;
  best_contact_method: 'email' | 'form' | 'unknown';
  confidence_score: number;
  evidence_excerpt: string | null;
}

export function rankContacts(crawl: CrawlResult): RankedContact {
  if (crawl.emails.length > 0) {
    const best = crawl.emails[0]; // already sorted by priority ASC (1 = best)
    const confidence = best.priority === 1 ? 90 : best.priority === 2 ? 70 : 50;
    return {
      best_email: best.email,
      email_priority: best.priority,
      best_contact_method: 'email',
      confidence_score: confidence,
      evidence_excerpt: best.evidence,
    };
  }

  if (crawl.applicationFormUrl ?? crawl.careersPageUrl) {
    return {
      best_email: null,
      email_priority: null,
      best_contact_method: 'form',
      confidence_score: 40,
      evidence_excerpt: null,
    };
  }

  return {
    best_email: null,
    email_priority: null,
    best_contact_method: 'unknown',
    confidence_score: 0,
    evidence_excerpt: null,
  };
}
