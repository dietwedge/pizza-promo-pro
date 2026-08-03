import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`)
}

export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(), name: text('name').notNull(), legalName: text('legal_name'), website: text('website'), phone: text('phone'), email: text('email'), ...timestamps
})
export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), name: text('name').notNull(), addressLine1: text('address_line_1').notNull(), addressLine2: text('address_line_2'), city: text('city').notNull(), region: text('region').notNull(), postalCode: text('postal_code').notNull(), countryCode: text('country_code').notNull().default('US'), phone: text('phone'), timezone: text('timezone').notNull(), hoursJson: text('hours_json').notNull().default('{}'), ...timestamps
}, (t) => [index('locations_business_idx').on(t.businessId)])
export const brandProfiles = sqliteTable('brand_profiles', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), voice: text('voice').notNull().default(''), audience: text('audience').notNull().default(''), visualStyle: text('visual_style').notNull().default(''), ...timestamps
}, (t) => [uniqueIndex('brand_profiles_business_uidx').on(t.businessId)])
export const brandRules = sqliteTable('brand_rules', {
  id: text('id').primaryKey(), brandProfileId: text('brand_profile_id').notNull().references(() => brandProfiles.id, { onDelete: 'cascade' }), ruleType: text('rule_type').notNull(), value: text('value').notNull(), enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true), ...timestamps
}, (t) => [index('brand_rules_profile_idx').on(t.brandProfileId)])
export const menuCategories = sqliteTable('menu_categories', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), name: text('name').notNull(), description: text('description'), sortOrder: integer('sort_order').notNull().default(0), active: integer('active', { mode: 'boolean' }).notNull().default(true), ...timestamps
}, (t) => [index('menu_categories_business_idx').on(t.businessId)])
export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey(), categoryId: text('category_id').notNull().references(() => menuCategories.id, { onDelete: 'cascade' }), name: text('name').notNull(), description: text('description'), priceCents: integer('price_cents').notNull(), currency: text('currency').notNull().default('USD'), ingredientsJson: text('ingredients_json').notNull().default('[]'), allergenJson: text('allergen_json').notNull().default('[]'), active: integer('active', { mode: 'boolean' }).notNull().default(true), ...timestamps
}, (t) => [index('menu_items_category_idx').on(t.categoryId)])
export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), kind: text('kind').notNull(), localPath: text('local_path').notNull(), originalFilename: text('original_filename').notNull(), mimeType: text('mime_type').notNull(), byteSize: integer('byte_size').notNull(), width: integer('width'), height: integer('height'), durationMs: integer('duration_ms'), checksumSha256: text('checksum_sha256'), source: text('source').notNull().default('import'), metadataJson: text('metadata_json').notNull().default('{}'), ...timestamps
}, (t) => [index('media_assets_business_idx').on(t.businessId), uniqueIndex('media_assets_path_uidx').on(t.localPath)])
export const menuItemMedia = sqliteTable('menu_item_media', {
  id: text('id').primaryKey(), menuItemId: text('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }), mediaAssetId: text('media_asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }), sortOrder: integer('sort_order').notNull().default(0), ...timestamps
}, (t) => [uniqueIndex('menu_item_media_pair_uidx').on(t.menuItemId, t.mediaAssetId)])
export const promotions = sqliteTable('promotions', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), name: text('name').notNull(), description: text('description').notNull(), couponCode: text('coupon_code'), startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(), endsAt: integer('ends_at', { mode: 'timestamp_ms' }).notNull(), terms: text('terms'), active: integer('active', { mode: 'boolean' }).notNull().default(true), ...timestamps
}, (t) => [index('promotions_business_dates_idx').on(t.businessId, t.startsAt, t.endsAt)])
export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), name: text('name').notNull(), objective: text('objective'), startsAt: integer('starts_at', { mode: 'timestamp_ms' }), endsAt: integer('ends_at', { mode: 'timestamp_ms' }), status: text('status').notNull().default('draft'), ...timestamps
}, (t) => [index('campaigns_business_idx').on(t.businessId)])
export const contentItems = sqliteTable('content_items', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }), promotionId: text('promotion_id').references(() => promotions.id, { onDelete: 'set null' }), title: text('title').notNull(), brief: text('brief').notNull().default(''), status: text('status').notNull().default('idea'), scheduledFor: integer('scheduled_for', { mode: 'timestamp_ms' }), ...timestamps
}, (t) => [index('content_items_business_status_idx').on(t.businessId, t.status), index('content_items_schedule_idx').on(t.scheduledFor)])
export const contentVariants = sqliteTable('content_variants', {
  id: text('id').primaryKey(), contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }), platform: text('platform').notNull(), copy: text('copy').notNull().default(''), metadataJson: text('metadata_json').notNull().default('{}'), ...timestamps
}, (t) => [uniqueIndex('content_variants_item_platform_uidx').on(t.contentItemId, t.platform)])
export const generationJobs = sqliteTable('generation_jobs', {
  id: text('id').primaryKey(), contentItemId: text('content_item_id').references(() => contentItems.id, { onDelete: 'set null' }), provider: text('provider').notNull(), model: text('model').notNull(), prompt: text('prompt').notNull(), sourceAssetIdsJson: text('source_asset_ids_json').notNull().default('[]'), settingsJson: text('settings_json').notNull().default('{}'), status: text('status').notNull().default('queued'), errorMessage: text('error_message'), startedAt: integer('started_at', { mode: 'timestamp_ms' }), completedAt: integer('completed_at', { mode: 'timestamp_ms' }), ...timestamps
}, (t) => [index('generation_jobs_content_idx').on(t.contentItemId)])
export const generationOutputs = sqliteTable('generation_outputs', {
  id: text('id').primaryKey(), generationJobId: text('generation_job_id').notNull().references(() => generationJobs.id, { onDelete: 'cascade' }), mediaAssetId: text('media_asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'restrict' }), providerOutputId: text('provider_output_id'), metadataJson: text('metadata_json').notNull().default('{}'), ...timestamps
}, (t) => [index('generation_outputs_job_idx').on(t.generationJobId)])
export const socialAccounts = sqliteTable('social_accounts', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), platform: text('platform').notNull(), externalAccountId: text('external_account_id').notNull(), displayName: text('display_name').notNull(), credentialKey: text('credential_key'), enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true), ...timestamps
}, (t) => [uniqueIndex('social_accounts_external_uidx').on(t.platform, t.externalAccountId)])
export const scheduledPosts = sqliteTable('scheduled_posts', {
  id: text('id').primaryKey(), contentVariantId: text('content_variant_id').notNull().references(() => contentVariants.id, { onDelete: 'cascade' }), socialAccountId: text('social_account_id').notNull().references(() => socialAccounts.id, { onDelete: 'restrict' }), scheduledFor: integer('scheduled_for', { mode: 'timestamp_ms' }).notNull(), status: text('status').notNull().default('scheduled'), idempotencyKey: text('idempotency_key').notNull(), ...timestamps
}, (t) => [uniqueIndex('scheduled_posts_idempotency_uidx').on(t.idempotencyKey), index('scheduled_posts_due_idx').on(t.status, t.scheduledFor)])
export const publishAttempts = sqliteTable('publish_attempts', {
  id: text('id').primaryKey(), scheduledPostId: text('scheduled_post_id').notNull().references(() => scheduledPosts.id, { onDelete: 'cascade' }), idempotencyKey: text('idempotency_key').notNull(), attemptNumber: integer('attempt_number').notNull(), status: text('status').notNull(), requestJson: text('request_json').notNull().default('{}'), responseJson: text('response_json'), errorMessage: text('error_message'), attemptedAt: integer('attempted_at', { mode: 'timestamp_ms' }).notNull(), ...timestamps
}, (t) => [uniqueIndex('publish_attempts_number_uidx').on(t.scheduledPostId, t.attemptNumber), index('publish_attempts_key_idx').on(t.idempotencyKey)])
export const publishedPosts = sqliteTable('published_posts', {
  id: text('id').primaryKey(), scheduledPostId: text('scheduled_post_id').notNull().references(() => scheduledPosts.id, { onDelete: 'cascade' }), externalPostId: text('external_post_id').notNull(), externalUrl: text('external_url'), publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(), ...timestamps
}, (t) => [uniqueIndex('published_posts_schedule_uidx').on(t.scheduledPostId)])
export const analyticsSnapshots = sqliteTable('analytics_snapshots', {
  id: text('id').primaryKey(), publishedPostId: text('published_post_id').notNull().references(() => publishedPosts.id, { onDelete: 'cascade' }), impressions: integer('impressions'), reach: integer('reach'), engagements: integer('engagements'), clicks: integer('clicks'), rawJson: text('raw_json').notNull().default('{}'), capturedAt: integer('captured_at', { mode: 'timestamp_ms' }).notNull(), ...timestamps
}, (t) => [index('analytics_snapshots_post_time_idx').on(t.publishedPostId, t.capturedAt)])
export const approvalEvents = sqliteTable('approval_events', {
  id: text('id').primaryKey(), contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }), action: text('action').notNull(), actor: text('actor').notNull(), notes: text('notes'), occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(), ...timestamps
}, (t) => [index('approval_events_content_idx').on(t.contentItemId, t.occurredAt)])
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(), valueJson: text('value_json').notNull(), ...timestamps
})
export const backupRecords = sqliteTable('backup_records', {
  id: text('id').primaryKey(), path: text('path').notNull(), status: text('status').notNull(), byteSize: integer('byte_size'), checksumSha256: text('checksum_sha256'), appVersion: text('app_version').notNull(), schemaVersion: integer('schema_version').notNull(), errorMessage: text('error_message'), completedAt: integer('completed_at', { mode: 'timestamp_ms' }), ...timestamps
})
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(), action: text('action').notNull(), entityType: text('entity_type'), entityId: text('entity_id'), actor: text('actor').notNull().default('local-user'), outcome: text('outcome').notNull(), detailsJson: text('details_json').notNull().default('{}'), occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(), ...timestamps
}, (t) => [index('audit_logs_action_time_idx').on(t.action, t.occurredAt)])

export const aiChatThreads = sqliteTable('ai_chat_threads', {
  id: text('id').primaryKey(), title: text('title').notNull(), ...timestamps
})
export const aiChatMessages = sqliteTable('ai_chat_messages', {
  id: text('id').primaryKey(), threadId: text('thread_id').notNull().references(() => aiChatThreads.id, { onDelete: 'cascade' }), role: text('role').notNull(), content: text('content').notNull(), provider: text('provider').notNull(), model: text('model').notNull(), ...timestamps
}, (t) => [index('ai_chat_messages_thread_time_idx').on(t.threadId, t.createdAt)])

export const adAccounts = sqliteTable('ad_accounts', {
  id: text('id').primaryKey(), businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }), provider: text('provider').notNull(), externalAccountId: text('external_account_id').notNull(), displayName: text('display_name').notNull(), capability: text('capability').notNull(), credentialKey: text('credential_key'), ...timestamps
}, (t) => [uniqueIndex('ad_accounts_provider_external_uidx').on(t.provider, t.externalAccountId), index('ad_accounts_business_idx').on(t.businessId)])
export const adCampaignDrafts = sqliteTable('ad_campaign_drafts', {
  id: text('id').primaryKey(), adAccountId: text('ad_account_id').notNull().references(() => adAccounts.id, { onDelete: 'restrict' }), contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'restrict' }), name: text('name').notNull(), objective: text('objective').notNull(), budgetCents: integer('budget_cents').notNull(), audienceJson: text('audience_json').notNull(), placementJson: text('placement_json').notNull(), status: text('status').notNull().default('draft'), approvedAt: integer('approved_at', { mode: 'timestamp_ms' }), ...timestamps
}, (t) => [index('ad_campaign_drafts_account_idx').on(t.adAccountId, t.status), index('ad_campaign_drafts_content_idx').on(t.contentItemId)])

export const performanceSnapshots = sqliteTable('performance_snapshots', {
  id: text('id').primaryKey(),
  sourceType: text('source_type', { enum: ['organic_post', 'ad_campaign'] }).notNull(),
  sourceId: text('source_id').notNull(),
  platform: text('platform').notNull(),
  label: text('label').notNull(),
  impressions: integer('impressions').notNull().default(0),
  reach: integer('reach').notNull().default(0),
  engagements: integer('engagements').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  spendCents: integer('spend_cents'),
  conversions: integer('conversions'),
  revenueCents: integer('revenue_cents'),
  capturedAt: integer('captured_at', { mode: 'timestamp_ms' }).notNull(),
  dataSource: text('data_source', { enum: ['local_sample', 'manual', 'live'] }).notNull(),
  ...timestamps
}, (t) => [uniqueIndex('performance_snapshots_source_capture_uidx').on(t.sourceType, t.sourceId, t.dataSource, t.capturedAt), index('performance_snapshots_capture_idx').on(t.capturedAt), index('performance_snapshots_source_idx').on(t.sourceType, t.sourceId)])

export const businessRelations = relations(businesses, ({ many, one }) => ({ locations: many(locations), brandProfile: one(brandProfiles), campaigns: many(campaigns), contentItems: many(contentItems), mediaAssets: many(mediaAssets) }))
export const contentItemRelations = relations(contentItems, ({ one, many }) => ({ business: one(businesses, { fields: [contentItems.businessId], references: [businesses.id] }), campaign: one(campaigns, { fields: [contentItems.campaignId], references: [campaigns.id] }), variants: many(contentVariants), generationJobs: many(generationJobs), approvalEvents: many(approvalEvents) }))
export const contentVariantRelations = relations(contentVariants, ({ one, many }) => ({ contentItem: one(contentItems, { fields: [contentVariants.contentItemId], references: [contentItems.id] }), scheduledPosts: many(scheduledPosts) }))

export type Business = typeof businesses.$inferSelect
export type NewBusiness = typeof businesses.$inferInsert
export type ContentItem = typeof contentItems.$inferSelect
export type NewContentItem = typeof contentItems.$inferInsert
export type MediaAsset = typeof mediaAssets.$inferSelect
