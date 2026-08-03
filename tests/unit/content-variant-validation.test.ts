import { describe, expect, it } from 'vitest'
import { statusAfterVariantEdit, validateContentVariant } from '../../src/main/domain/content-variant-validation'

describe('content variant validation', () => {
  it('warns without rejecting platform-length violations', () => {
    const warnings = validateContentVariant('x', 'x'.repeat(281), {})
    expect(warnings).toContainEqual(expect.objectContaining({ code: 'PLATFORM_CHARACTER_LIMIT', severity: 'warning' }))
  })

  it('warns about unsupported factual claims', () => {
    const warnings = validateContentVariant('facebook', 'Save 25% with code PIZZA25 on our award-winning gluten-free pizza.', {})
    expect(warnings.map(({ code }) => code)).toEqual(expect.arrayContaining(['UNVERIFIED_DISCOUNT', 'UNVERIFIED_COUPON', 'UNVERIFIED_SUPERLATIVE', 'UNVERIFIED_DIETARY_OR_HEALTH']))
  })

  it('does not warn when the claim is represented in source facts', () => {
    const warnings = validateContentVariant('instagram', 'Use coupon code PIZZA25 for 25% off our gluten-free pizza.', { promotion: 'Coupon code PIZZA25 gives 25% off', dietary: 'gluten-free' })
    expect(warnings.filter(({ code }) => code !== 'UNVERIFIED_DISCOUNT')).toEqual([])
  })

  it('resets edited review copy to draft and blocks immutable lifecycle states', () => {
    expect(statusAfterVariantEdit('ready_for_review')).toBe('draft')
    expect(statusAfterVariantEdit('draft')).toBe('draft')
    expect(() => statusAfterVariantEdit('approved')).toThrow(/Only draft or ready-for-review/)
    expect(() => statusAfterVariantEdit('scheduled')).toThrow(/Only draft or ready-for-review/)
    expect(() => statusAfterVariantEdit('published')).toThrow(/Only draft or ready-for-review/)
  })
})
