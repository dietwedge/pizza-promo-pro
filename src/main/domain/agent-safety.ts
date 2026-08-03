import type { FactSource } from '../providers/content-agent'

const prohibitedPatterns = [/ignore (the |all )?(saved )?facts/i, /invent (a |an )?/i, /award[- ]winning/i, /customer(s)? (say|love|review)/i, /gluten[- ]free/i, /allergen[- ]free/i, /healthy|healthiest/i, /best (pizza|restaurant|in town)/i]

export function assertSafeAgentObjective(objective: string, sources: readonly FactSource[]): void {
  if (prohibitedPatterns.some((pattern) => pattern.test(objective))) throw new Error('The objective contains an unsupported claim or asks the agent to override saved facts. Remove that claim and try again.')
  const priceClaims = objective.match(/[$€£]\s?\d+(?:\.\d{1,2})?/g) ?? []
  const allowedPrices = sources.filter((source) => source.type === 'menu_item').map((source) => `$${(Number(source.facts.priceCents) / 100).toFixed(2)}`)
  if (priceClaims.some((claim) => !allowedPrices.includes(claim.replace(/\s/g, '')))) throw new Error('A price in the objective does not match the selected saved menu facts.')
  const couponMatch = objective.match(/(?:code|coupon)\s+([A-Z0-9_-]{3,})/i)
  const allowedCodes = sources.filter((source) => source.type === 'promotion' && source.facts.couponCode).map((source) => String(source.facts.couponCode).toUpperCase())
  if (couponMatch?.[1] && !allowedCodes.includes(couponMatch[1].toUpperCase())) throw new Error('The coupon code in the objective is not an active saved promotion.')
}
