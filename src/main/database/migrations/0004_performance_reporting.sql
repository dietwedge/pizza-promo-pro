CREATE TABLE performance_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('organic_post', 'ad_campaign')),
  source_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  label TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  reach INTEGER NOT NULL DEFAULT 0 CHECK (reach >= 0),
  engagements INTEGER NOT NULL DEFAULT 0 CHECK (engagements >= 0),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  spend_cents INTEGER CHECK (spend_cents IS NULL OR spend_cents >= 0),
  conversions INTEGER CHECK (conversions IS NULL OR conversions >= 0),
  revenue_cents INTEGER CHECK (revenue_cents IS NULL OR revenue_cents >= 0),
  captured_at INTEGER NOT NULL,
  data_source TEXT NOT NULL CHECK (data_source IN ('local_sample', 'manual', 'live')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
);
CREATE UNIQUE INDEX performance_snapshots_source_capture_uidx ON performance_snapshots(source_type, source_id, data_source, captured_at);
CREATE INDEX performance_snapshots_capture_idx ON performance_snapshots(captured_at);
CREATE INDEX performance_snapshots_source_idx ON performance_snapshots(source_type, source_id);
