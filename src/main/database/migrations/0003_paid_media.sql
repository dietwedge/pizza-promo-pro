CREATE TABLE ad_accounts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'google_ads', 'tiktok_ads', 'x_ads')),
  external_account_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  capability TEXT NOT NULL CHECK (capability IN ('read_only', 'draft_only')),
  credential_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, external_account_id)
);

CREATE INDEX ad_accounts_business_idx ON ad_accounts(business_id);

CREATE TABLE ad_campaign_drafts (
  id TEXT PRIMARY KEY,
  ad_account_id TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE RESTRICT,
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  budget_cents INTEGER NOT NULL CHECK (budget_cents > 0),
  audience_json TEXT NOT NULL,
  placement_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved')) DEFAULT 'draft',
  approved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX ad_campaign_drafts_account_idx ON ad_campaign_drafts(ad_account_id, status);
CREATE INDEX ad_campaign_drafts_content_idx ON ad_campaign_drafts(content_item_id);
