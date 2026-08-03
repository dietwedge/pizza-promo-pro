import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerAppHandlers } from './services/app-handlers'
import { lockDownWebContents } from './security'
import { closeDatabase, getDatabase } from './database'
import { initializeAppUpdater } from './services/update-service'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: '#F4F5F0',
    webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  const origin = rendererUrl ?? 'file://'
  lockDownWebContents(mainWindow.webContents, origin)
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  if (rendererUrl) void mainWindow.loadURL(rendererUrl)
  else void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  getDatabase()
  registerAppHandlers()
  createWindow()
  initializeAppUpdater()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', closeDatabase)
