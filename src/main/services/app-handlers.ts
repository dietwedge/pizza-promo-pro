import { app } from 'electron'
import { registerValidatedHandler } from '../ipc'
import { listRecords, removeRecord, saveRecord } from './data-service'
import { importMedia } from './file-service'
import { createBackup, restoreBackup } from './backup-service'
import { MockMediaGenerationProvider } from '../providers/mock-media-generation-provider'
import { MockSocialPublisher } from '../providers/mock-social-publisher'
import type { EntityKind } from '../../shared/contracts'
import { checkConnection, listConnections, removeConnection, saveHiggsfieldConnection, saveSocialConnection } from './connection-service'
import type { z } from 'zod'
import type { socialPlatformSchema } from '../../shared/contracts'
import { createContentDraft, listContentStudio, transitionContent, updateContentVariant } from './content-service'
import type { ContentStatus } from '../domain/content-status'
import { generateForContent } from './generation-service'
import { produceContentPackage } from './agent-service'
import type { AgentPlatform } from '../providers/content-agent'
import { clearChat, getAiConfig, listAiModels, listChatMessages, saveAiConfig, sendChatMessage, testAiConnection } from './ai-service'
import { attemptPublish, createSchedule, listSchedule } from './scheduling-service'
import { approveAdDraft, listAdAccounts, listAdDrafts, removeAdAccount, saveAdAccount, saveAdDraft } from './ad-service'
import type { adCapabilitySchema, adProviderSchema } from '../../shared/contracts'
import { generateSampleAnalytics, getAnalyticsOverview } from './analytics-service'
import { getOnboardingStatus, setOnboardingDismissed } from './onboarding-service'
import { checkForAppUpdate, downloadAppUpdate, getUpdateStatus, installAppUpdate } from './update-service'
import { connectHiggsfield, getHiggsfieldStatus, selectHiggsfieldWorkspace } from './higgsfield-cli-service'
import { estimateHiggsfieldMedia, generateHiggsfieldMedia, getHiggsfieldMediaModels } from './higgsfield-generation-service'
import type { HiggsfieldAspectRatio, HiggsfieldModelId } from '../../shared/higgsfield-models'
import { openMediaForReview } from './media-review-service'

export function registerAppHandlers(): void {
  registerValidatedHandler('app:getInfo', () => ({
    name: 'Pizza Promo Pro',
    version: app.getVersion(),
    online: true,
    platform: process.platform
  }))
  registerValidatedHandler('updates:getStatus', () => getUpdateStatus())
  registerValidatedHandler('updates:check', () => checkForAppUpdate())
  registerValidatedHandler('updates:download', () => downloadAppUpdate())
  registerValidatedHandler('updates:install', () => installAppUpdate())
  registerValidatedHandler('data:list', ({ entity }: { entity: EntityKind }) => listRecords(entity))
  registerValidatedHandler('data:save', ({ entity, value }: { entity: EntityKind; value: Record<string, unknown> }) => saveRecord(entity, value))
  registerValidatedHandler('data:remove', ({ entity, id }: { entity: EntityKind; id: string }) => { removeRecord(entity, id); return { id } })
  registerValidatedHandler('media:import', () => importMedia())
  registerValidatedHandler('backup:create', async () => ({ path: await createBackup() }))
  registerValidatedHandler('backup:restore', async () => ({ restored: await restoreBackup() }))
  registerValidatedHandler('connections:list', () => listConnections())
  registerValidatedHandler('connections:saveSocial', (input: { platform: z.infer<typeof socialPlatformSchema>; displayName: string; accountId: string; accessToken?: string }) => saveSocialConnection(input))
  registerValidatedHandler('connections:saveHiggsfield', (input: { endpoint: string; accessToken?: string }) => saveHiggsfieldConnection(input))
  registerValidatedHandler('connections:remove', ({ id, kind }: { id: string; kind: 'social' | 'higgsfield_mcp' }) => ({ removed: removeConnection(id, kind) }))
  registerValidatedHandler('connections:check', ({ id, kind }: { id: string; kind: 'social' | 'higgsfield_mcp' }) => checkConnection(id, kind))
  registerValidatedHandler('higgsfield:getStatus', () => getHiggsfieldStatus())
  registerValidatedHandler('higgsfield:connect', () => connectHiggsfield())
  registerValidatedHandler('higgsfield:selectWorkspace', ({workspaceId}:{workspaceId:string}) => selectHiggsfieldWorkspace(workspaceId))
  registerValidatedHandler('content:listStudio', () => listContentStudio())
  registerValidatedHandler('content:createDraft', (input: { title: string; brief: string; menuItemId?: string; promotionId?: string; platforms: z.infer<typeof socialPlatformSchema>[] }) => createContentDraft(input))
  registerValidatedHandler('content:transition', ({ contentItemId, to, notes }: { contentItemId: string; to: ContentStatus; notes?: string }) => transitionContent(contentItemId, to, notes))
  registerValidatedHandler('content:updateVariant', ({ variantId, copy }: { variantId: string; copy: string }) => updateContentVariant(variantId, copy))
  registerValidatedHandler('media:generateForContent', ({ contentItemId, prompt }: { contentItemId: string; prompt: string }) => generateForContent(contentItemId, prompt))
  registerValidatedHandler('media:listHiggsfieldModels', () => getHiggsfieldMediaModels())
  registerValidatedHandler('media:estimateHiggsfield', (input:{prompt:string;model:HiggsfieldModelId;aspectRatio:HiggsfieldAspectRatio}) => estimateHiggsfieldMedia(input))
  registerValidatedHandler('media:generateHiggsfield', (input:{contentItemId:string;prompt:string;model:HiggsfieldModelId;aspectRatio:HiggsfieldAspectRatio;maxCredits:number;confirmSpend:true;confirmReview:true}) => generateHiggsfieldMedia(input))
  registerValidatedHandler('media:openForReview', ({mediaAssetId}:{mediaAssetId:string}) => openMediaForReview(mediaAssetId))
  registerValidatedHandler('agent:producePackage', ({ objective, platforms }: { objective: string; platforms: AgentPlatform[] }) => produceContentPackage(objective, platforms))
  registerValidatedHandler('ai:getConfig',()=>getAiConfig())
  registerValidatedHandler('ai:saveConfig',(input:{provider:'local_mock'|'openai'|'openai_compatible'|'ollama';model:string;endpoint?:string;apiKey?:string})=>saveAiConfig(input))
  registerValidatedHandler('ai:testConnection',()=>testAiConnection())
  registerValidatedHandler('ai:listChat',()=>listChatMessages())
  registerValidatedHandler('ai:sendChat',({content}:{content:string})=>sendChatMessage(content))
  registerValidatedHandler('ai:clearChat',()=>({cleared:clearChat()}))
  registerValidatedHandler('ai:listModels',()=>listAiModels())
  registerValidatedHandler('schedule:list',()=>listSchedule())
  registerValidatedHandler('schedule:create',({contentItemId,scheduledFor}:{contentItemId:string;scheduledFor:number})=>createSchedule(contentItemId,scheduledFor))
  registerValidatedHandler('publishing:attempt',({scheduledPostId}:{scheduledPostId:string})=>attemptPublish(scheduledPostId))
  registerValidatedHandler('ads:listAccounts',()=>listAdAccounts())
  registerValidatedHandler('ads:saveAccount',(input:{provider:z.infer<typeof adProviderSchema>;displayName:string;accountId:string;capability:z.infer<typeof adCapabilitySchema>;credential?:string})=>saveAdAccount(input))
  registerValidatedHandler('ads:removeAccount',({id}:{id:string})=>({removed:removeAdAccount(id)}))
  registerValidatedHandler('ads:listDrafts',()=>listAdDrafts())
  registerValidatedHandler('ads:saveDraft',(input:{id?:string;adAccountId:string;contentItemId:string;name:string;objective:string;budgetCents:number;audience:string[];placements:string[]})=>saveAdDraft(input))
  registerValidatedHandler('ads:approveDraft',({id}:{id:string})=>approveAdDraft(id))
  registerValidatedHandler('analytics:getOverview',()=>getAnalyticsOverview())
  registerValidatedHandler('analytics:generateSample',()=>generateSampleAnalytics())
  registerValidatedHandler('onboarding:getStatus',()=>getOnboardingStatus())
  registerValidatedHandler('onboarding:setDismissed',({dismissed}:{dismissed:boolean})=>setOnboardingDismissed(dismissed))
  registerValidatedHandler('mock:generate', async ({ prompt, contentItemId }: { prompt: string; contentItemId?: string }) => new MockMediaGenerationProvider().generate({ jobId: contentItemId ?? crypto.randomUUID(), prompt, model: 'mock-pizza-v1', outputKind: 'image', sourceAssetPaths: [], settings: {} }))
  registerValidatedHandler('mock:publish', async ({ contentItemId, idempotencyKey }: { contentItemId: string; idempotencyKey: string }) => new MockSocialPublisher('google_business_profile').publish({ idempotencyKey, platform: 'google_business_profile', accountId: 'mock-account', copy: `Approved mock post ${contentItemId}`, mediaPaths: [], approved: true }))
}
