export type ProviderName = 'alfred' | 'island' | 'jobs_is' | 'storf' | 'eures';
export type Country = 'IS' | 'NO' | 'DE' | 'NL';
export type Currency = 'ISK' | 'EUR' | 'NOK' | 'PLN';
export type HousingStatus = 'yes' | 'maybe' | 'no' | 'unknown';
export type PairStatus = 'yes' | 'maybe' | 'no' | 'unknown';
export type ReviewStatus = 'new' | 'saved' | 'applied' | 'rejected';
export type ContactMethod = 'email' | 'form' | 'unknown';
export type SyncTrigger = 'cron' | 'manual';
export type SyncStatus = 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  dedup_hash: string;
  provider: ProviderName;
  provider_job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  job_url: string;
  apply_url: string | null;
  posted_at: string | null;
  scraped_at: string;
  employment_type: string | null;
  salary_text: string | null;
  language_requirements: string | null;
  raw_description: string | null;
  normalized_summary: string | null;
  requirement_summary: string | null;
  title_pl: string | null;
  summary_pl: string | null;
  requirements_pl: string | null;
  language_note: string | null;
  experience_signals_json: Record<string, unknown> | null;
  housing_status: HousingStatus;
  housing_confidence: number;
  housing_evidence: string | null;
  pair_friendliness_status: PairStatus;
  pair_friendliness_score: number;
  pair_friendliness_evidence: string | null;
  english_friendly_status: 'yes' | 'maybe' | 'no' | 'unknown';
  icelandic_required_status: 'yes' | 'no' | 'unknown';
  junior_fit_score: number;
  priority_score: number;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface Employer {
  id: string;
  place_id: string | null;
  place_name: string;
  category: string;
  region: string | null;
  address: string | null;
  phone: string | null;
  maps_url: string | null;
  website_url: string | null;
  domain: string | null;
  name_slug: string | null;
  confidence_score: number;
  best_contact_method: ContactMethod;
  best_email: string | null;
  email_priority: number | null;
  application_form_url: string | null;
  careers_page_url: string | null;
  evidence_excerpt: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployerContact {
  id: string;
  employer_id: string;
  email: string;
  priority: number;
  source_url: string | null;
  found_at: string;
}

export interface SyncRun {
  id: string;
  trigger: SyncTrigger;
  started_at: string;
  completed_at: string | null;
  providers_run: string[];
  total_fetched: number;
  new_jobs: number;
  duplicates: number;
  errors_json: Array<{ provider: string; message: string }>;
  status: SyncStatus;
}

export interface ParseLog {
  id: string;
  sync_run_id: string | null;
  provider: string;
  job_url: string | null;
  error_type: string | null;
  message: string | null;
  raw_data: string | null;
  logged_at: string;
}

export interface OutreachDraft {
  id: string;
  batch_id: string;
  template_id: string;
  subject: string;
  body_html: string;
  bcc_emails: string[];
  gmail_draft_id: string | null;
  mailto_fallback: string | null;
  created_at: string;
}

export interface JobFilters {
  provider?: ProviderName | '';
  status?: ReviewStatus | '';
  housing?: HousingStatus | '';
  pair?: PairStatus | '';
  minScore?: number;
  search?: string;
  page?: number;
}
