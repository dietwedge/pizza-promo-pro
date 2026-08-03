import { app, dialog } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import { closeDatabase, getDatabase } from '../database'
import { audit } from './data-service'

type BackupManifest = { format: 'pizza-social-hub-backup'; formatVersion: 1; appVersion: string; schemaVersion: 1; createdAt: string; databaseSha256: string; includesMedia: boolean }

function checksum(path: string): string { return createHash('sha256').update(readFileSync(path)).digest('hex') }

export async function createBackup(): Promise<string> {
  const selected = await dialog.showSaveDialog({ defaultPath: `pizza-promo-pro-${new Date().toISOString().slice(0, 10)}.pshbackup`, filters: [{ name: 'Pizza Promo Pro backup', extensions: ['pshbackup'] }] })
  if (selected.canceled || !selected.filePath) return ''
  const bundle = resolve(selected.filePath)
  const databasePath = join(app.getPath('userData'), 'pizza-social-hub.sqlite')
  const databaseCopy = join(bundle, 'database.sqlite')
  mkdirSync(bundle, { recursive: true })
  getDatabase().exec('PRAGMA wal_checkpoint(FULL)')
  copyFileSync(databasePath, databaseCopy)
  const mediaSource = join(app.getPath('userData'), 'media')
  if (existsSync(mediaSource)) cpSync(mediaSource, join(bundle, 'media'), { recursive: true, errorOnExist: true })
  const manifest: BackupManifest = { format: 'pizza-social-hub-backup', formatVersion: 1, appVersion: app.getVersion(), schemaVersion: 1, createdAt: new Date().toISOString(), databaseSha256: checksum(databaseCopy), includesMedia: existsSync(mediaSource) }
  writeFileSync(join(bundle, 'manifest.json'), JSON.stringify(manifest, null, 2), { encoding: 'utf8', flag: 'wx' })
  const now = Date.now()
  getDatabase().prepare('INSERT INTO backup_records (id, path, status, checksum_sha256, app_version, schema_version, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), bundle, 'complete', manifest.databaseSha256, app.getVersion(), 1, now, now, now)
  audit('backup.created', 'backup_records', null, { name: basename(bundle), includesMedia: manifest.includesMedia })
  return bundle
}

export async function restoreBackup(): Promise<boolean> {
  const selected = await dialog.showOpenDialog({ properties: ['openDirectory'], filters: [{ name: 'Pizza Promo Pro backup', extensions: ['pshbackup'] }] })
  if (selected.canceled || !selected.filePaths[0]) return false
  const bundle = resolve(selected.filePaths[0])
  const manifestPath = join(bundle, 'manifest.json'), sourceDatabase = join(bundle, 'database.sqlite')
  if (!manifestPath.startsWith(`${bundle}${sep}`) || !existsSync(manifestPath) || !existsSync(sourceDatabase)) throw new Error('The selected folder is not a Pizza Promo Pro backup.')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BackupManifest
  if (manifest.format !== 'pizza-social-hub-backup' || manifest.formatVersion !== 1 || manifest.schemaVersion > 1) throw new Error('This backup format is not compatible with this app version.')
  if (checksum(sourceDatabase) !== manifest.databaseSha256) throw new Error('The backup database checksum does not match its manifest.')
  const userData = resolve(app.getPath('userData')), target = join(userData, 'pizza-social-hub.sqlite'), staged = join(userData, 'pizza-social-hub.restore.sqlite')
  copyFileSync(sourceDatabase, staged)
  const probe = new (await import('node:sqlite')).DatabaseSync(staged, { readOnly: true })
  const integrity = probe.prepare('PRAGMA integrity_check').get() as { integrity_check: string }
  probe.close()
  if (integrity.integrity_check !== 'ok') { rmSync(staged, { force: true }); throw new Error('The backup database did not pass its integrity check.') }
  closeDatabase()
  const previous = join(userData, 'pizza-social-hub.previous.sqlite')
  rmSync(previous, { force: true })
  if (existsSync(target)) renameSync(target, previous)
  try { renameSync(staged, target); rmSync(previous, { force: true }) }
  catch (error) { if (existsSync(previous)) renameSync(previous, target); throw error }
  const mediaSource = join(bundle, 'media'), mediaTarget = join(userData, 'media')
  if (manifest.includesMedia && existsSync(mediaSource)) {
    const stagedMedia = join(userData, 'media.restore')
    rmSync(stagedMedia, { recursive: true, force: true })
    cpSync(mediaSource, stagedMedia, { recursive: true })
    rmSync(mediaTarget, { recursive: true, force: true })
    renameSync(stagedMedia, mediaTarget)
  }
  return true
}
