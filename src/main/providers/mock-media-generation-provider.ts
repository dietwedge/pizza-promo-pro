import type { MediaGenerationProvider, MediaGenerationRequest, MediaGenerationResult } from './media-generation-provider'

function stableHash(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export class MockMediaGenerationProvider implements MediaGenerationProvider {
  readonly id = 'mock-media-generation'

  async generate(request: MediaGenerationRequest): Promise<MediaGenerationResult> {
    const fingerprint = stableHash(JSON.stringify(request))
    const extension = request.outputKind === 'image' ? 'png' : 'mp4'
    return { provider: this.id, outputs: [{ providerOutputId: `mock-${fingerprint}`, remoteUrl: `mock://generated/${fingerprint}.${extension}`, mimeType: request.outputKind === 'image' ? 'image/png' : 'video/mp4', metadata: { mocked: true, model: request.model, fingerprint } }] }
  }
}

