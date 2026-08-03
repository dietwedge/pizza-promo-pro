import type { z } from 'zod'
import type { contentWarningSchema, socialPlatformSchema } from '../../shared/contracts'
import type { ContentStatus } from './content-status'

type Platform = z.infer<typeof socialPlatformSchema>
export type ContentWarning = z.infer<typeof contentWarningSchema>

const limits: Record<Platform, number> = {
  x: 280,
  instagram: 2_200,
  facebook: 63_206,
  threads: 500,
  tiktok: 2_200,
  google_business_profile: 1_500,
  youtube_shorts: 100
}

const riskyClaims = [
  { code: 'UNVERIFIED_PRICE', label: 'price', pattern: /(?:\$\s?\d+(?:\.\d{1,2})?|\b\d+(?:\.\d{1,2})?\s?(?:dollars?|usd)\b)/gi },
  { code: 'UNVERIFIED_DISCOUNT', label: 'discount', pattern: /\b\d+(?:\.\d+)?\s?%|\b(?:percent|discount|save)\b/gi },
  { code: 'UNVERIFIED_COUPON', label: 'coupon or promotional code', pattern: /\b(?:coupon|promo(?:tional)?\s+code|code\s+[a-z0-9-]+)\b/gi },
  { code: 'UNVERIFIED_HOURS', label: 'business hours', pattern: /\b(?:open|closed|hours?|\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/gi },
  { code: 'UNVERIFIED_SUPERLATIVE', label: 'free, award, or “best” claim', pattern: /\b(?:free|best|award(?:ed|s|[- ]winning)?)\b/gi },
  { code: 'UNVERIFIED_DIETARY_OR_HEALTH', label: 'dietary or health claim', pattern: /\b(?:gluten[- ]free|vegan|vegetarian|keto|healthy|healthier|low[- ](?:fat|carb|calorie)|organic|allergen[- ]free|dairy[- ]free|nut[- ]free)\b/gi }
] as const

function normalized(value: string): string { return value.toLowerCase().replace(/[^a-z0-9%$]+/g, ' ').replace(/\s+/g, ' ').trim() }

export function validateContentVariant(platform: Platform, copy: string, sourceFacts: unknown): ContentWarning[] {
  const warnings: ContentWarning[] = []
  const limit = limits[platform]
  if (copy.length > limit) warnings.push({ code: 'PLATFORM_CHARACTER_LIMIT', message: `This ${platform.replaceAll('_', ' ')} version is ${copy.length} characters; the platform limit is ${limit}.`, severity: 'warning' })

  const facts = normalized(JSON.stringify(sourceFacts ?? {}))
  for (const claim of riskyClaims) {
    const matches = [...copy.matchAll(claim.pattern)].map((match) => normalized(match[0])).filter(Boolean)
    const unsupported = matches.filter((match) => !facts.includes(match))
    if (unsupported.length) warnings.push({ code: claim.code, message: `Check the ${claim.label} against saved business facts before approval.`, severity: 'warning' })
  }
  return warnings
}

export function statusAfterVariantEdit(status: ContentStatus): 'draft' {
  if (status !== 'draft' && status !== 'ready_for_review') throw new Error('Only draft or ready-for-review content can be edited.')
  return 'draft'
}
