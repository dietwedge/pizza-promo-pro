import { app, dialog } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, resolve, sep } from 'node:path'
import { getDatabase } from '../database'
import { audit } from './data-service'

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm'])

function safeName(filename: string): string {
  const extension = extname(filename).toLowerCase()
  const stem = basename(filename, extension).normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'media'
  return `${stem}-${randomUUID()}${extension}`
}

export async function importMedia(): Promise<Record<string, unknown>[]> {
  const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'Images and videos', extensions: [...allowedExtensions].map((item) => item.slice(1)) }] })
  if (result.canceled) return []
  const mediaRoot = resolve(app.getPath('userData'), 'media')
  mkdirSync(mediaRoot, { recursive: true })
  const business = getDatabase().prepare('SELECT id FROM businesses ORDER BY created_at LIMIT 1').get() as { id: string } | undefined
  if (!business) throw new Error('Create the business profile before importing media.')
  return result.filePaths.map((source) => {
    const extension = extname(source).toLowerCase()
    if (!allowedExtensions.has(extension)) throw new Error(`Unsupported media type: ${extension}`)
    const destination = resolve(mediaRoot, safeName(source))
    if (!destination.startsWith(`${mediaRoot}${sep}`)) throw new Error('The selected filename is not safe.')
    copyFileSync(source, destination)
    const id = randomUUID(), now = Date.now(), bytes = statSync(destination).size
    const checksum = createHash('sha256').update(readFileSync(destination)).digest('hex')
    const mime = extension === '.mp4' ? 'video/mp4' : extension === '.webm' ? 'video/webm' : extension === '.mov' ? 'video/quicktime' : `image/${extension.replace('.', '').replace('jpg', 'jpeg')}`
    getDatabase().prepare('INSERT INTO media_assets (id, business_id, kind, local_path, original_filename, mime_type, byte_size, checksum_sha256, source, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, business.id, mime.startsWith('video') ? 'video' : 'image', destination, basename(source), mime, bytes, checksum, 'import', '{}', now, now)
    audit('media.imported', 'media_assets', id, { originalFilename: basename(source), bytes })
    return { id, local_path: destination, original_filename: basename(source), mime_type: mime, byte_size: bytes }
  })
}

export function mediaRootExists(): boolean { return existsSync(join(app.getPath('userData'), 'media')) }
