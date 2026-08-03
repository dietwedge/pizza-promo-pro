import type { z } from 'zod'
import type { socialPlatformSchema } from '../../shared/contracts'

type Platform = z.infer<typeof socialPlatformSchema>
export type GroundedFacts = { menu?: { name: string; description: string | null; price_cents: number; currency: string }; promotion?: { name: string; description: string; coupon_code: string | null; starts_at: number; ends_at: number } }

function formatPrice(cents: number, currency: string): string { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100) }
function customerFacingLead(strategy:string):string{
  const value=strategy.toLowerCase()
  if(value.includes('lunch'))return 'Make lunch the easiest decision of the day.'
  if(value.includes('family'))return 'Make the next family pizza night easy.'
  if(value.includes('friday'))return 'Friday calls for pizza.'
  if(value.includes('weekend'))return 'Start the weekend with pizza.'
  if(value.includes('game'))return 'Bring pizza to game time.'
  return 'Your next pizza night starts here.'
}

export function createGroundedCopy(platform: Platform, strategy: string, facts: GroundedFacts): string {
  const lines = [customerFacingLead(strategy)]
  if (facts.menu) lines.push(`${facts.menu.name}${facts.menu.description ? ` — ${facts.menu.description}` : ''} · ${formatPrice(facts.menu.price_cents, facts.menu.currency)}`)
  if (facts.promotion) lines.push(`${facts.promotion.name}: ${facts.promotion.description}${facts.promotion.coupon_code ? ` Use code ${facts.promotion.coupon_code}.` : ''}`)
  if (platform === 'instagram' || platform === 'tiktok') lines.push('#Pizza')
  if (platform === 'youtube_shorts') lines.unshift('Short video caption:')
  if (platform === 'google_business_profile') lines.unshift('Update from the shop:')
  const copy = lines.join('\n\n')
  return platform === 'x' ? copy.slice(0, 280) : copy
}
