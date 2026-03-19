import type { ProviderName } from '@/types';
import crypto from 'crypto';

export interface RawListing {
  providerJobId: string;
  title: string;
  company: string | null;
  location: string | null;
  jobUrl: string;
  applyUrl: string | null;
  postedAt: string | null;
  rawDescription: string;
  scrapedAt: string;
  salaryText: string | null;
  employmentType: string | null;
}

export interface NormalizedJob {
  dedup_hash: string;
  provider: ProviderName;
  provider_job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  job_url: string;
  apply_url: string | null;
  posted_at: Date | null;
  employment_type: string | null;
  salary_text: string | null;
  language_requirements: string | null;
  raw_description: string;
  experience_signals_json: Record<string, unknown>;
}

export abstract class BaseProvider {
  abstract readonly name: ProviderName;
  abstract fetchListings(): Promise<RawListing[]>;

  normalize(raw: RawListing): NormalizedJob {
    return {
      dedup_hash: this.makeHash(raw.providerJobId),
      provider: this.name,
      provider_job_id: raw.providerJobId,
      title: raw.title,
      company: raw.company,
      location: raw.location,
      job_url: raw.jobUrl,
      apply_url: raw.applyUrl,
      posted_at: raw.postedAt ? new Date(raw.postedAt) : null,
      employment_type: raw.employmentType,
      salary_text: raw.salaryText,
      language_requirements: this.extractLanguageHints(raw.rawDescription),
      raw_description: raw.rawDescription,
      experience_signals_json: this.extractExperienceSignals(raw.rawDescription),
    };
  }

  protected makeHash(providerJobId: string): string {
    return crypto.createHash('sha256').update(`${this.name}::${providerJobId}`).digest('hex');
  }

  protected cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private extractLanguageHints(text: string): string | null {
    if (/english.{0,30}(ok|accepted|sufficient|enough|required|welcome)/i.test(text))
      return 'English OK';
    if (/icelandic.{0,30}required/i.test(text) || /íslenska/i.test(text))
      return 'Icelandic required';
    if (/english.{0,30}required/i.test(text)) return 'English required';
    return null;
  }

  private extractExperienceSignals(text: string): Record<string, unknown> {
    return {
      hasExperienceRequired: /experience required/i.test(text),
      hasNoExperience: /no experience/i.test(text),
      hasTraining: /training provided|on.the.job training/i.test(text),
      hasSeasonal: /seasonal/i.test(text),
      yearsRequired:
        text.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/i)?.[1] ?? null,
    };
  }
}
