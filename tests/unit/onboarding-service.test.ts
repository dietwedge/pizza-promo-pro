import { describe, expect, it } from 'vitest'
import { deriveOnboardingStatus, type ReadinessFacts } from '../../src/main/domain/onboarding-readiness'

const empty: ReadinessFacts = { dismissed: false, business: false, location: false, brand: false, menu: false, ai: false, organicConnections: false, mediaProvider: false, adAccounts: false }
describe('onboarding readiness', () => {
  it('guides the first incomplete essential step', () => {
    const status = deriveOnboardingStatus({ ...empty, business: true })
    expect(status).toMatchObject({ shouldShow: true, essentialComplete: false, completionPercent: 13 })
    expect(status.steps.find((step) => step.status === 'next')?.id).toBe('location')
    expect(JSON.stringify(status)).not.toContain('apiKey')
  })
  it('recommends AI after essential setup and stops auto-showing', () => {
    const status = deriveOnboardingStatus({ ...empty, business: true, location: true, brand: true, menu: true })
    expect(status).toMatchObject({ essentialComplete: true, shouldShow: false, completionPercent: 50 })
    expect(status.steps.find((step) => step.status === 'next')?.id).toBe('ai')
  })
  it('honors dismissal without changing completion', () => {
    expect(deriveOnboardingStatus({ ...empty, dismissed: true })).toMatchObject({ shouldShow: false, essentialComplete: false, completionPercent: 0 })
  })
})
