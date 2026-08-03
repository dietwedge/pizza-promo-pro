import { getDatabase } from '../database'
import { deriveOnboardingStatus, type OnboardingStatus } from '../domain/onboarding-readiness'

function hasRows(table: string, where = ''): boolean {
  const row = getDatabase().prepare(`SELECT EXISTS(SELECT 1 FROM ${table} ${where}) AS present`).get() as { present: number }
  return Boolean(row.present)
}
function readDismissed(): boolean {
  const row = getDatabase().prepare('SELECT value_json FROM app_settings WHERE key = ?').get('onboarding.dismissed') as { value_json: string } | undefined
  if (!row) return false
  try { return JSON.parse(row.value_json) === true } catch { return false }
}
export function getOnboardingStatus(): OnboardingStatus {
  const database = getDatabase()
  return deriveOnboardingStatus({ dismissed: readDismissed(), business: hasRows('businesses'), location: hasRows('locations'), brand: hasRows('brand_profiles'), menu: hasRows('menu_items', 'WHERE active = 1'), ai: Boolean(database.prepare('SELECT 1 FROM app_settings WHERE key = ?').get('connection.ai_model')), organicConnections: hasRows('social_accounts', 'WHERE enabled = 1'), mediaProvider: Boolean(database.prepare('SELECT 1 FROM app_settings WHERE key = ?').get('connection.higgsfield_mcp')), adAccounts: hasRows('ad_accounts') })
}
export function setOnboardingDismissed(dismissed: boolean): OnboardingStatus {
  const now = Date.now()
  getDatabase().prepare('INSERT INTO app_settings (key,value_json,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run('onboarding.dismissed', JSON.stringify(dismissed), now, now)
  return getOnboardingStatus()
}
