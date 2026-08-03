import { describe, expect, it } from 'vitest'
import { ipcContracts } from '../../src/shared/contracts'

describe('IPC contracts', () => {
  it('rejects unknown entity names', () => {
    expect(() => ipcContracts['data:list'].request.parse({ entity: 'secrets' })).toThrow()
  })

  it('rejects weak publishing idempotency keys', () => {
    expect(() => ipcContracts['mock:publish'].request.parse({ contentItemId: crypto.randomUUID(), idempotencyKey: 'short' })).toThrow()
  })

  it('validates scheduling and supervised publishing requests', () => {
    const contentItemId = crypto.randomUUID()
    expect(ipcContracts['schedule:create'].request.parse({ contentItemId, scheduledFor: Date.now() + 60_000 })).toMatchObject({ contentItemId })
    expect(() => ipcContracts['schedule:create'].request.parse({ contentItemId: 'unsafe', scheduledFor: -1 })).toThrow()
    expect(ipcContracts['publishing:attempt'].request.parse({ scheduledPostId: crypto.randomUUID() })).toBeTruthy()
  })

  it('rejects unknown social platforms and malformed MCP endpoints', () => {
    expect(() => ipcContracts['connections:saveSocial'].request.parse({ platform: 'myspace', displayName: 'Store', accountId: '1' })).toThrow()
    expect(() => ipcContracts['connections:saveHiggsfield'].request.parse({ endpoint: 'not-a-url' })).toThrow()
    expect(ipcContracts['connections:saveHiggsfield'].request.parse({ endpoint: 'https://example.com/mcp', accessToken: '' })).toEqual({ endpoint: 'https://example.com/mcp', accessToken: undefined })
  })

  it('validates Higgsfield account actions without accepting credentials',()=>{
    expect(ipcContracts['higgsfield:getStatus'].request.parse({})).toEqual({})
    expect(ipcContracts['higgsfield:selectWorkspace'].request.parse({workspaceId:'workspace-1'})).toEqual({workspaceId:'workspace-1'})
    expect(()=>ipcContracts['higgsfield:connect'].request.parse({accessToken:'secret'})).toThrow()
  })

  it('rejects unknown AI providers and empty chat messages', () => {
    expect(() => ipcContracts['ai:saveConfig'].request.parse({ provider: 'mystery-ai', model: 'x' })).toThrow()
    expect(() => ipcContracts['ai:sendChat'].request.parse({ content: ' ' })).toThrow()
  })

  it('bounds editable variant copy at the IPC boundary', () => {
    const variantId = crypto.randomUUID()
    expect(ipcContracts['content:updateVariant'].request.parse({ variantId, copy: 'A reviewable draft' })).toMatchObject({ variantId })
    expect(() => ipcContracts['content:updateVariant'].request.parse({ variantId, copy: 'x'.repeat(70_001) })).toThrow()
  })

  it('validates paid-media permissions without exposing launch controls', () => {
    const account = ipcContracts['ads:saveAccount'].request.parse({ provider: 'meta', displayName: 'Downtown Meta Ads', accountId: 'act_123', capability: 'read_only' })
    expect(account.capability).toBe('read_only')
    expect(() => ipcContracts['ads:saveAccount'].request.parse({ provider: 'facebook', displayName: 'Ads', accountId: '1', capability: 'launch' })).toThrow()
    expect(ipcContracts).not.toHaveProperty('ads:launch')
  })

  it('requires two explicit confirmations to approve an ad campaign draft', () => {
    const id = crypto.randomUUID()
    expect(ipcContracts['ads:approveDraft'].request.parse({ id, confirmBudget: true, confirmNoLaunch: true })).toBeTruthy()
    expect(() => ipcContracts['ads:approveDraft'].request.parse({ id, confirmBudget: false, confirmNoLaunch: true })).toThrow()
    expect(() => ipcContracts['ads:approveDraft'].request.parse({ id, confirmBudget: true })).toThrow()
  })

  it('validates campaign draft budgets, audiences, placements, and approved creative ids', () => {
    const input = { adAccountId: crypto.randomUUID(), contentItemId: crypto.randomUUID(), name: 'Neighborhood awareness', objective: 'Reach nearby pizza customers', budgetCents: 2500, audience: ['Five miles from store'], placements: ['Instagram feed'] }
    expect(ipcContracts['ads:saveDraft'].request.parse(input)).toMatchObject({ budgetCents: 2500 })
    expect(() => ipcContracts['ads:saveDraft'].request.parse({ ...input, budgetCents: 0 })).toThrow()
    expect(() => ipcContracts['ads:saveDraft'].request.parse({ ...input, audience: [] })).toThrow()
  })

  it('exposes read-only and local-sample analytics channels with explicit schemas', () => {
    expect(ipcContracts['analytics:getOverview'].request.parse({})).toEqual({})
    expect(ipcContracts['analytics:generateSample'].request.parse({})).toEqual({})
    expect(() => ipcContracts['analytics:getOverview'].request.parse({ providerToken: 'secret' })).toThrow()
  })

  it('strictly validates onboarding dismissal without accepting secrets', () => {
    expect(ipcContracts['onboarding:getStatus'].request.parse({})).toEqual({})
    expect(ipcContracts['onboarding:setDismissed'].request.parse({ dismissed: true })).toEqual({ dismissed: true })
    expect(() => ipcContracts['onboarding:setDismissed'].request.parse({ dismissed: true, apiKey: 'secret' })).toThrow()
  })
})
