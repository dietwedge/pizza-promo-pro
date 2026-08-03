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

  it('requires explicit Higgsfield spend and review confirmation',()=>{
    const input={contentItemId:crypto.randomUUID(),prompt:'Approved visual brief for a pizza special',model:'nano_banana_2_lite',aspectRatio:'1:1',maxCredits:7,confirmSpend:true,confirmReview:true}
    expect(ipcContracts['media:generateHiggsfield'].request.parse(input)).toEqual(input)
    expect(()=>ipcContracts['media:generateHiggsfield'].request.parse({...input,confirmSpend:false})).toThrow()
    expect(()=>ipcContracts['media:generateHiggsfield'].request.parse({...input,confirmReview:false})).toThrow()
    expect(()=>ipcContracts['media:generateHiggsfield'].request.parse({...input,model:'untrusted_model'})).toThrow()
  })

  it('rejects unknown AI providers and empty chat messages', () => {
    expect(() => ipcContracts['ai:saveConfig'].request.parse({ provider: 'mystery-ai', model: 'x' })).toThrow()
    expect(() => ipcContracts['ai:sendChat'].request.parse({ content: ' ' })).toThrow()
    expect(ipcContracts['ai:suggestPromotion'].request.parse({goal:'Bring families in on Tuesday nights'})).toBeTruthy()
    expect(()=>ipcContracts['ai:suggestPromotion'].request.parse({goal:'sale'})).toThrow()
  })

  it('bounds editable variant copy at the IPC boundary', () => {
    const variantId = crypto.randomUUID()
    expect(ipcContracts['content:updateVariant'].request.parse({ variantId, copy: 'A reviewable draft' })).toMatchObject({ variantId })
    expect(() => ipcContracts['content:updateVariant'].request.parse({ variantId, copy: 'x'.repeat(70_001) })).toThrow()
  })

  it('requires reviewed menu prices and explicit content deletion',()=>{
    expect(ipcContracts['menu:previewUrl'].request.parse({url:'https://example.com/menu'})).toBeTruthy()
    expect(()=>ipcContracts['menu:previewUrl'].request.parse({url:'file:///etc/passwd'})).toThrow()
    expect(ipcContracts['menu:importPreview'].request.parse({items:[{name:'Cheese Pizza',description:'Classic',priceCents:1299,currency:'USD'}]})).toBeTruthy()
    expect(()=>ipcContracts['menu:importPreview'].request.parse({items:[{name:'Mystery Pizza',description:'',priceCents:null,currency:'USD'}]})).toThrow()
    const contentItemId=crypto.randomUUID()
    expect(ipcContracts['content:updateDraft'].request.parse({contentItemId,title:'Friday BOGO',brief:'Buy one pizza and receive the verified Friday offer.',regenerateVariants:true})).toBeTruthy()
    expect(()=>ipcContracts['content:delete'].request.parse({contentItemId,confirmDelete:false})).toThrow()
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
