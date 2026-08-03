import { describe, expect, it } from 'vitest'
import { sampleMetrics } from '../../src/main/services/analytics-metrics'

describe('local sample analytics', () => {
  it('is deterministic and keeps organic money fields unavailable', () => {
    const id = '00000000-0000-4000-a000-000000000001'
    const first = sampleMetrics('organic_post', id)
    expect(sampleMetrics('organic_post', id)).toEqual(first)
    expect(first.spendCents).toBeNull()
    expect(first.revenueCents).toBeNull()
    expect(first.reach).toBeLessThanOrEqual(first.impressions)
  })

  it('never reports paid sample spend above the approved draft budget', () => {
    const metrics = sampleMetrics('ad_campaign', '00000000-0000-4000-a000-000000000002', 2500)
    expect(metrics.spendCents).toBeLessThanOrEqual(2500)
    expect(metrics.conversions).toBeLessThanOrEqual(metrics.clicks)
  })
})
