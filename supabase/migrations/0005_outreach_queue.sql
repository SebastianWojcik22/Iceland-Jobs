-- Outreach queue: one row per individual email to be sent
CREATE TABLE IF NOT EXISTS outreach_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','skipped')),
  template_id TEXT NOT NULL DEFAULT 'hotel_work_housing',
  subject TEXT,
  body_html TEXT,
  gmail_message_id TEXT,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  priority SMALLINT DEFAULT 50,  -- higher = send first
  UNIQUE(employer_id, email)
);

CREATE INDEX IF NOT EXISTS outreach_queue_status ON outreach_queue(status);
CREATE INDEX IF NOT EXISTS outreach_queue_priority ON outreach_queue(priority DESC, queued_at ASC);
