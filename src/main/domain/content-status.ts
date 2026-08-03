export const contentStatuses = ['idea', 'draft', 'media_generation', 'ready_for_review', 'approved', 'scheduled', 'published', 'failed', 'archived'] as const
export type ContentStatus = (typeof contentStatuses)[number]

const transitions: Readonly<Record<ContentStatus, readonly ContentStatus[]>> = {
  idea: ['draft', 'archived'],
  draft: ['media_generation', 'ready_for_review', 'archived'],
  media_generation: ['draft', 'ready_for_review', 'failed'],
  ready_for_review: ['draft', 'approved', 'archived'],
  approved: ['draft', 'scheduled', 'archived'],
  scheduled: ['approved', 'published', 'failed'],
  published: ['archived'],
  failed: ['draft', 'approved', 'scheduled', 'archived'],
  archived: []
}

export function canTransitionContent(from: ContentStatus, to: ContentStatus): boolean {
  return transitions[from].includes(to)
}

export function assertContentTransition(from: ContentStatus, to: ContentStatus): void {
  if (!canTransitionContent(from, to)) throw new Error(`Invalid content status transition: ${from} -> ${to}`)
}

export function requiresHumanApproval(status: ContentStatus): boolean {
  return status === 'approved' || status === 'scheduled' || status === 'published'
}

