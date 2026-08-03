export interface MediaGenerationRequest {
  jobId: string
  prompt: string
  model: string
  outputKind: 'image' | 'video'
  sourceAssetPaths: readonly string[]
  settings: Readonly<Record<string, unknown>>
}

export interface GeneratedMediaOutput {
  providerOutputId: string
  remoteUrl: string
  mimeType: string
  metadata: Readonly<Record<string, unknown>>
}

export interface MediaGenerationResult {
  provider: string
  outputs: readonly GeneratedMediaOutput[]
}

export interface MediaGenerationProvider {
  readonly id: string
  generate(request: MediaGenerationRequest): Promise<MediaGenerationResult>
}

