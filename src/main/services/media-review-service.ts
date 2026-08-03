import { app, shell } from 'electron'
import { existsSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { getDatabase } from '../database'
import { audit } from './data-service'

export async function openMediaForReview(mediaAssetId:string):Promise<{opened:boolean}>{
  const row=getDatabase().prepare('SELECT local_path FROM media_assets WHERE id=?').get(mediaAssetId) as {local_path:string}|undefined
  if(!row)throw new Error('Generated media was not found.')
  const mediaRoot=resolve(app.getPath('userData'),'media'),target=resolve(row.local_path),inside=relative(mediaRoot,target)
  if(inside.startsWith('..')||inside.includes(':')||resolve(mediaRoot,inside)!==target)throw new Error('The media path is outside protected application storage.')
  if(!existsSync(target))throw new Error('The generated media file is missing from local storage.')
  const failure=await shell.openPath(target)
  if(failure)throw new Error(`The generated media could not be opened: ${failure}`)
  audit('media.opened_for_review','media_assets',mediaAssetId,{})
  return {opened:true}
}
