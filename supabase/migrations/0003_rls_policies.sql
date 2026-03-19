-- Enable RLS on all tables
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write all tables (personal tool)
CREATE POLICY "auth_all_employers" ON employers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_employer_contacts" ON employer_contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_jobs" ON jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_job_sources" ON job_sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_sync_runs" ON sync_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_parse_logs" ON parse_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_outreach_selections" ON outreach_selections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_outreach_drafts" ON outreach_drafts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- user_settings scoped to own user_id
CREATE POLICY "own_user_settings" ON user_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
