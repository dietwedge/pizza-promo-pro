export type AgentPlatform = 'google_business_profile' | 'facebook' | 'instagram' | 'tiktok' | 'threads' | 'youtube_shorts' | 'x'
export type FactSource = { type: 'business' | 'location' | 'menu_item' | 'promotion' | 'brand_rule'; id: string; label: string; facts: Readonly<Record<string, string | number | boolean | null>> }
export type ContentAgentRequest = { objective: string; platforms: readonly AgentPlatform[]; sources: readonly FactSource[] }
export type ContentAgentResult = { provider: string; concept: string; variants: readonly { platform: AgentPlatform; copy: string }[]; mediaPrompts: readonly { kind: 'image' | 'video'; prompt: string }[]; suggestedTiming: { rationale: string; localHour: number }; sources: readonly FactSource[]; requiresHumanApproval: true }

export interface ContentAgent {
  readonly id: string
  produce(request: ContentAgentRequest): Promise<ContentAgentResult>
}
