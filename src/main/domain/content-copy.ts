import type { z } from 'zod'
import type { socialPlatformSchema } from '../../shared/contracts'

type Platform = z.infer<typeof socialPlatformSchema>
export type GroundedFacts = { menu?: { name: string; description: string | null; price_cents: number; currency: string }; promotion?: { name: string; description: string; coupon_code: string | null; starts_at: number; ends_at: number } }

function formatPrice(cents: number, currency: string): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100) }

export function createGroundedCopy(platform: Platform, brief: string, facts: GroundedFacts): string {
  const lines = [brief.trim()]
  if (facts.menu) lines.push(`${facts.menu.name}${facts.menu.description ? ` — ${facts.menu.description}` : ''} · ${formatPrice(facts.menu.price_cents, facts.menu.currency)}`)
  if (facts.promotion) lines.push(`${facts.promotion.name}: ${facts.promotion.description}${facts.promotion.coupon_code ? ` Use code ${facts.promotion.coupon_code}.` : ''}`)
  if (platform === 'instagram' || platform === 'tiktok') lines.push('#Pizza')
  if (platform === 'youtube_shorts') lines.unshift('Short video caption:')
  if (platform === 'google_business_profile') lines.unshift('Update from the shop:')
  const copy = lines.join('\n\n')
  return platform === 'x' ? copy.slice(0, 280) : copy
}
