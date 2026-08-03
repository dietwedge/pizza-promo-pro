import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export type HiggsfieldWorkspace = { id: string; name: string }
export type HiggsfieldStatus = {
  state: 'signed_out' | 'needs_workspace' | 'ready' | 'error'
  installed: boolean
  message: string
  workspaces: HiggsfieldWorkspace[]
  selectedWorkspaceId?: string
}

function executablePath(): string {
  const filename = process.platform === 'win32' ? 'hf.exe' : 'hf'
  const packagedRoot = app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked')
  return join(packagedRoot, 'node_modules', '@higgsfield', 'cli', 'vendor', filename)
}

function run(args: string[], timeout = 30_000): Promise<{ stdout: string; stderr: string }> {
  const executable = executablePath()
  if (!existsSync(executable)) return Promise.reject(new Error('The bundled Higgsfield connector is unavailable. Reinstall Pizza Promo Pro.'))
  return new Promise((resolve, reject) => {
    execFile(executable, args, { windowsHide: true, timeout, maxBuffer: 1_000_000, env: { ...process.env, HIGGSFIELD_INSTALL_METHOD: 'pizza-promo-pro' } }, (error, stdout, stderr) => {
      if (error) {
        const detail = `${stderr || stdout || error.message}`.trim()
        reject(new Error(detail))
      } else resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
    })
  })
}

function parseJson(output: string): unknown {
  const start = Math.min(...[output.indexOf('{'), output.indexOf('[')].filter((index) => index >= 0))
  if (!Number.isFinite(start)) throw new Error('Higgsfield returned an unreadable account response.')
  return JSON.parse(output.slice(start)) as unknown
}

function workspaceRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  for (const key of ['workspaces', 'items', 'data', 'results']) {
    if (Array.isArray(record[key])) return workspaceRows(record[key])
    if (record[key] && typeof record[key] === 'object') {
      const nested = workspaceRows(record[key])
      if (nested.length) return nested
    }
  }
  return []
}

export function parseHiggsfieldWorkspaces(value: unknown): HiggsfieldWorkspace[] {
  return workspaceRows(value).map((item) => {
    const id = item.id ?? item.workspace_id ?? item.workspaceId
    const name = item.name ?? item.title ?? item.display_name ?? item.displayName
    return { id: typeof id === 'string' ? id : '', name: typeof name === 'string' ? name : 'Higgsfield workspace' }
  }).filter((item) => item.id).slice(0, 100)
}

function isAuthenticationError(message: string): boolean {
  return /auth login|not authenticated|session expired|unauthorized|no response received/i.test(message)
}

export async function getHiggsfieldStatus(): Promise<HiggsfieldStatus> {
  if (!existsSync(executablePath())) return { state: 'error', installed: false, message: 'The Higgsfield connector is missing. Reinstall Pizza Promo Pro.', workspaces: [] }
  let workspaces: HiggsfieldWorkspace[]
  try {
    const result = await run(['workspace', 'list', '--json'])
    workspaces = parseHiggsfieldWorkspaces(parseJson(result.stdout))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Higgsfield sign-in could not be checked.'
    if (isAuthenticationError(message)) return { state: 'signed_out', installed: true, message: 'Sign in to Higgsfield in your browser to connect this computer.', workspaces: [] }
    return { state: 'error', installed: true, message, workspaces: [] }
  }
  try {
    const account = await run(['account', 'status', '--json'])
    const parsed = parseJson(account.stdout)
    const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
    const selected = record.workspace_id ?? record.workspaceId ?? (record.workspace && typeof record.workspace === 'object' ? (record.workspace as Record<string, unknown>).id : undefined)
    return { state: 'ready', installed: true, message: 'Higgsfield is connected and ready for supervised generation.', workspaces, selectedWorkspaceId: typeof selected === 'string' ? selected : undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/no workspace selected/i.test(message)) return { state: 'needs_workspace', installed: true, message: 'Signed in. Choose the Higgsfield workspace that should pay for generation.', workspaces }
    if (isAuthenticationError(message)) return { state: 'signed_out', installed: true, message: 'Your Higgsfield session expired. Sign in again.', workspaces: [] }
    return { state: 'error', installed: true, message, workspaces }
  }
}

export async function connectHiggsfield(): Promise<HiggsfieldStatus> {
  try { await run(['auth', 'login'], 5 * 60_000) }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Higgsfield sign-in was not completed.'
    return { state: 'error', installed: existsSync(executablePath()), message, workspaces: [] }
  }
  return getHiggsfieldStatus()
}

export async function selectHiggsfieldWorkspace(workspaceId: string): Promise<HiggsfieldStatus> {
  try { await run(['workspace', 'set', workspaceId]) }
  catch (error) { return { state: 'error', installed: existsSync(executablePath()), message: error instanceof Error ? error.message : 'The workspace could not be selected.', workspaces: [] } }
  return getHiggsfieldStatus()
}
