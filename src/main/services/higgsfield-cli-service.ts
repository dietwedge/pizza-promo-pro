import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { higgsfieldModelChoices, type HiggsfieldAspectRatio, type HiggsfieldMediaKind, type HiggsfieldModelChoice, type HiggsfieldModelId } from '../../shared/higgsfield-models'

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

export type HiggsfieldGenerationProfile = { kind:HiggsfieldMediaKind; model:HiggsfieldModelId; settings:Record<string,string|number|boolean> }

export function higgsfieldProfile(model:HiggsfieldModelId,aspectRatio:HiggsfieldAspectRatio):HiggsfieldGenerationProfile {
  const choice=higgsfieldModelChoices.find(item=>item.id===model)
  if(!choice||!choice.supportedAspects.includes(aspectRatio))throw new Error('That format is not supported by the selected Higgsfield model.')
  const aspect=aspectRatio==='4:5'&&!['nano_banana_flash','nano_banana_2_lite','nano_banana_pro'].includes(model)?'3:4':aspectRatio
  const settings:Record<string,string|number|boolean>={aspect_ratio:aspect}
  if(model==='gpt_image_2')Object.assign(settings,{quality:'high',resolution:'2k'})
  if(model==='nano_banana_flash'||model==='nano_banana_pro')settings.resolution='2k'
  if(model==='nano_banana_2_lite')Object.assign(settings,{resolution:'1k',thinking:'HIGH'})
  if(model==='seedance_2_0')Object.assign(settings,{duration:5,resolution:'720p',mode:'std'})
  if(model==='kling3_0_turbo')Object.assign(settings,{duration:5,resolution:'720p'})
  if(model==='kling3_0')Object.assign(settings,{duration:5,mode:'std',sound:'on'})
  if(model==='seedance1_5')Object.assign(settings,{duration:4,resolution:'720p',generate_audio:true})
  if(model==='veo3_1_lite')Object.assign(settings,{duration:4,generate_audio:false})
  return {kind:choice.kind,model,settings}
}

export function parseHiggsfieldModelCatalog(value:unknown):Array<{display_name:string;job_type:string;type:string}>{
  if(!Array.isArray(value))return []
  return value.flatMap(item=>{
    if(!item||typeof item!=='object')return []
    const record=item as Record<string,unknown>
    return typeof record.display_name==='string'&&typeof record.job_type==='string'&&typeof record.type==='string'?[{display_name:record.display_name,job_type:record.job_type,type:record.type}]:[]
  })
}

export async function listSupportedHiggsfieldModels():Promise<HiggsfieldModelChoice[]>{
  const result=await run(['model','list','--json'])
  const available=new Set(parseHiggsfieldModelCatalog(parseJson(result.stdout)).map(item=>item.job_type))
  return higgsfieldModelChoices.filter(item=>available.has(item.id))
}

export function buildHiggsfieldGenerationArgs(command:'cost'|'create',prompt:string,profile:HiggsfieldGenerationProfile,imageReferences:readonly string[]=[]):string[]{
  const args=['generate',command,profile.model,'--prompt',prompt]
  for(const [key,value] of Object.entries(profile.settings))args.push(`--${key}`,String(value))
  for(const reference of imageReferences)args.push('--image-references',reference)
  if(command==='create')args.push('--wait','--wait-timeout','20m')
  args.push('--json')
  return args
}

export async function estimateHiggsfieldCredits(prompt:string,profile:HiggsfieldGenerationProfile,imageReferences:readonly string[]=[]):Promise<number>{
  const result=await run(buildHiggsfieldGenerationArgs('cost',prompt,profile,imageReferences))
  const parsed=parseJson(result.stdout)
  const credits=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?(parsed as Record<string,unknown>).credits:undefined
  if(typeof credits!=='number'||!Number.isFinite(credits)||credits<0)throw new Error('Higgsfield did not return a valid credit estimate.')
  return credits
}

export function parseHiggsfieldGenerationResult(value:unknown):{remoteUrl:string;providerOutputId?:string}{
  const visit=(item:unknown):{remoteUrl:string;providerOutputId?:string}|undefined=>{
    if(Array.isArray(item)){for(const child of item){const found=visit(child);if(found)return found}return undefined}
    if(!item||typeof item!=='object')return undefined
    const record=item as Record<string,unknown>,id=record.id??record.job_id??record.jobId
    for(const key of ['result_url','resultUrl','output_url','outputUrl','url']){
      if(typeof record[key]==='string'&&/^https:\/\//i.test(record[key]))return {remoteUrl:record[key] as string,providerOutputId:typeof id==='string'?id:undefined}
    }
    for(const key of ['outputs','results','data','jobs','result']){const found=visit(record[key]);if(found)return found}
    return undefined
  }
  const found=visit(value)
  if(!found)throw new Error('Higgsfield completed without returning a downloadable media URL.')
  return found
}

export async function generateWithHiggsfield(prompt:string,profile:HiggsfieldGenerationProfile,imageReferences:readonly string[]=[]):Promise<{remoteUrl:string;providerOutputId?:string}>{
  const result=await run(buildHiggsfieldGenerationArgs('create',prompt,profile,imageReferences),21*60_000)
  return parseHiggsfieldGenerationResult(parseJson(result.stdout))
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
