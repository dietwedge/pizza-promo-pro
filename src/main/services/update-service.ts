import { app } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

export type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up_to_date' | 'error' | 'unavailable'

export type UpdateStatus = {
  state: UpdateState
  currentVersion: string
  availableVersion: string | null
  progressPercent: number | null
  message: string
}

let status: UpdateStatus = {
  state: 'idle', currentVersion: app.getVersion(), availableVersion: null, progressPercent: null,
  message: 'Pizza Promo Pro checks for updates automatically.'
}
let initialized = false

function setStatus(next: Partial<UpdateStatus>): void { status = { ...status, ...next } }

export function getUpdateStatus(): UpdateStatus { return { ...status } }

export async function checkForAppUpdate(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    setStatus({ state: 'unavailable', message: 'Update checks are available in installed builds.' })
    return getUpdateStatus()
  }
  setStatus({ state: 'checking', progressPercent: null, message: 'Checking GitHub Releases for updates…' })
  await autoUpdater.checkForUpdates()
  return getUpdateStatus()
}

export async function downloadAppUpdate(): Promise<UpdateStatus> {
  if (status.state !== 'available') throw new Error('No application update is ready to download.')
  await autoUpdater.downloadUpdate()
  return getUpdateStatus()
}

export function installAppUpdate(): UpdateStatus {
  if (status.state !== 'downloaded') throw new Error('The update must finish downloading before restarting.')
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
  return getUpdateStatus()
}

export function initializeAppUpdater(): void {
  if (initialized) return
  initialized = true
  status.currentVersion = app.getVersion()
  if (!app.isPackaged) {
    setStatus({ state: 'unavailable', message: 'Update checks are available in installed builds.' })
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking', progressPercent: null, message: 'Checking GitHub Releases for updates…' }))
  autoUpdater.on('update-available', (info) => setStatus({ state: 'available', availableVersion: info.version, progressPercent: 0, message: `Version ${info.version} is available and will download in the background.` }))
  autoUpdater.on('update-not-available', () => setStatus({ state: 'up_to_date', availableVersion: null, progressPercent: null, message: 'You have the latest version.' }))
  autoUpdater.on('download-progress', (progress) => setStatus({ state: 'downloading', progressPercent: Math.round(progress.percent), message: `Downloading update… ${Math.round(progress.percent)}%` }))
  autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'downloaded', availableVersion: info.version, progressPercent: 100, message: `Version ${info.version} is ready. Restart to finish updating.` }))
  autoUpdater.on('error', (error) => setStatus({ state: 'error', progressPercent: null, message: `Update check failed: ${error.message}` }))

  setTimeout(() => { void checkForAppUpdate().catch(() => undefined) }, 10_000)
  setInterval(() => { void checkForAppUpdate().catch(() => undefined) }, 4 * 60 * 60 * 1000).unref()
}
