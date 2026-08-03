import { app, safeStorage } from 'electron'
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface CredentialVault { set(key: string, value: string): void; get(key: string): string | undefined; has(key: string): boolean; delete(key: string): void }

export class ElectronCredentialVault implements CredentialVault {
  private path(): string { return join(app.getPath('userData'), 'credentials.secure.json') }
  private read(): Record<string, string> {
    if (!existsSync(this.path())) return {}
    return JSON.parse(readFileSync(this.path(), 'utf8')) as Record<string, string>
  }
  private write(values: Record<string, string>): void {
    const temporary = `${this.path()}.tmp`
    writeFileSync(temporary, JSON.stringify(values), { encoding: 'utf8', mode: 0o600 })
    renameSync(temporary, this.path())
    try { chmodSync(this.path(), 0o600) } catch { /* Windows applies user protection through safeStorage. */ }
  }
  set(key: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is not available on this system.')
    this.write({ ...this.read(), [key]: safeStorage.encryptString(value).toString('base64') })
  }
  get(key: string): string | undefined {
    const sealed = this.read()[key]
    if (!sealed) return undefined
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is not available on this system.')
    return safeStorage.decryptString(Buffer.from(sealed, 'base64'))
  }
  has(key: string): boolean { return Boolean(this.read()[key]) }
  delete(key: string): void { const values = this.read(); delete values[key]; this.write(values) }
}
