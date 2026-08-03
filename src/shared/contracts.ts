import { z } from 'zod'

export const contentStatuses = ['idea', 'draft', 'media_generation', 'ready_for_review', 'approved', 'scheduled', 'published', 'failed', 'archived'] as const
export const contentStatusSchema = z.enum(contentStatuses)
export type ContentStatus = z.infer<typeof contentStatusSchema>

export const entityKinds = ['businesses', 'locations', 'brandProfiles', 'brandRules', 'menuCategories', 'menuItems', 'promotions', 'campaigns', 'contentItems', 'contentVariants'] as const
export const entityKindSchema = z.enum(entityKinds)
export type EntityKind = z.infer<typeof entityKindSchema>

export const idSchema = z.string().uuid()
export const recordSchema = z.record(z.string(), z.unknown())
export const socialPlatforms = ['google_business_profile', 'facebook', 'instagram', 'tiktok', 'threads', 'youtube_shorts', 'x'] as const
export const socialPlatformSchema = z.enum(socialPlatforms)
export const connectionSchema = z.object({ id: z.string(), kind: z.enum(['social', 'higgsfield_mcp']), provider: z.string(), displayName: z.string(), accountId: z.string().optional(), endpoint: z.string().optional(), status: z.enum(['configured', 'needs_setup']), liveEnabled: z.boolean(), hasSecret: z.boolean(), updatedAt: z.number() })
export const contentWarningSchema = z.object({ code: z.string(), message: z.string(), severity: z.literal('warning') })
export const adProviderSchema = z.enum(['meta', 'google_ads', 'tiktok_ads', 'x_ads'])
export const adCapabilitySchema = z.enum(['read_only', 'draft_only'])
export const adAccountSchema = z.object({ id: idSchema, provider: adProviderSchema, displayName: z.string(), accountId: z.string(), capability: adCapabilitySchema, hasSecret: z.boolean(), liveEnabled: z.literal(false), updatedAt: z.number() })
export const adCampaignDraftSchema = z.object({ id: idSchema, adAccountId: idSchema, contentItemId: idSchema, name: z.string(), objective: z.string(), budgetCents: z.number().int().positive(), audience: z.array(z.string()), placements: z.array(z.string()), status: z.enum(['draft', 'approved']), approvedAt: z.number().nullable(), updatedAt: z.number(), liveEnabled: z.literal(false) })
export const performanceSourceTypeSchema = z.enum(['organic_post', 'ad_campaign'])
export const performanceDataSourceSchema = z.enum(['local_sample', 'manual', 'live'])
const optionalAccessTokenSchema = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().min(8).max(8000).optional()
)
export const performanceRowSchema = z.object({
  sourceType: performanceSourceTypeSchema, sourceId: idSchema, platform: z.string(), label: z.string(),
  impressions: z.number().int().nonnegative(), reach: z.number().int().nonnegative(), engagements: z.number().int().nonnegative(), clicks: z.number().int().nonnegative(),
  spendCents: z.number().int().nonnegative().nullable(), conversions: z.number().int().nonnegative().nullable(), revenueCents: z.number().int().nonnegative().nullable(),
  engagementRate: z.number().nonnegative(), clickThroughRate: z.number().nonnegative(), capturedAt: z.number().int().nonnegative(), dataSource: performanceDataSourceSchema
})
export const performanceOverviewSchema = z.object({
  summary: z.object({ impressions: z.number().int().nonnegative(), reach: z.number().int().nonnegative(), engagements: z.number().int().nonnegative(), clicks: z.number().int().nonnegative(), spendCents: z.number().int().nonnegative(), conversions: z.number().int().nonnegative(), revenueCents: z.number().int().nonnegative(), engagementRate: z.number().nonnegative(), clickThroughRate: z.number().nonnegative(), returnOnAdSpend: z.number().nonnegative().nullable() }),
  rows: z.array(performanceRowSchema),
  freshness: z.object({ generatedAt: z.number().int().nonnegative(), latestCapturedAt: z.number().int().nonnegative().nullable(), dataSources: z.array(performanceDataSourceSchema), hasData: z.boolean(), message: z.string() })
})
export const onboardingStepSchema = z.object({
  id: z.enum(['business', 'location', 'brand', 'menu', 'ai', 'organicConnections', 'mediaProvider', 'adAccounts']),
  label: z.string(), status: z.enum(['complete', 'next', 'optional']), description: z.string(),
  target: z.enum(['businesses', 'locations', 'brandProfiles', 'menuItems', 'settings', 'ads'])
})
export const onboardingStatusSchema = z.object({
  shouldShow: z.boolean(), dismissed: z.boolean(), completionPercent: z.number().int().min(0).max(100),
  essentialComplete: z.boolean(), steps: z.array(onboardingStepSchema).length(8)
})
export const updateStatusSchema = z.object({
  state: z.enum(['idle', 'checking', 'available', 'downloading', 'downloaded', 'up_to_date', 'error', 'unavailable']),
  currentVersion: z.string(), availableVersion: z.string().nullable(), progressPercent: z.number().min(0).max(100).nullable(), message: z.string()
})
export const higgsfieldAccountStatusSchema = z.object({ state:z.enum(['signed_out','needs_workspace','ready','error']),installed:z.boolean(),message:z.string(),workspaces:z.array(z.object({id:z.string(),name:z.string()})),selectedWorkspaceId:z.string().optional() })
export const resultSchema = <T extends z.ZodType>(data: T) => z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), data }),
  z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) })
])

export const ipcContracts = {
  'app:getInfo': { request: z.object({}), response: z.object({ name: z.string(), version: z.string(), online: z.boolean(), platform: z.string() }) },
  'updates:getStatus': { request: z.object({}).strict(), response: updateStatusSchema },
  'updates:check': { request: z.object({}).strict(), response: updateStatusSchema },
  'updates:download': { request: z.object({}).strict(), response: updateStatusSchema },
  'updates:install': { request: z.object({}).strict(), response: updateStatusSchema },
  'data:list': { request: z.object({ entity: entityKindSchema }), response: z.array(recordSchema) },
  'data:save': { request: z.object({ entity: entityKindSchema, value: recordSchema }), response: recordSchema },
  'data:remove': { request: z.object({ entity: entityKindSchema, id: idSchema }), response: z.object({ id: idSchema }) },
  'media:import': { request: z.object({}), response: z.array(recordSchema) },
  'backup:create': { request: z.object({}), response: z.object({ path: z.string() }) },
  'backup:restore': { request: z.object({}), response: z.object({ restored: z.boolean() }) },
  'connections:list': { request: z.object({}), response: z.array(connectionSchema) },
  'connections:saveSocial': { request: z.object({ platform: socialPlatformSchema, displayName: z.string().trim().min(2).max(120), accountId: z.string().trim().min(1).max(200), accessToken: z.string().max(8000).optional() }), response: connectionSchema },
  'connections:saveHiggsfield': { request: z.object({ endpoint: z.string().url().max(2048), accessToken: optionalAccessTokenSchema }), response: connectionSchema },
  'connections:remove': { request: z.object({ id: z.string().min(1).max(200), kind: z.enum(['social', 'higgsfield_mcp']) }), response: z.object({ removed: z.boolean() }) },
  'connections:check': { request: z.object({ id: z.string().min(1).max(200), kind: z.enum(['social', 'higgsfield_mcp']) }), response: z.object({ valid: z.boolean(), message: z.string(), liveVerified: z.boolean(), serverName: z.string().optional(), serverVersion: z.string().optional(), protocolVersion: z.string().optional(), toolCount: z.number().int().nonnegative().optional() }) },
  'higgsfield:getStatus': { request:z.object({}).strict(), response:higgsfieldAccountStatusSchema },
  'higgsfield:connect': { request:z.object({}).strict(), response:higgsfieldAccountStatusSchema },
  'higgsfield:selectWorkspace': { request:z.object({workspaceId:z.string().trim().min(1).max(200)}).strict(), response:higgsfieldAccountStatusSchema },
  'content:listStudio': { request: z.object({}), response: z.array(recordSchema) },
  'content:createDraft': { request: z.object({ title: z.string().trim().min(3).max(140), brief: z.string().trim().min(10).max(2000), menuItemId: idSchema.optional(), promotionId: idSchema.optional(), platforms: z.array(socialPlatformSchema).min(1) }), response: recordSchema },
  'content:transition': { request: z.object({ contentItemId: idSchema, to: contentStatusSchema, notes: z.string().max(500).optional() }), response: recordSchema },
  'content:updateVariant': { request: z.object({ variantId: idSchema, copy: z.string().max(70_000) }), response: z.object({ variant: recordSchema, warnings: z.array(contentWarningSchema) }) },
  'media:generateForContent': { request: z.object({ contentItemId: idSchema, prompt: z.string().trim().min(10).max(3000) }), response: recordSchema },
  'agent:producePackage': { request: z.object({ objective: z.string().trim().min(10).max(2000), platforms: z.array(socialPlatformSchema).min(1) }), response: recordSchema },
  'ai:getConfig': { request: z.object({}), response: z.object({ provider:z.enum(['local_mock','openai','openai_compatible','ollama']),model:z.string(),endpoint:z.string(),hasApiKey:z.boolean(),liveEnabled:z.boolean(),updatedAt:z.number() }) },
  'ai:saveConfig': { request: z.object({ provider:z.enum(['local_mock','openai','openai_compatible','ollama']),model:z.string().max(200),endpoint:z.string().max(2048).optional(),apiKey:z.string().max(8000).optional() }), response: recordSchema },
  'ai:testConnection': { request: z.object({}), response: z.object({success:z.boolean(),message:z.string()}) },
  'ai:listChat': { request: z.object({}), response: z.array(recordSchema) },
  'ai:sendChat': { request: z.object({content:z.string().trim().min(2).max(4000)}), response: recordSchema },
  'ai:clearChat': { request: z.object({}), response: z.object({cleared:z.boolean()}) },
  'ai:listModels': { request: z.object({}), response: z.array(z.string()) },
  'schedule:list': { request: z.object({}), response: z.array(recordSchema) },
  'schedule:create': { request: z.object({ contentItemId:idSchema, scheduledFor:z.number().int().positive() }), response: z.array(recordSchema) },
  'publishing:attempt': { request: z.object({ scheduledPostId:idSchema }), response: recordSchema },
  'ads:listAccounts': { request: z.object({}), response: z.array(adAccountSchema) },
  'ads:saveAccount': { request: z.object({ provider: adProviderSchema, displayName: z.string().trim().min(2).max(120), accountId: z.string().trim().min(1).max(200), capability: adCapabilitySchema, credential: z.string().max(8000).optional() }), response: adAccountSchema },
  'ads:removeAccount': { request: z.object({ id: idSchema }), response: z.object({ removed: z.boolean() }) },
  'ads:listDrafts': { request: z.object({}), response: z.array(adCampaignDraftSchema) },
  'ads:saveDraft': { request: z.object({ id: idSchema.optional(), adAccountId: idSchema, contentItemId: idSchema, name: z.string().trim().min(3).max(140), objective: z.string().trim().min(3).max(500), budgetCents: z.number().int().positive().max(100_000_000), audience: z.array(z.string().trim().min(1).max(200)).min(1).max(50), placements: z.array(z.string().trim().min(1).max(100)).min(1).max(30) }), response: adCampaignDraftSchema },
  'ads:approveDraft': { request: z.object({ id: idSchema, confirmBudget: z.literal(true), confirmNoLaunch: z.literal(true) }), response: adCampaignDraftSchema },
  'analytics:getOverview': { request: z.object({}).strict(), response: performanceOverviewSchema },
  'analytics:generateSample': { request: z.object({}).strict(), response: performanceOverviewSchema },
  'onboarding:getStatus': { request: z.object({}).strict(), response: onboardingStatusSchema },
  'onboarding:setDismissed': { request: z.object({ dismissed: z.boolean() }).strict(), response: onboardingStatusSchema },
  'mock:generate': { request: z.object({ prompt: z.string().min(3), contentItemId: idSchema.optional() }), response: recordSchema },
  'mock:publish': { request: z.object({ contentItemId: idSchema, idempotencyKey: z.string().min(8) }), response: recordSchema }
} as const

export type IpcChannel = keyof typeof ipcContracts
export type DesktopApi = {
  invoke: <C extends IpcChannel>(channel: C, request: unknown) => Promise<{ ok: true; data: unknown } | { ok: false; error: { code: string; message: string } }>
}
