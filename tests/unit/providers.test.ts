import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockMediaGenerationProvider } from '../../src/main/providers/mock-media-generation-provider'
import { MockSocialPublisher } from '../../src/main/providers/mock-social-publisher'
import { MockAiModelProvider } from '../../src/main/providers/mock-ai-model-provider'
import { RemoteAiModelProvider } from '../../src/main/providers/remote-ai-model-provider'

describe('mock providers', () => {
  afterEach(()=>vi.unstubAllGlobals())
  it('generates deterministic mock media metadata', async () => {
    const provider = new MockMediaGenerationProvider()
    const request = { jobId: 'job-1', prompt: 'A pizza box on the counter', model: 'mock-v1', outputKind: 'image' as const, sourceAssetPaths: [], settings: {} }
    expect(await provider.generate(request)).toEqual(await provider.generate(request))
  })

  it('requires approval and idempotency before mock publishing', async () => {
    const publisher = new MockSocialPublisher('instagram')
    const request = { idempotencyKey: 'publish-123', platform: 'instagram', accountId: 'mock', copy: 'Friday special', mediaPaths: [], approved: false }
    await expect(publisher.publish(request)).rejects.toThrow('Human approval')
    await expect(publisher.publish({ ...request, approved: true })).resolves.toMatchObject({ provider: 'mock-social-publisher', status: 'published' })
  })

  it('keeps local AI chat advisory and identifies the local model', async () => {
    const result = await new MockAiModelProvider().complete([{ role: 'system', content: 'Menu facts: []' }, { role: 'user', content: 'Plan Friday content' }])
    expect(result).toMatchObject({ provider: 'local_mock', model: 'local-deterministic-v1' })
    expect(result.text).toContain('will not approve, schedule, or publish')
  })

  it('uses Ollama native chat locally without an API key', async () => {
    const calls:{url:string;init?:RequestInit}[]=[]
    const fetchMock=vi.fn(async(url:string|URL|Request,init?:RequestInit)=>{calls.push({url:String(url),init});return new Response(JSON.stringify({message:{role:'assistant',content:'Local response'}}),{status:200,headers:{'Content-Type':'application/json'}})})
    vi.stubGlobal('fetch',fetchMock)
    const result=await new RemoteAiModelProvider({provider:'ollama',model:'gemma3',endpoint:'http://localhost:11434'}).complete([{role:'user',content:'Hello'}])
    expect(result).toMatchObject({provider:'ollama',model:'gemma3',text:'Local response'})
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/chat',expect.objectContaining({method:'POST'}))
    const headers=calls[0]?.init?.headers as Record<string,string>
    expect(headers.Authorization).toBeUndefined()
  })
})
