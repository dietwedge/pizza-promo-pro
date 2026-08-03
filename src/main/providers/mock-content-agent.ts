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
    const visualHint=request.objective.match(/(?:visual suggestion|visual direction|visual style)\s*:\s*([^\n#]+)/i)?.[1]?.replaceAll('*','').trim()
    const visualDirection=visualHint??`An authentic, appetizing close view of ${subject} in a real neighborhood pizza-shop setting, with warm directional light, natural texture, confident composition, and restrained Italian red and green brand accents.`
    return {
      provider: this.id,
      concept: `${subject} content package`.slice(0,140),
      creativeBrief:{audience:'The audience described in the campaign direction',message:promotionSource?.label??`A timely reason to choose ${subject}`,tone:'Friendly, direct, and neighborhood-focused',callToAction:'Invite the customer to order or visit',visualDirection},
      variants: request.platforms.map((platform) => ({ platform, copy: createGroundedCopy(platform, request.objective, facts) })),
      mediaPrompts: [
        { kind: 'image', prompt: `${visualDirection} Create a polished social image centered on ${subject}. Do not render prices, offer text, ingredients, awards, or claims unless visibly supported by the supplied reference images. No generic stock-photo styling.` },
        { kind: 'video', prompt: `${visualDirection} Create a short vertical social video with an immediate food-first opening, deliberate close-ups, natural motion, and a clean ending frame. Do not render unverified text or product details. Human review is required.` }
      ],
      suggestedTiming: { rationale: 'Suggested as an evening planning slot; confirm against the saved location hours before scheduling.', localHour: 17 },
      sources: request.sources,
      requiresHumanApproval: true
    }
  }
}
