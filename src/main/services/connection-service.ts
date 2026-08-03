import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database'
import { ElectronCredentialVault } from './credential-vault'
import { audit } from './data-service'
import type { z } from 'zod'
import type { connectionSchema, socialPlatformSchema } from '../../shared/contracts'

type Connection = z.infer<typeof connectionSchema>
type SocialPlatform = z.infer<typeof socialPlatformSchema>

const vault = new ElectronCredentialVault()
const higgsfieldKey = 'connection.higgsfield_mcp'

function storeSecret(key: string, secret?: string): boolean {
  if (!secret) return false
  vault.set(key, secret)
  return true
}

function hasSecret(key: string): boolean {
  return vault.has(key)
}

export function listConnections(): Connection[] {
  const social = getDatabase().prepare('SELECT id, platform, external_account_id, display_name, credential_key, updated_at FROM social_accounts ORDER BY platform').all() as { id: string; platform: string; external_account_id: string; display_name: string; credential_key: string | null; updated_at: number }[]
  const result: Connection[] = social.map((item) => ({ id: item.id, kind: 'social', provider: item.platform, displayName: item.display_name, accountId: item.external_account_id, status: 'configured', liveEnabled: false, hasSecret: Boolean(item.credential_key && hasSecret(item.credential_key)), updatedAt: item.updated_at }))
  const higgsfield = getDatabase().prepare('SELECT value_json, updated_at FROM app_settings WHERE key = ?').get(higgsfieldKey) as { value_json: string; updated_at: number } | undefined
  if (higgsfield) {
    const value = JSON.parse(higgsfield.value_json) as { endpoint: string }
    result.push({ id: higgsfieldKey, kind: 'higgsfield_mcp', provider: 'higgsfield', displayName: 'Higgsfield MCP', endpoint: value.endpoint, status: 'configured', liveEnabled: false, hasSecret: hasSecret(higgsfieldKey), updatedAt: higgsfield.updated_at })
  }
  return result
}

export function saveSocialConnection(input: { platform: SocialPlatform; displayName: string; accountId: string; accessToken?: string }): Connection {
  const business = getDatabase().prepare('SELECT id FROM businesses ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
  if (!business) throw new Error('Create the business profile before adding social accounts.')
  const existing = getDatabase().prepare('SELECT id, credential_key FROM social_accounts WHERE platform = ? AND external_account_id = ?').get(input.platform, input.accountId) as { id: string; credential_key: string | null } | undefined
  const id = existing?.id ?? randomUUID(), credentialKey = existing?.credential_key ?? `social.${id}`, now = Date.now()
  const secretStored = storeSecret(credentialKey, input.accessToken)
  getDatabase().prepare('INSERT INTO social_accounts (id, business_id, platform, external_account_id, display_name, credential_key, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(platform, external_account_id) DO UPDATE SET display_name=excluded.display_name, credential_key=excluded.credential_key, enabled=1, updated_at=excluded.updated_at').run(id, business.id, input.platform, input.accountId, input.displayName, secretStored || existing?.credential_key ? credentialKey : null, now, now)
  audit('connection.social.saved', 'social_accounts', id, { platform: input.platform, hasSecret: secretStored || hasSecret(credentialKey) })
  return { id, kind: 'social', provider: input.platform, displayName: input.displayName, accountId: input.accountId, status: 'configured', liveEnabled: false, hasSecret: secretStored || hasSecret(credentialKey), updatedAt: now }
}

export function saveHiggsfieldConnection(input: { endpoint: string; accessToken?: string }): Connection {
  const endpoint = new URL(input.endpoint)
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))) throw new Error('Use an HTTPS endpoint, or localhost for development.')
  if (endpoint.username || endpoint.password || endpoint.hash) throw new Error('The endpoint cannot contain credentials or a fragment.')
  const now = Date.now(), secretStored = storeSecret(higgsfieldKey, input.accessToken)
  getDatabase().prepare('INSERT INTO app_settings (key, value_json, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at').run(higgsfieldKey, JSON.stringify({ endpoint: endpoint.toString() }), now, now)
  audit('connection.higgsfield.saved', 'app_settings', higgsfieldKey, { host: endpoint.hostname, hasSecret: secretStored || hasSecret(higgsfieldKey) })
  return { id: higgsfieldKey, kind: 'higgsfield_mcp', provider: 'higgsfield', displayName: 'Higgsfield MCP', endpoint: endpoint.toString(), status: 'configured', liveEnabled: false, hasSecret: secretStored || hasSecret(higgsfieldKey), updatedAt: now }
}

export function removeConnection(id: string, kind: 'social' | 'higgsfield_mcp'): boolean {
  if (kind === 'social') {
    const item = getDatabase().prepare('SELECT credential_key FROM social_accounts WHERE id = ?').get(id) as { credential_key: string | null } | undefined
    getDatabase().prepare('DELETE FROM social_accounts WHERE id = ?').run(id)
    if (item?.credential_key) vault.delete(item.credential_key)
  } else { getDatabase().prepare('DELETE FROM app_settings WHERE key = ?').run(higgsfieldKey); vault.delete(higgsfieldKey) }
  audit('connection.removed', kind, id, {})
  return true
}

export function checkConnection(id: string, kind: 'social' | 'higgsfield_mcp'): { valid: boolean; message: string; liveVerified: boolean } {
  const item = listConnections().find((connection) => connection.id === id && connection.kind === kind)
  if (!item) return { valid: false, message: 'This connection is not configured.', liveVerified: false }
  if (kind === 'higgsfield_mcp' && !item.hasSecret) return { valid: true, message: 'Endpoint saved. Add an access token if your MCP server requires one.', liveVerified: false }
  return { valid: true, message: 'Configuration is complete. Live verification becomes available when the provider adapter is enabled.', liveVerified: false }
}
