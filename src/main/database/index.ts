import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import initialMigration from './migrations/0001_initial.sql?raw'
import aiChatMigration from './migrations/0002_ai_chat.sql?raw'
import paidMediaMigration from './migrations/0003_paid_media.sql?raw'
import performanceReportingMigration from './migrations/0004_performance_reporting.sql?raw'

let database: DatabaseSync | undefined

export function getDatabase(): DatabaseSync {
  if (database) return database
  const dataDirectory = app.getPath('userData')
  mkdirSync(dataDirectory, { recursive: true })
  database = new DatabaseSync(join(dataDirectory, 'pizza-social-hub.sqlite'))
  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
  database.exec('CREATE TABLE IF NOT EXISTS __migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)')
  const migrations = [[1, initialMigration], [2, aiChatMigration], [3, paidMediaMigration], [4, performanceReportingMigration]] as const
  for (const [version, sql] of migrations) {
    const applied = database.prepare('SELECT version FROM __migrations WHERE version = ?').get(version)
    if (!applied) database.exec(`BEGIN IMMEDIATE; ${sql}; INSERT INTO __migrations(version, applied_at) VALUES (${version}, unixepoch() * 1000); COMMIT;`)
  }
  return database
}

export function closeDatabase(): void {
  database?.close()
  database = undefined
}
