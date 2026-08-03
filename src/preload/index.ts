import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi, IpcChannel } from '../shared/contracts'

const allowedChannels = new Set<IpcChannel>([
  'app:getInfo',
  'updates:getStatus',
  'updates:check',
  'updates:download',
  'updates:install',
  'data:list',
  'data:save',
  'data:remove',
  'media:import',
  'media:list',
  'menu:previewUrl',
  'menu:importPreview',
  'backup:create',
  'backup:restore',
  'connections:list',
  'connections:saveSocial',
  'connections:saveHiggsfield',
  'connections:remove',
  'connections:check',
  'higgsfield:getStatus',
  'higgsfield:connect',
  'higgsfield:selectWorkspace',
  'content:listStudio',
  'content:createDraft',
  'content:updateDraft',
  'content:delete',
  'content:transition',
  'content:updateVariant',
  'media:generateForContent',
  'media:listHiggsfieldModels',
  'media:estimateHiggsfield',
  'media:generateHiggsfield',
  'media:openForReview',
  'media:readPreview',
  'agent:producePackage',
  'ai:getConfig',
  'ai:saveConfig',
  'ai:testConnection',
  'ai:listChat',
  'ai:sendChat',
  'ai:suggestPromotion',
  'ai:suggestBrandProfile',
  'ai:clearChat',
  'ai:listModels',
  'schedule:list',
  'schedule:create',
  'publishing:attempt',
  'ads:listAccounts',
  'ads:saveAccount',
  'ads:removeAccount',
  'ads:listDrafts',
  'ads:saveDraft',
  'ads:approveDraft',
  'analytics:getOverview',
  'analytics:generateSample',
  'onboarding:getStatus',
  'onboarding:setDismissed',
  'mock:generate',
  'mock:publish'
])

const api: DesktopApi = {
  async invoke(channel, request) {
    if (!allowedChannels.has(channel)) throw new Error(`Unsupported desktop channel: ${channel}`)
    return ipcRenderer.invoke(channel, request) as never
  }
}

contextBridge.exposeInMainWorld('pizzaSocial', Object.freeze(api))
