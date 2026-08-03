import { createGroundedCopy, type GroundedFacts } from '../domain/content-copy'
import type { ContentAgent, ContentAgentRequest, ContentAgentResult } from './content-agent'

export class MockContentAgent implements ContentAgent {
  readonly id = 'mock-content-producer'

  async produce(request: ContentAgentRequest): Promise<ContentAgentResult> {
    const menuSource = request.sources.find((source) => source.type === 'menu_item')
    const promotionSource = request.sources.find((source) => source.type === 'promotion')
    const facts: GroundedFacts = {
      menu: menuSource ? { name: String(menuSource.facts.name), description: menuSource.facts.description ? String(menuSource.facts.description) : null, price_cents: Number(menuSource.facts.priceCents), currency: String(menuSource.facts.currency) } : undefined,
      promotion: promotionSource ? { name: String(promotionSource.facts.name), description: String(promotionSource.facts.description), coupon_code: promotionSource.facts.couponCode ? String(promotionSource.facts.couponCode) : null, starts_at: Number(promotionSource.facts.startsAt), ends_at: Number(promotionSource.facts.endsAt) } : undefined
    }
    const subject = menuSource?.label ?? promotionSource?.label ?? 'the pizza shop'
    return {
      provider: this.id,
      concept: `${subject} content package`.slice(0,140),
      variants: request.platforms.map((platform) => ({ platform, copy: createGroundedCopy(platform, request.objective, facts) })),
      mediaPrompts: [
        { kind: 'image', prompt: `Create a polished social image concept for ${subject}. Match the saved brand style. Do not add prices, text, ingredients, awards, or claims that are not present in the supplied facts.` },
        { kind: 'video', prompt: `Create a short vertical video concept about ${subject}, designed for a pizza shop social post. Treat generated food imagery as illustrative until a human approves it.` }
      ],
      suggestedTiming: { rationale: 'Suggested as an evening planning slot; confirm against the saved location hours before scheduling.', localHour: 17 },
      sources: request.sources,
      requiresHumanApproval: true
    }
  }
}
