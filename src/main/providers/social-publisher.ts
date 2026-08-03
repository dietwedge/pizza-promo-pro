export interface SocialPublishRequest {
  idempotencyKey: string
  platform: string
  accountId: string
  copy: string
  mediaPaths: readonly string[]
  approved: boolean
  scheduledFor?: Date
}

export interface SocialPublishResult {
  provider: string
  status: 'published' | 'scheduled'
  externalPostId: string
  externalUrl?: string
  publishedAt?: Date
  metadata: Readonly<Record<string, unknown>>
}

export interface SocialPublisher {
  readonly id: string
  readonly platform: string
  publish(request: SocialPublishRequest): Promise<SocialPublishResult>
}

