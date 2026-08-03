import { createHash } from 'node:crypto'

export type PerformanceSourceType = 'organic_post' | 'ad_campaign'

export function performanceDigest(sourceType: PerformanceSourceType, sourceId: string): Buffer {
  return createHash('sha256').update(`pizza-social-hub:${sourceType}:${sourceId}`).digest()
}

export function stablePerformanceId(sourceType: PerformanceSourceType, sourceId: string): string {
  const hex = performanceDigest(sourceType, sourceId).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function sampleMetrics(sourceType: PerformanceSourceType, sourceId: string, budgetCents = 0) {
  const bytes = performanceDigest(sourceType, sourceId)
  const impressions = 400 + bytes.readUInt16BE(0) % 9601
  const reach = Math.min(impressions, Math.round(impressions * (0.55 + (bytes[2]! % 36) / 100)))
  const engagements = Math.min(reach, 10 + bytes.readUInt16BE(3) % Math.max(11, Math.round(reach * 0.18)))
  const clicks = Math.min(engagements, 3 + bytes.readUInt16BE(5) % Math.max(4, Math.round(engagements * 0.65)))
  if (sourceType === 'organic_post') return { impressions, reach, engagements, clicks, spendCents: null, conversions: null, revenueCents: null }
  const spendCents = Math.min(budgetCents, Math.round(budgetCents * (0.35 + (bytes[7]! % 46) / 100)))
  const conversions = Math.min(clicks, bytes[8]! % Math.max(1, Math.round(clicks * 0.18) + 1))
  const revenueCents = conversions * (1800 + (bytes[9]! % 23) * 100)
  return { impressions, reach, engagements, clicks, spendCents, conversions, revenueCents }
}
