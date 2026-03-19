CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE,
  place_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'hotel',
  region TEXT,
  address TEXT,
  phone TEXT,
  maps_url TEXT,
  website_url TEXT,
  domain TEXT,
  name_slug TEXT,
  confidence_score SMALLINT DEFAULT 0,
  best_contact_method TEXT CHECK (best_contact_method IN ('email','form','unknown')) DEFAULT 'unknown',
  best_email TEXT,
  email_priority SMALLINT,
  application_form_url TEXT,
  careers_page_url TEXT,
  evidence_excerpt TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  priority SMALLINT NOT NULL,
  source_url TEXT,
  found_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_hash TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  provider_job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  job_url TEXT NOT NULL,
  apply_url TEXT,
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  employment_type TEXT,
  salary_text TEXT,
  language_requirements TEXT,
  raw_description TEXT,
  normalized_summary TEXT,
  requirement_summary TEXT,
  experience_signals_json JSONB,
  housing_status TEXT CHECK (housing_status IN ('yes','maybe','no','unknown')) DEFAULT 'unknown',
  housing_confidence SMALLINT DEFAULT 0,
  housing_evidence TEXT,
  pair_friendliness_status TEXT CHECK (pair_friendliness_status IN ('yes','maybe','no','unknown')) DEFAULT 'unknown',
  pair_friendliness_score SMALLINT DEFAULT 0,
  pair_friendliness_evidence TEXT,
  english_friendly_status TEXT CHECK (english_friendly_status IN ('yes','maybe','no','unknown')) DEFAULT 'unknown',
  icelandic_required_status TEXT CHECK (icelandic_required_status IN ('yes','no','unknown')) DEFAULT 'unknown',
  junior_fit_score SMALLINT DEFAULT 50,
  priority_score SMALLINT DEFAULT 50,
  review_status TEXT CHECK (review_status IN ('new','saved','applied','rejected')) DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  source_url TEXT,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger TEXT CHECK (trigger IN ('cron','manual')) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  providers_run TEXT[] NOT NULL DEFAULT '{}',
  total_fetched INTEGER DEFAULT 0,
  new_jobs INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  errors_json JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('running','completed','failed')) DEFAULT 'running'
);

CREATE TABLE parse_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id UUID REFERENCES sync_runs(id),
  provider TEXT NOT NULL,
  job_url TEXT,
  error_type TEXT,
  message TEXT,
  raw_data TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outreach_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  batch_id TEXT,
  notes TEXT
);

CREATE TABLE outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  bcc_emails TEXT[] NOT NULL,
  gmail_draft_id TEXT,
  mailto_fallback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
