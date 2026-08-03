import { app, shell } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { getDatabase } from '../database'
import { audit } from './data-service'

const MAX_INLINE_PREVIEW_BYTES=25*1024*1024

function protectedMedia(mediaAssetId:string):{target:string;mimeType:string;kind:string;filename:string;byteSize:number}{
  const row=getDatabase().prepare('SELECT local_path,mime_type,kind,original_filename,byte_size FROM media_assets WHERE id=?').get(mediaAssetId) as {local_path:string;mime_type:string;kind:string;original_filename:string;byte_size:number}|undefined
  if(!row)throw new Error('Generated media was not found.')
  const mediaRoot=resolve(app.getPath('userData'),'media'),target=resolve(row.local_path),inside=relative(mediaRoot,target)
  if(inside.startsWith('..')||inside.includes(':')||resolve(mediaRoot,inside)!==target)throw new Error('The media path is outside protected application storage.')
  if(!existsSync(target))throw new Error('The generated media file is missing from local storage.')
  return {target,mimeType:row.mime_type,kind:row.kind,filename:row.original_filename,byteSize:row.byte_size}
}

export function readMediaPreview(mediaAssetId:string):{dataUrl:string;mimeType:string;kind:'image';filename:string}{
  const media=protectedMedia(mediaAssetId)
  if(media.kind!=='image'||!media.mimeType.startsWith('image/'))throw new Error('Only generated images can be previewed inside the content card.')
  if(media.byteSize>MAX_INLINE_PREVIEW_BYTES)throw new Error('This image is too large for an inline preview. Use “Open original” to review it.')
  const bytes=readFileSync(media.target)
  if(bytes.length>MAX_INLINE_PREVIEW_BYTES)throw new Error('This image is too large for an inline preview. Use “Open original” to review it.')
  return {dataUrl:`data:${media.mimeType};base64,${bytes.toString('base64')}`,mimeType:media.mimeType,kind:'image',filename:media.filename}
}

export function listMediaAssets():Record<string,unknown>[] {
  return getDatabase().prepare('SELECT id,kind,original_filename,mime_type,byte_size,source,created_at FROM media_assets ORDER BY created_at DESC').all() as Record<string,unknown>[]
}

export async function openMediaForReview(mediaAssetId:string):Promise<{opened:boolean}>{
  const media=protectedMedia(mediaAssetId),failure=await shell.openPath(media.target)
  if(failure)throw new Error(`The generated media could not be opened: ${failure}`)
  audit('media.opened_for_review','media_assets',mediaAssetId,{})
  return {opened:true}
}
