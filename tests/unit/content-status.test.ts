import { describe, expect, it } from 'vitest'
import { assertContentTransition, canTransitionContent, requiresHumanApproval } from '../../src/main/domain/content-status'

describe('content status workflow', () => {
  it('allows the documented happy path', () => {
    expect(canTransitionContent('idea', 'draft')).toBe(true)
    expect(canTransitionContent('ready_for_review', 'approved')).toBe(true)
    expect(canTransitionContent('approved', 'scheduled')).toBe(true)
    expect(canTransitionContent('scheduled', 'published')).toBe(true)
  })

  it('rejects bypassing human review', () => {
    expect(() => assertContentTransition('draft', 'published')).toThrow('Invalid content status transition')
    expect(requiresHumanApproval('scheduled')).toBe(true)
  })
})
