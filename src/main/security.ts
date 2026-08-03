import { shell, type BrowserWindow, type WebContents } from 'electron'

const allowedExternalHosts = new Set(['support.google.com', 'www.facebook.com', 'www.instagram.com', 'www.tiktok.com', 'www.threads.net', 'www.youtube.com', 'x.com'])

export function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return url.protocol === 'https:' && allowedExternalHosts.has(url.hostname)
  } catch { return false }
}

export function lockDownWebContents(contents: WebContents, rendererOrigin: string): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith(rendererOrigin)) event.preventDefault()
  })
  contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  contents.session.setPermissionCheckHandler(() => false)
}

export function attachUnsavedCloseGuard(window: BrowserWindow, hasUnsavedChanges: () => boolean): void {
  window.on('close', (event) => {
    if (hasUnsavedChanges()) event.preventDefault()
  })
}
