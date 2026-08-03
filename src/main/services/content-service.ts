import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database'
import { assertContentTransition, type ContentStatus } from '../domain/content-status'
import { audit } from './data-service'
import type { z } from 'zod'
import type { socialPlatformSchema } from '../../shared/contracts'
import { createGroundedCopy } from '../domain/content-copy'
import { statusAfterVariantEdit, validateContentVariant } from '../domain/content-variant-validation'

type Platform = z.infer<typeof socialPlatformSchema>
type DraftInput = { title: string; brief: string; menuItemId?: string; promotionId?: string; platforms: Platform[] }

const platformNames: Record<Platform, string> = { google_business_profile: 'Google Business Profile', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', threads: 'Threads', youtube_shorts: 'YouTube Shorts', x: 'X' }

function verifiedFacts(menuItemId?: string, promotionId?: string): { menu?: { name: string; description: string | null; price_cents: number; currency: string }; promotion?: { name: string; description: string; coupon_code: string | null; starts_at: number; ends_at: number } } {
  const database = getDatabase()
  const menu = menuItemId ? database.prepare('SELECT name, description, price_cents, currency FROM menu_items WHERE id = ? AND active = 1').get(menuItemId) as { name: string; description: string | null; price_cents: number; currency: string } | undefined : undefined
  if (menuItemId && !menu) throw new Error('The selected menu item is not active or no longer exists.')
  const promotion = promotionId ? database.prepare('SELECT name, description, coupon_code, starts_at, ends_at FROM promotions WHERE id = ? AND active = 1').get(promotionId) as { name: string; description: string; coupon_code: string | null; starts_at: number; ends_at: number } | undefined : undefined
  if (promotionId && !promotion) throw new Error('The selected promotion is not active or no longer exists.')
  if (promotion && promotion.starts_at > Date.now()) throw new Error('The selected promotion has not started yet.')
  if (promotion && promotion.ends_at <= Date.now()) throw new Error('The selected promotion has ended.')
  return { menu, promotion }
}

export function createContentDraft(input: DraftInput): Record<string, unknown> {
  const database = getDatabase(), business = database.prepare('SELECT id FROM businesses ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
  if (!business) throw new Error('Create the business profile before drafting content.')
  const facts = verifiedFacts(input.menuItemId, input.promotionId), id = randomUUID(), now = Date.now()
  const platforms = [...new Set(input.platforms)]
  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('INSERT INTO content_items (id, business_id, promotion_id, title, brief, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, business.id, input.promotionId ?? null, input.title, input.brief, 'draft', now, now)
    const insert = database.prepare('INSERT INTO content_variants (id, content_item_id, platform, copy, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const platform of platforms) insert.run(randomUUID(), id, platform, createGroundedCopy(platform, input.brief, facts), JSON.stringify({ generatedBy: 'grounded-template-v1', platformName: platformNames[platform], sourceMenuItemId: input.menuItemId ?? null, sourcePromotionId: input.promotionId ?? null }), now, now)
    database.exec('COMMIT')
  } catch (error) { database.exec('ROLLBACK'); throw error }
  audit('content.draft.created', 'content_items', id, { platforms, groundedMenuItem: Boolean(facts.menu), groundedPromotion: Boolean(facts.promotion) })
  return getContentStudioItem(id)
}

function getContentStudioItem(id: string): Record<string, unknown> {
  const database = getDatabase(), item = database.prepare('SELECT * FROM content_items WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!item) throw new Error('Content item not found.')
  return { ...item, variants: database.prepare('SELECT id, platform, copy, metadata_json, updated_at FROM content_variants WHERE content_item_id = ? ORDER BY platform').all(id), generationJobs: database.prepare('SELECT gj.id, gj.provider, gj.model, gj.prompt, gj.status, gj.error_message, gj.completed_at, go.media_asset_id FROM generation_jobs gj LEFT JOIN generation_outputs go ON go.generation_job_id=gj.id WHERE gj.content_item_id = ? ORDER BY gj.created_at DESC').all(id) }
}

export function listContentStudio(): Record<string, unknown>[] {
  const rows = getDatabase().prepare('SELECT id FROM content_items ORDER BY updated_at DESC').all() as { id: string }[]
  return rows.map((row) => getContentStudioItem(row.id))
}

export function transitionContent(contentItemId: string, to: ContentStatus, notes?: string): Record<string, unknown> {
  const database = getDatabase(), current = database.prepare('SELECT status FROM content_items WHERE id = ?').get(contentItemId) as { status: ContentStatus } | undefined
  if (!current) throw new Error('Content item not found.')
  assertContentTransition(current.status, to)
  const now = Date.now()
  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?').run(to, now, contentItemId)
    if (to === 'approved') database.prepare('INSERT INTO approval_events (id, content_item_id, action, actor, notes, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), contentItemId, 'approved', 'local-user', notes ?? null, now, now, now)
    database.exec('COMMIT')
  } catch (error) { database.exec('ROLLBACK'); throw error }
  audit('content.status.changed', 'content_items', contentItemId, { from: current.status, to })
  return getContentStudioItem(contentItemId)
}

function variantSourceFacts(metadata: Record<string, unknown>, contentItemId: string): unknown[] {
  const database = getDatabase(), facts: unknown[] = []
  const addMenuFacts = (id: string): void => {
    const menu = database.prepare('SELECT name, description, price_cents, currency FROM menu_items WHERE id = ?').get(id) as { name: string; description: string | null; price_cents: number; currency: string } | undefined
    if (menu) facts.push({ ...menu, displayPrice: `$${(menu.price_cents / 100).toFixed(2)}`, dollarPrice: `${(menu.price_cents / 100).toFixed(2)} dollars` })
  }
  const menuItemId = typeof metadata.sourceMenuItemId === 'string' ? metadata.sourceMenuItemId : undefined
  const promotionId = typeof metadata.sourcePromotionId === 'string' ? metadata.sourcePromotionId : undefined
  if (menuItemId) addMenuFacts(menuItemId)
  const linkedPromotionId = promotionId ?? (database.prepare('SELECT promotion_id FROM content_items WHERE id = ?').get(contentItemId) as { promotion_id?: string | null } | undefined)?.promotion_id ?? undefined
  if (linkedPromotionId) facts.push(database.prepare('SELECT name, description, coupon_code, starts_at, ends_at FROM promotions WHERE id = ?').get(linkedPromotionId))
  if (Array.isArray(metadata.sources)) {
    for (const source of metadata.sources) {
      if (!source || typeof source !== 'object') continue
      const { type, id } = source as { type?: string; id?: string }
      if (!id) continue
      if (type === 'menu_item') addMenuFacts(id)
      if (type === 'promotion') facts.push(database.prepare('SELECT name, description, coupon_code, starts_at, ends_at FROM promotions WHERE id = ?').get(id))
      if (type === 'business') facts.push(database.prepare('SELECT name FROM businesses WHERE id = ?').get(id))
      if (type === 'location') facts.push(database.prepare('SELECT name, hours_json FROM locations WHERE id = ?').get(id))
    }
  }
  return [metadata, ...facts.filter(Boolean)]
}

export function updateContentVariant(variantId: string, copy: string): { variant: Record<string, unknown>; warnings: ReturnType<typeof validateContentVariant> } {
  const database = getDatabase()
  const row = database.prepare(`SELECT cv.id,cv.content_item_id,cv.platform,cv.metadata_json,ci.status
    FROM content_variants cv JOIN content_items ci ON ci.id=cv.content_item_id WHERE cv.id=?`).get(variantId) as { id: string; content_item_id: string; platform: Platform; metadata_json: string; status: ContentStatus } | undefined
  if (!row) throw new Error('Content variant not found.')
  const resultingStatus = statusAfterVariantEdit(row.status)
  let metadata: Record<string, unknown>
  try { metadata = JSON.parse(row.metadata_json) as Record<string, unknown> } catch { metadata = {} }
  const warnings = validateContentVariant(row.platform, copy, variantSourceFacts(metadata, row.content_item_id))
  const now = Date.now(), updatedMetadata = { ...metadata, lastEditedBy: 'local-user' }
  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('UPDATE content_variants SET copy=?,metadata_json=?,updated_at=? WHERE id=?').run(copy, JSON.stringify(updatedMetadata), now, variantId)
    database.prepare('UPDATE content_items SET status=?,updated_at=? WHERE id=?').run(resultingStatus, now, row.content_item_id)
    database.exec('COMMIT')
  } catch (error) { database.exec('ROLLBACK'); throw error }
  audit('content.variant.updated', 'content_variants', variantId, { contentItemId: row.content_item_id, platform: row.platform, characterCount: copy.length, warningCodes: warnings.map(({ code }) => code), reviewReset: row.status === 'ready_for_review' })
  const variant = database.prepare('SELECT id,content_item_id,platform,copy,metadata_json,updated_at FROM content_variants WHERE id=?').get(variantId) as Record<string, unknown>
  return { variant, warnings }
}
