const REQUEST_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 1_000_000
const SUPPORTED_PROTOCOLS = new Set(['2025-11-25', '2025-06-18', '2025-03-26'])

type Fetcher = typeof fetch
type JsonRpcResponse = {
  jsonrpc?: unknown
  id?: unknown
  result?: unknown
  error?: { code?: unknown; message?: unknown }
}

export type McpVerification = {
  serverName: string
  serverVersion?: string
  protocolVersion: string
  toolNames: string[]
}

function parseSse(body: string, requestId: number): JsonRpcResponse {
  for (const block of body.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n')
    if (!data) continue
    try {
      const message = JSON.parse(data) as JsonRpcResponse
      if (message.id === requestId) return message
    } catch { /* Ignore keep-alive and non-JSON SSE events. */ }
  }
  throw new Error('The MCP server ended its response without returning the requested result.')
}

async function readResponse(response: Response, requestId: number): Promise<JsonRpcResponse> {
  const declaredSize = Number(response.headers.get('content-length') ?? 0)
  if (declaredSize > MAX_RESPONSE_BYTES) throw new Error('The MCP server response was too large.')
  const body = await response.text()
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) throw new Error('The MCP server response was too large.')
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  try {
    return contentType.includes('text/event-stream') ? parseSse(body, requestId) : JSON.parse(body) as JsonRpcResponse
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('The endpoint did not return a valid MCP response.')
    throw error
  }
}

function assertResult(message: JsonRpcResponse, requestId: number): Record<string, unknown> {
  if (message.jsonrpc !== '2.0' || message.id !== requestId) throw new Error('The MCP server returned a mismatched protocol response.')
  if (message.error) throw new Error(typeof message.error.message === 'string' ? message.error.message : 'The MCP server rejected the request.')
  if (!message.result || typeof message.result !== 'object' || Array.isArray(message.result)) throw new Error('The MCP server returned an incomplete result.')
  return message.result as Record<string, unknown>
}

function endpointHeaders(token?: string, protocolVersion?: string, sessionId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (protocolVersion) headers['MCP-Protocol-Version'] = protocolVersion
  if (sessionId) headers['MCP-Session-Id'] = sessionId
  return headers
}

async function post(fetcher: Fetcher, endpoint: string, body: object, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
  const response = await fetcher(endpoint, { method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('The MCP server refused access. Check whether this endpoint requires an access token.')
    throw new Error(`The MCP server returned HTTP ${response.status}. Check the server URL and try again.`)
  }
  return response
}

export async function verifyMcpEndpoint(input: { endpoint: string; token?: string; clientVersion: string; fetcher?: Fetcher }): Promise<McpVerification> {
  const fetcher = input.fetcher ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const initializeId = 1
    const initializeResponse = await post(fetcher, input.endpoint, {
      jsonrpc: '2.0', id: initializeId, method: 'initialize',
      params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'pizza-promo-pro', title: 'Pizza Promo Pro', version: input.clientVersion } }
    }, endpointHeaders(input.token), controller.signal)
    const sessionId = initializeResponse.headers.get('mcp-session-id') ?? undefined
    const initialized = assertResult(await readResponse(initializeResponse, initializeId), initializeId)
    const protocolVersion = typeof initialized.protocolVersion === 'string' ? initialized.protocolVersion : ''
    if (!SUPPORTED_PROTOCOLS.has(protocolVersion)) throw new Error(`The MCP server selected unsupported protocol version ${protocolVersion || 'unknown'}.`)
    const capabilities = initialized.capabilities
    if (!capabilities || typeof capabilities !== 'object' || !('tools' in capabilities)) throw new Error('The MCP server connected, but it does not advertise any tools.')

    await post(fetcher, input.endpoint, { jsonrpc: '2.0', method: 'notifications/initialized' }, endpointHeaders(input.token, protocolVersion, sessionId), controller.signal)
    const toolsId = 2
    const toolsResponse = await post(fetcher, input.endpoint, { jsonrpc: '2.0', id: toolsId, method: 'tools/list', params: {} }, endpointHeaders(input.token, protocolVersion, sessionId), controller.signal)
    const toolsResult = assertResult(await readResponse(toolsResponse, toolsId), toolsId)
    if (!Array.isArray(toolsResult.tools)) throw new Error('The MCP server returned an invalid tool list.')
    const toolNames = toolsResult.tools.map((tool) => tool && typeof tool === 'object' && 'name' in tool ? (tool as { name?: unknown }).name : undefined)
      .filter((name): name is string => typeof name === 'string' && name.length > 0).slice(0, 500)
    const serverInfo = initialized.serverInfo && typeof initialized.serverInfo === 'object' ? initialized.serverInfo as Record<string, unknown> : {}
    return {
      serverName: typeof serverInfo.title === 'string' ? serverInfo.title : typeof serverInfo.name === 'string' ? serverInfo.name : 'MCP server',
      serverVersion: typeof serverInfo.version === 'string' ? serverInfo.version : undefined,
      protocolVersion,
      toolNames
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The MCP server did not respond within 10 seconds.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
