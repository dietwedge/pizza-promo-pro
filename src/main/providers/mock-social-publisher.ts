import type { SocialPublisher, SocialPublishRequest, SocialPublishResult } from './social-publisher'

function stableHash(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export class MockSocialPublisher implements SocialPublisher {
  readonly id = 'mock-social-publisher'
  constructor(readonly platform: string) {}

  async publish(request: SocialPublishRequest): Promise<SocialPublishResult> {
    if (!request.approved) throw new Error('Human approval is required before publishing')
    if (!request.idempotencyKey.trim()) throw new Error('An idempotency key is required')
    const fingerprint = stableHash(JSON.stringify({ ...request, scheduledFor: request.scheduledFor?.toISOString() }))
    const scheduled = request.scheduledFor !== undefined && request.scheduledFor.getTime() > Date.now()
    return { provider: this.id, status: scheduled ? 'scheduled' : 'published', externalPostId: `mock-post-${fingerprint}`, externalUrl: `mock://social/${this.platform}/${fingerprint}`, publishedAt: scheduled ? undefined : new Date(0), metadata: { mocked: true, idempotencyKey: request.idempotencyKey } }
  }
}

