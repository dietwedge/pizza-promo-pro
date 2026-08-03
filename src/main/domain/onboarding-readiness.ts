import type { z } from 'zod'
import type { onboardingStatusSchema } from '../../shared/contracts'

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>
export type ReadinessFacts = { dismissed: boolean; business: boolean; location: boolean; brand: boolean; menu: boolean; ai: boolean; organicConnections: boolean; mediaProvider: boolean; adAccounts: boolean }
const essentialIds = ['business', 'location', 'brand', 'menu'] as const
const recommendedIds = ['ai', 'organicConnections'] as const
const definitions = [
  { id: 'business', label: 'Business profile', description: 'Add the shop name and verified contact details.', target: 'businesses' },
  { id: 'location', label: 'Store location', description: 'Add an address, hours, and timezone for accurate posts.', target: 'locations' },
  { id: 'brand', label: 'Brand profile', description: 'Define the voice, audience, and visual direction.', target: 'brandProfiles' },
  { id: 'menu', label: 'Menu facts', description: 'Add at least one active menu item and its verified price.', target: 'menuItems' },
  { id: 'ai', label: 'AI content provider', description: 'Save a local or customer-owned AI model configuration.', target: 'settings' },
  { id: 'organicConnections', label: 'Social accounts', description: 'Prepare at least one organic publishing account.', target: 'settings' },
  { id: 'mediaProvider', label: 'Higgsfield media provider', description: 'Optionally prepare a Higgsfield MCP endpoint.', target: 'settings' },
  { id: 'adAccounts', label: 'Advertising account', description: 'Optionally prepare a separate paid-media account.', target: 'ads' }
] as const

export function deriveOnboardingStatus(facts: ReadinessFacts): OnboardingStatus {
  const essentialComplete = essentialIds.every((id) => facts[id])
  const nextId = essentialIds.find((id) => !facts[id]) ?? recommendedIds.find((id) => !facts[id])
  const completed = definitions.filter(({ id }) => facts[id]).length
  return { dismissed: facts.dismissed, shouldShow: !facts.dismissed && !essentialComplete, essentialComplete, completionPercent: Math.round((completed / definitions.length) * 100), steps: definitions.map((step) => ({ ...step, status: facts[step.id] ? 'complete' : step.id === nextId ? 'next' : 'optional' })) }
}
