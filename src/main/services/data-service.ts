import { randomUUID } from 'node:crypto'
import type { EntityKind } from '../../shared/contracts'
import { getDatabase } from '../database'
import { contentStatuses } from '../domain/content-status'
import { normalizeRecordInput } from '../domain/record-input'

type Definition = { table: string; id: string; columns: readonly string[]; defaults?: Record<string, unknown> }

const definitions: Record<EntityKind, Definition> = {
  businesses: { table: 'businesses', id: 'id', columns: ['name', 'legal_name', 'website', 'phone', 'email'] },
  locations: { table: 'locations', id: 'id', columns: ['business_id', 'name', 'address_line_1', 'address_line_2', 'city', 'region', 'postal_code', 'country_code', 'phone', 'timezone', 'hours_json'], defaults: { country_code: 'US', timezone: 'America/New_York', hours_json: '{}' } },
  brandProfiles: { table: 'brand_profiles', id: 'id', columns: ['business_id', 'voice', 'audience', 'visual_style'] },
  brandRules: { table: 'brand_rules', id: 'id', columns: ['brand_profile_id', 'rule_type', 'value', 'enabled'], defaults: { enabled: 1 } },
  menuCategories: { table: 'menu_categories', id: 'id', columns: ['business_id', 'name', 'description', 'sort_order', 'active'], defaults: { sort_order: 0, active: 1 } },
  menuItems: { table: 'menu_items', id: 'id', columns: ['category_id', 'name', 'description', 'price_cents', 'currency', 'ingredients_json', 'allergen_json', 'active'], defaults: { currency: 'USD', ingredients_json: '[]', allergen_json: '[]', active: 1 } },
  promotions: { table: 'promotions', id: 'id', columns: ['business_id', 'name', 'description', 'coupon_code', 'starts_at', 'ends_at', 'terms', 'active'], defaults: { active: 1 } },
  campaigns: { table: 'campaigns', id: 'id', columns: ['business_id', 'name', 'objective', 'starts_at', 'ends_at', 'status'], defaults: { status: 'draft' } },
  contentItems: { table: 'content_items', id: 'id', columns: ['business_id', 'campaign_id', 'promotion_id', 'title', 'brief', 'status', 'scheduled_for'], defaults: { brief: '', status: 'idea' } },
  contentVariants: { table: 'content_variants', id: 'id', columns: ['content_item_id', 'platform', 'copy', 'metadata_json'], defaults: { copy: '', metadata_json: '{}' } }
}

export function listRecords(entity: EntityKind): Record<string, unknown>[] {
  return getDatabase().prepare(`SELECT * FROM ${definitions[entity].table} ORDER BY updated_at DESC`).all() as Record<string, unknown>[]
}

export function saveRecord(entity: EntityKind, rawValue: Record<string, unknown>): Record<string, unknown> {
  const definition = definitions[entity]
  const value = { ...definition.defaults, ...normalizeRecordInput(rawValue) }
  const database = getDatabase()
  if (definition.columns.includes('business_id') && !value.business_id) {
    const business = database.prepare('SELECT id FROM businesses ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
    if (!business) throw new Error('Create the business profile first.')
    value.business_id = business.id
  }
  if (entity === 'menuItems' && !value.category_id) {
    let category = database.prepare('SELECT id FROM menu_categories ORDER BY sort_order, created_at LIMIT 1').get() as { id: string } | undefined
    if (!category) {
      const business = database.prepare('SELECT id FROM businesses ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
      if (!business) throw new Error('Create the business profile first.')
      const categoryId = randomUUID(), now = Date.now()
      database.prepare('INSERT INTO menu_categories (id, business_id, name, description, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(categoryId, business.id, 'Main menu', 'Default menu category', 0, 1, now, now)
      category = { id: categoryId }
    }
    value.category_id = category.id
  }
  if (entity === 'brandProfiles' && !value.business_id) throw new Error('Create the business profile first.')
  if (entity === 'brandProfiles' && !value.id) {
    const existing=database.prepare('SELECT id FROM brand_profiles WHERE business_id = ?').get(String(value.business_id)) as {id:string}|undefined
    if(existing)value.id=existing.id
  }
  if (entity === 'brandRules' && !value.brand_profile_id) {
    const profile = database.prepare('SELECT id FROM brand_profiles ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
    if (!profile) throw new Error('Create the brand profile before adding brand rules.')
    value.brand_profile_id = profile.id
  }
  if (entity === 'menuItems' && (!Number.isInteger(value.price_cents) || Number(value.price_cents) < 0)) throw new Error('Price must be a valid amount in cents.')
  if (entity === 'promotions' && Number(value.ends_at) <= Number(value.starts_at)) throw new Error('The promotion end must be after its start.')
  if (entity === 'contentItems' && !contentStatuses.includes(String(value.status) as (typeof contentStatuses)[number])) throw new Error('Choose a valid content status.')
  const id = String(value[definition.id] ?? (definition.id === 'key' ? '' : randomUUID()))
  if (!id) throw new Error('A settings key is required.')
  const columns = definition.columns.filter((column) => value[column] !== undefined)
  if (!columns.length) throw new Error('No supported values were provided.')
  const now = Date.now()
  const insertColumns = [definition.id, ...columns, 'created_at', 'updated_at']
  const placeholders = insertColumns.map(() => '?').join(', ')
  const updates = columns.map((column) => `${column}=excluded.${column}`).concat('updated_at=excluded.updated_at').join(', ')
  database.prepare(`INSERT INTO ${definition.table} (${insertColumns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${definition.id}) DO UPDATE SET ${updates}`).run(id, ...columns.map((column) => value[column] as never), now, now)
  audit('record.saved', definition.table, id, { columns })
  return database.prepare(`SELECT * FROM ${definition.table} WHERE ${definition.id} = ?`).get(id) as Record<string, unknown>
}

export function removeRecord(entity: EntityKind, id: string): void {
  const definition = definitions[entity]
  getDatabase().prepare(`DELETE FROM ${definition.table} WHERE ${definition.id} = ?`).run(id)
  audit('record.deleted', definition.table, id, {})
}

export function audit(action: string, entityType: string | null, entityId: string | null, details: unknown): void {
  const now = Date.now()
  getDatabase().prepare('INSERT INTO audit_logs (id, action, entity_type, entity_id, actor, outcome, details_json, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), action, entityType, entityId, 'local-user', 'success', JSON.stringify(details), now, now, now)
}
