import { app } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { getDatabase } from '../database'
import { audit } from './data-service'
import { estimateHiggsfieldCredits, generateWithHiggsfield, getHiggsfieldStatus, higgsfieldProfile, listSupportedHiggsfieldModels } from './higgsfield-cli-service'
import { higgsfieldModelChoices, type HiggsfieldAspectRatio as Aspect, type HiggsfieldMediaKind as Kind, type HiggsfieldModelId } from '../../shared/higgsfield-models'

const MAX_DOWNLOAD_BYTES=150*1024*1024
const MAX_REFERENCE_BYTES=30*1024*1024

function modelChoice(model:HiggsfieldModelId){const choice=higgsfieldModelChoices.find(item=>item.id===model);if(!choice)throw new Error('That Higgsfield model is not supported by this version of Pizza Promo Pro.');return choice}

function referenceImages(model:HiggsfieldModelId,ids:readonly string[]):Array<{id:string;path:string}>{
  const unique=[...new Set(ids)];if(unique.length>4)throw new Error('Choose no more than four reference images.')
  const choice=modelChoice(model);if(unique.length&&!choice.supportsImageReferences)throw new Error(`${choice.label} does not accept reference images. Choose GPT Image 2, Nano Banana 2, or Seedance 2.0.`)
  const database=getDatabase(),root=resolve(app.getPath('userData'),'media')
  return unique.map(id=>{
    const row=database.prepare('SELECT local_path,mime_type,kind,byte_size FROM media_assets WHERE id=?').get(id) as {local_path:string;mime_type:string;kind:string;byte_size:number}|undefined
    if(!row)throw new Error('One of the selected reference images is no longer in the Media Library.')
    const path=resolve(row.local_path),inside=relative(root,path)
    if(inside.startsWith('..')||inside.includes(':')||resolve(root,inside)!==path||!existsSync(path))throw new Error('A selected reference image is missing from protected media storage.')
    if(row.kind!=='image'||!row.mime_type.startsWith('image/'))throw new Error('Only images can be used as visual references.')
    if(row.byte_size>MAX_REFERENCE_BYTES)throw new Error('Each reference image must be 30 MB or smaller.')
    return {id,path}
  })
}

export async function getHiggsfieldMediaModels():Promise<Record<string,unknown>>{
  const status=await getHiggsfieldStatus()
  if(status.state!=='ready')throw new Error(status.message)
  return {models:await listSupportedHiggsfieldModels()}
}

export async function estimateHiggsfieldMedia(input:{prompt:string;model:HiggsfieldModelId;aspectRatio:Aspect;referenceAssetIds:string[]}):Promise<Record<string,unknown>>{
  const status=await getHiggsfieldStatus()
  if(status.state!=='ready')throw new Error(status.message)
  const choice=modelChoice(input.model),available=await listSupportedHiggsfieldModels()
  if(!available.some(item=>item.id===input.model))throw new Error('That Higgsfield model is not currently available. Refresh the model list and choose another.')
  const references=referenceImages(input.model,input.referenceAssetIds),profile=higgsfieldProfile(input.model,input.aspectRatio),credits=await estimateHiggsfieldCredits(input.prompt,profile,references.map(item=>item.path))
  return {provider:'higgsfield',kind:choice.kind,model:profile.model,modelLabel:choice.label,aspectRatio:input.aspectRatio,credits,settings:profile.settings,outputSummary:choice.outputSummary,referenceAssetIds:references.map(item=>item.id)}
}

function extensionFor(mime:string,url:string,kind:Kind):string{
  const known:Record<string,string>={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov'}
  const fromMime=known[mime.toLowerCase()]
  if(fromMime)return fromMime
  const fromUrl=extname(new URL(url).pathname).toLowerCase()
  if(['.jpg','.jpeg','.png','.webp','.mp4','.webm','.mov'].includes(fromUrl))return fromUrl
  return kind==='image'?'.img':'.video'
}

async function downloadMedia(url:string,kind:Kind):Promise<{bytes:Buffer;mimeType:string;extension:string;checksum:string}>{
  const parsed=new URL(url)
  if(parsed.protocol!=='https:')throw new Error('Higgsfield returned an insecure media URL.')
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60_000)
  try{
    const response=await fetch(parsed,{redirect:'error',signal:controller.signal,headers:{Accept:kind==='image'?'image/*':'video/*'}})
    if(!response.ok)throw new Error(`Higgsfield media download returned HTTP ${response.status}.`)
    const declared=Number(response.headers.get('content-length')??0)
    if(declared>MAX_DOWNLOAD_BYTES)throw new Error('The generated media exceeds the 150 MB download limit.')
    const bytes=Buffer.from(await response.arrayBuffer())
    if(bytes.length>MAX_DOWNLOAD_BYTES)throw new Error('The generated media exceeds the 150 MB download limit.')
    const mimeType=(response.headers.get('content-type')??'').split(';')[0]?.trim().toLowerCase()??''
    if(!(kind==='image'?mimeType.startsWith('image/'):mimeType.startsWith('video/')))throw new Error(`Higgsfield returned an unexpected ${mimeType||'unknown'} media type.`)
    return {bytes,mimeType,extension:extensionFor(mimeType,url,kind),checksum:createHash('sha256').update(bytes).digest('hex')}
  }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('The Higgsfield media download timed out.');throw error}
  finally{clearTimeout(timeout)}
}

export async function generateHiggsfieldMedia(input:{contentItemId:string;prompt:string;model:HiggsfieldModelId;aspectRatio:Aspect;referenceAssetIds:string[];maxCredits:number;confirmSpend:true;confirmReview:true}):Promise<Record<string,unknown>>{
  const database=getDatabase(),content=database.prepare('SELECT id, business_id, status, title FROM content_items WHERE id = ?').get(input.contentItemId) as {id:string;business_id:string;status:string;title:string}|undefined
  if(!content)throw new Error('Content item not found.')
  if(!['draft','media_generation'].includes(content.status))throw new Error('Return this content to draft before generating new media.')
  const choice=modelChoice(input.model),references=referenceImages(input.model,input.referenceAssetIds),profile=higgsfieldProfile(input.model,input.aspectRatio),credits=await estimateHiggsfieldCredits(input.prompt,profile,references.map(item=>item.path)),kind=choice.kind
  if(credits>input.maxCredits)throw new Error(`The Higgsfield estimate changed to ${credits} credits. Review and confirm the new amount before generating.`)
  const jobId=randomUUID(),now=Date.now()
  database.prepare('INSERT INTO generation_jobs (id, content_item_id, provider, model, prompt, source_asset_ids_json, settings_json, status, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(jobId,input.contentItemId,'higgsfield',profile.model,input.prompt,JSON.stringify(references.map(item=>item.id)),JSON.stringify({...profile.settings,kind,aspectRatio:input.aspectRatio,confirmedCredits:input.maxCredits}),'running',now,now,now)
  database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?').run('media_generation',now,input.contentItemId)
  try{
    const generated=await generateWithHiggsfield(input.prompt,profile,references.map(item=>item.path)),download=await downloadMedia(generated.remoteUrl,kind),mediaId=randomUUID(),root=join(app.getPath('userData'),'media','generated'),path=join(root,`${mediaId}${download.extension}`),completed=Date.now()
    mkdirSync(root,{recursive:true});writeFileSync(path,download.bytes,{mode:0o600})
    database.exec('BEGIN IMMEDIATE')
    try{
      database.prepare('INSERT INTO media_assets (id, business_id, kind, local_path, original_filename, mime_type, byte_size, checksum_sha256, source, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(mediaId,content.business_id,kind,path,`${content.title}-${profile.model}${download.extension}`,download.mimeType,download.bytes.length,download.checksum,'higgsfield_generation',JSON.stringify({provider:'higgsfield',model:profile.model,prompt:input.prompt,aspectRatio:input.aspectRatio,credits}),completed,completed)
      database.prepare('INSERT INTO generation_outputs (id, generation_job_id, media_asset_id, provider_output_id, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(),jobId,mediaId,generated.providerOutputId??null,JSON.stringify({model:profile.model,kind,aspectRatio:input.aspectRatio,credits,referenceAssetIds:references.map(item=>item.id)}),completed,completed)
      database.prepare('UPDATE generation_jobs SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?').run('completed',completed,completed,jobId)
      database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?').run('ready_for_review',completed,input.contentItemId)
      database.exec('COMMIT')
    }catch(error){database.exec('ROLLBACK');throw error}
    audit('media.higgsfield.generated','content_items',input.contentItemId,{jobId,mediaId,model:profile.model,kind,credits,requiresReview:true})
    return {jobId,mediaId,status:'completed',provider:'higgsfield',model:profile.model,kind,credits,requiresReview:true}
  }catch(error){const failed=Date.now(),message=error instanceof Error?error.message:'Higgsfield generation failed.';database.prepare('UPDATE generation_jobs SET status = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?').run('failed',message,failed,failed,jobId);database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?').run('draft',failed,input.contentItemId);audit('media.higgsfield.failed','content_items',input.contentItemId,{jobId,model:profile.model,kind});throw error}
}
