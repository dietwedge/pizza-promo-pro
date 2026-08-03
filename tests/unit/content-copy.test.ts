import { describe, expect, it } from 'vitest'
import { createGroundedCopy } from '../../src/main/domain/content-copy'

describe('grounded platform copy', () => {
  const facts = { menu: { name: 'Cheese Pizza', description: 'House sauce and mozzarella', price_cents: 1299, currency: 'USD' }, promotion: { name: 'Friday offer', description: 'Save $2 on a large pizza', coupon_code: 'FRIDAY2', starts_at: Date.now(), ends_at: Date.now() + 86_400_000 } }

  it('uses verified price and coupon data', () => {
    const copy = createGroundedCopy('facebook', 'Order ahead for dinner.', facts)
    expect(copy).toContain('$12.99')
    expect(copy).toContain('FRIDAY2')
    expect(copy).toContain('Cheese Pizza')
  })

  it('creates platform-specific formatting and respects the X limit', () => {
    expect(createGroundedCopy('instagram', 'Dinner is ready.', {})).toContain('#Pizza')
    expect(createGroundedCopy('x', 'A'.repeat(400), {}).length).toBeLessThanOrEqual(280)
  })

  it('uses planning as direction without publishing the planning notes',()=>{
    const strategy='Post Idea 1: The BOGO Frenzy!\n**Theme:** Drive sales\n**Visual Suggestion:** Two pizzas'
    const copy=createGroundedCopy('facebook',strategy,facts)
    expect(copy).not.toContain('Post Idea')
    expect(copy).not.toContain('Theme')
    expect(copy).not.toContain('Visual Suggestion')
    expect(copy).toContain('Friday offer')
  })
})
