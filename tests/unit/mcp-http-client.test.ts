import { describe, expect, it, vi } from 'vitest'
import { verifyMcpEndpoint } from '../../src/main/services/mcp-http-client'

function jsonResponse(value: object, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json', ...init.headers }, ...init })
}

describe('MCP Streamable HTTP verification', () => {
  it('initializes a public endpoint and discovers tools without calling them', async () => {
    const calls: Array<{ body: Record<string, unknown>; headers: Headers }> = []
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push({ body: JSON.parse(String(init?.body)) as Record<string, unknown>, headers: new Headers(init?.headers) })
      if (calls.length === 1) return jsonResponse({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'higgsfield', title: 'Higgsfield Media', version: '2.0' } } }, { headers: { 'mcp-session-id': 'session-123' } })
      if (calls.length === 2) return new Response(null, { status: 202 })
      return jsonResponse({ jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'generate_image' }, { name: 'generate_video' }] } })
    }) as typeof fetch

    const result = await verifyMcpEndpoint({ endpoint: 'https://example.com/mcp', clientVersion: '0.1.0', fetcher })

    expect(result).toEqual({ serverName: 'Higgsfield Media', serverVersion: '2.0', protocolVersion: '2025-11-25', toolNames: ['generate_image', 'generate_video'] })
    expect(calls.map(({ body }) => body.method)).toEqual(['initialize', 'notifications/initialized', 'tools/list'])
    expect(calls[0]?.headers.has('authorization')).toBe(false)
    expect(calls[1]?.headers.get('mcp-session-id')).toBe('session-123')
    expect(calls[2]?.headers.get('mcp-protocol-version')).toBe('2025-11-25')
    expect(calls.some(({ body }) => body.method === 'tools/call')).toBe(false)
  })

  it('sends a stored bearer token and accepts an SSE response', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { method: string }
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret-token')
      if (request.method === 'initialize') return new Response('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},"serverInfo":{"name":"server"}}}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } })
      if (request.method === 'notifications/initialized') return new Response(null, { status: 202 })
      return jsonResponse({ jsonrpc: '2.0', id: 2, result: { tools: [] } })
    }) as typeof fetch

    await expect(verifyMcpEndpoint({ endpoint: 'https://example.com/mcp', token: 'secret-token', clientVersion: '0.1.0', fetcher })).resolves.toMatchObject({ serverName: 'server', toolNames: [] })
  })

  it('returns a useful error when authentication is required', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch
    await expect(verifyMcpEndpoint({ endpoint: 'https://example.com/mcp', clientVersion: '0.1.0', fetcher })).rejects.toThrow('requires an access token')
  })
})
