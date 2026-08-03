# Database

## Storage

Pizza Promo Pro stores core data in a local SQLite database accessed through Drizzle ORM and Node's built-in `node:sqlite`. The database lives under Electron's user-data directory. Media files are stored separately in application-controlled directories; SQLite stores normalized paths, checksums, metadata, and relationships rather than large blobs.

## Core entities

- `businesses`
- `locations`
- `brand_profiles`
- `brand_rules`
- `menu_categories`
- `menu_items`
- `menu_item_media`
- `promotions`
- `campaigns`
- `content_items`
- `content_variants`
- `media_assets`
- `generation_jobs`
- `generation_outputs`
- `social_accounts`
- `scheduled_posts`
- `publish_attempts`
- `published_posts`
- `analytics_snapshots`
- `performance_snapshots`
- `approval_events`
- `app_settings`
- `backup_records`
- `audit_logs`
- `ai_chat_threads`
- `ai_chat_messages`

## Data rules

- Use stable identifiers, explicit foreign keys, and created/updated timestamps.
- Enable foreign-key enforcement for every connection.
- Represent money in integer minor units with an explicit currency; never use floating-point prices.
- Store timestamps in UTC and retain the location time zone needed for scheduling and display.
- Validate promotion windows and coupon codes before persistence.
- Preserve platform-specific copy in separate content-variant records.
- Treat approval events, publish attempts, analytics snapshots, and audit logs as historical records.
- Use unique idempotency keys for publish operations.
- Preserve provider, model, prompt, source assets, settings, and output metadata for generation jobs.
- Avoid storing credentials or OAuth tokens in normal tables as readable text.

## Migrations

Schema changes use committed, ordered, versioned Drizzle migrations. The main process runs pending migrations before repositories accept requests. Migrations must be transactional when SQLite permits and must not silently discard user data.

Every migration change should include:

- Generated SQL migration files
- Updated Drizzle schema
- A migration or repository test
- Documentation of destructive or compatibility implications

Never rewrite a migration that may have shipped. Add a new migration instead.

Migration `0002_ai_chat.sql` adds local assistant threads and messages. Messages record the provider and model used for traceability, but never contain API keys.

Paid-media records use separate ad-account and campaign-draft tables. Ad credentials remain in the encrypted credential vault and are never stored in SQLite, included in backups, or exposed to the renderer.

Migration `0004_performance_reporting.sql` adds unified organic and paid performance snapshots. Every record carries a source and provenance label (`local_sample`, `manual`, or `live`). Local samples are deterministic and can only attach to an existing published post or approved ad campaign draft; they never call a provider API.

## Backup and restore

Backups include a consistent SQLite snapshot plus locally managed media and a manifest describing schema/application versions and checksums. Restore validates the manifest, file paths, and compatibility before replacing active data. Restoration should use staging and preserve the current data until the replacement is verified.

Backup records store timestamps, status, destination, application/schema version, and verification outcome. Secrets are excluded unless a later secure export flow is explicitly designed.

## Testing

Repository and migration tests use isolated temporary databases. Tests never connect to a user's production database or live providers. Seed data must be clearly synthetic and deterministic.
