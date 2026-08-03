import { app } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDatabase } from '../database'
import { MockMediaGenerationProvider } from '../providers/mock-media-generation-provider'
import { audit } from './data-service'

function escapeXml(value: string): string { return value.replace(/[<>&'"]/g, (char) => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' })[char]!) }

export async function generateForContent(contentItemId: string, prompt: string): Promise<Record<string, unknown>> {
  const database=getDatabase(), content=database.prepare('SELECT id, business_id, status, title FROM content_items WHERE id = ?').get(contentItemId) as {id:string;business_id:string;status:string;title:string}|undefined
  if(!content) throw new Error('Content item not found.')
  if(!['draft','media_generation'].includes(content.status)) throw new Error('Return this content to draft before generating new media.')
  const jobId=randomUUID(), now=Date.now(), provider=new MockMediaGenerationProvider()
  database.prepare('INSERT INTO generation_jobs (id, content_item_id, provider, model, prompt, source_asset_ids_json, settings_json, status, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(jobId,contentItemId,provider.id,'mock-pizza-v1',prompt,'[]','{}','running',now,now,now)
  database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?').run('media_generation',now,contentItemId)
  try {
    const generated=await provider.generate({jobId,prompt,model:'mock-pizza-v1',outputKind:'image',sourceAssetPaths:[],settings:{}}), output=generated.outputs[0]
    if(!output) throw new Error('The mock provider returned no output.')
    const mediaId=randomUUID(), root=join(app.getPath('userData'),'media','generated'), path=join(root,`${mediaId}.svg`)
    mkdirSync(root,{recursive:true})
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="1200" height="1200" fill="#20201e"/><circle cx="600" cy="540" r="340" fill="#d94b32"/><circle cx="600" cy="540" r="280" fill="#f7c66f"/><text x="600" y="960" fill="#fffdf8" text-anchor="middle" font-family="Arial" font-size="44">MOCK MEDIA · ${escapeXml(content.title)}</text></svg>`
    writeFileSync(path,svg,'utf8')
    const checksum=createHash('sha256').update(svg).digest('hex'), completed=Date.now()
    database.exec('BEGIN IMMEDIATE')
    try {
      database.prepare('INSERT INTO media_assets (id, business_id, kind, local_path, original_filename, mime_type, byte_size, width, height, checksum_sha256, source, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(mediaId,content.business_id,'image',path,`${content.title}-mock.svg`,'image/svg+xml',Buffer.byteLength(svg),1200,1200,checksum,'mock_generation',JSON.stringify({mocked:true,prompt}),completed,completed)
      database.prepare('INSERT INTO generation_outputs (id, generation_job_id, media_asset_id, provider_output_id, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(),jobId,mediaId,output.providerOutputId,JSON.stringify(output.metadata),completed,completed)
      database.prepare('UPDATE generation_jobs SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?').run('completed',completed,completed,jobId)
      database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?').run('ready_for_review',completed,contentItemId)
      database.exec('COMMIT')
    } catch(error){database.exec('ROLLBACK');throw error}
    audit('media.mock.generated','content_items',contentItemId,{jobId,mediaId,mocked:true})
    return {jobId,mediaId,status:'completed',mocked:true,prompt}
  } catch(error) {
    const failed=Date.now(); database.prepare('UPDATE generation_jobs SET status = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?').run('failed',error instanceof Error?error.message:'Generation failed',failed,failed,jobId); database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?').run('failed',failed,contentItemId); throw error
  }
}
