import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database'
import { audit } from './data-service'
import { ElectronCredentialVault } from './credential-vault'
import type { z } from 'zod'
import type { adAccountSchema, adCampaignDraftSchema, adCapabilitySchema, adProviderSchema } from '../../shared/contracts'

type AdAccount = z.infer<typeof adAccountSchema>
type AdCampaignDraft = z.infer<typeof adCampaignDraftSchema>
type AdProvider = z.infer<typeof adProviderSchema>
type AdCapability = z.infer<typeof adCapabilitySchema>
const vault = new ElectronCredentialVault()

function mapAccount(row: Record<string, unknown>): AdAccount {
  const credentialKey = row.credential_key as string | null
  return { id: row.id as string, provider: row.provider as AdProvider, displayName: row.display_name as string, accountId: row.external_account_id as string, capability: row.capability as AdCapability, hasSecret: Boolean(credentialKey && vault.has(credentialKey)), liveEnabled: false, updatedAt: row.updated_at as number }
}

function mapDraft(row: Record<string, unknown>): AdCampaignDraft {
  return { id: row.id as string, adAccountId: row.ad_account_id as string, contentItemId: row.content_item_id as string, name: row.name as string, objective: row.objective as string, budgetCents: row.budget_cents as number, audience: JSON.parse(row.audience_json as string) as string[], placements: JSON.parse(row.placement_json as string) as string[], status: row.status as 'draft' | 'approved', approvedAt: row.approved_at as number | null, updatedAt: row.updated_at as number, liveEnabled: false }
}

export function listAdAccounts(): AdAccount[] {
  return (getDatabase().prepare('SELECT * FROM ad_accounts ORDER BY provider, display_name').all() as Record<string, unknown>[]).map(mapAccount)
}

export function saveAdAccount(input: { provider: AdProvider; displayName: string; accountId: string; capability: AdCapability; credential?: string }): AdAccount {
  const business = getDatabase().prepare('SELECT id FROM businesses ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
  if (!business) throw new Error('Create the business profile before adding an advertising account.')
  const existing = getDatabase().prepare('SELECT id, credential_key FROM ad_accounts WHERE provider = ? AND external_account_id = ?').get(input.provider, input.accountId) as { id: string; credential_key: string | null } | undefined
  const id = existing?.id ?? randomUUID(), credentialKey = existing?.credential_key ?? `ads.${id}`, now = Date.now()
  if (input.credential) vault.set(credentialKey, input.credential)
  const storedKey = input.credential || existing?.credential_key ? credentialKey : null
  getDatabase().prepare('INSERT INTO ad_accounts (id, business_id, provider, external_account_id, display_name, capability, credential_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(provider, external_account_id) DO UPDATE SET display_name=excluded.display_name, capability=excluded.capability, credential_key=excluded.credential_key, updated_at=excluded.updated_at').run(id, business.id, input.provider, input.accountId, input.displayName, input.capability, storedKey, now, now)
  audit('ads.account.saved', 'ad_accounts', id, { provider: input.provider, capability: input.capability, hasSecret: Boolean(storedKey && vault.has(storedKey)), liveEnabled: false })
  return mapAccount(getDatabase().prepare('SELECT * FROM ad_accounts WHERE id = ?').get(id) as Record<string, unknown>)
}

export function removeAdAccount(id: string): boolean {
  const account = getDatabase().prepare('SELECT credential_key FROM ad_accounts WHERE id = ?').get(id) as { credential_key: string | null } | undefined
  if (!account) return false
  const drafts = getDatabase().prepare('SELECT COUNT(*) AS count FROM ad_campaign_drafts WHERE ad_account_id = ?').get(id) as { count: number }
  if (drafts.count > 0) throw new Error('Remove this account’s campaign drafts before removing the advertising account.')
  getDatabase().prepare('DELETE FROM ad_accounts WHERE id = ?').run(id)
  if (account.credential_key) vault.delete(account.credential_key)
  audit('ads.account.removed', 'ad_accounts', id, {})
  return true
}

export function listAdDrafts(): AdCampaignDraft[] {
  return (getDatabase().prepare('SELECT * FROM ad_campaign_drafts ORDER BY updated_at DESC').all() as Record<string, unknown>[]).map(mapDraft)
}

export function saveAdDraft(input: { id?: string; adAccountId: string; contentItemId: string; name: string; objective: string; budgetCents: number; audience: string[]; placements: string[] }): AdCampaignDraft {
  const account = getDatabase().prepare('SELECT capability FROM ad_accounts WHERE id = ?').get(input.adAccountId) as { capability: AdCapability } | undefined
  if (!account) throw new Error('Choose a configured advertising account.')
  if (account.capability !== 'draft_only') throw new Error('This advertising account is read-only. Change its capability before creating campaign drafts.')
  const content = getDatabase().prepare('SELECT status FROM content_items WHERE id = ?').get(input.contentItemId) as { status: string } | undefined
  if (!content || !['approved', 'scheduled', 'published'].includes(content.status)) throw new Error('Ad creative must use an approved content item.')
  const existing = input.id ? getDatabase().prepare('SELECT status FROM ad_campaign_drafts WHERE id = ?').get(input.id) as { status: string } | undefined : undefined
  if (input.id && !existing) throw new Error('This campaign draft could not be found.')
  if (existing?.status === 'approved') throw new Error('Approved campaign drafts cannot be edited. Create a new draft for budget or delivery changes.')
  const id = input.id ?? randomUUID(), now = Date.now()
  getDatabase().prepare('INSERT INTO ad_campaign_drafts (id, ad_account_id, content_item_id, name, objective, budget_cents, audience_json, placement_json, status, approved_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?) ON CONFLICT(id) DO UPDATE SET ad_account_id=excluded.ad_account_id, content_item_id=excluded.content_item_id, name=excluded.name, objective=excluded.objective, budget_cents=excluded.budget_cents, audience_json=excluded.audience_json, placement_json=excluded.placement_json, updated_at=excluded.updated_at').run(id, input.adAccountId, input.contentItemId, input.name, input.objective, input.budgetCents, JSON.stringify(input.audience), JSON.stringify(input.placements), 'draft', now, now)
  audit('ads.campaign_draft.saved', 'ad_campaign_drafts', id, { budgetCents: input.budgetCents, liveEnabled: false })
  return mapDraft(getDatabase().prepare('SELECT * FROM ad_campaign_drafts WHERE id = ?').get(id) as Record<string, unknown>)
}

export function approveAdDraft(id: string): AdCampaignDraft {
  const row = getDatabase().prepare('SELECT * FROM ad_campaign_drafts WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) throw new Error('This campaign draft could not be found.')
  if (row.status === 'approved') return mapDraft(row)
  const now = Date.now()
  getDatabase().prepare("UPDATE ad_campaign_drafts SET status = 'approved', approved_at = ?, updated_at = ? WHERE id = ? AND status = 'draft'").run(now, now, id)
  audit('ads.campaign_draft.approved', 'ad_campaign_drafts', id, { budgetCents: row.budget_cents, confirmedNoLaunch: true })
  return mapDraft(getDatabase().prepare('SELECT * FROM ad_campaign_drafts WHERE id = ?').get(id) as Record<string, unknown>)
}
