import { beforeEach, describe, expect, it, vi } from 'vitest'

const electronMock = vi.hoisted(() => ({ handlers: new Map<string, (event: unknown, payload: unknown) => Promise<unknown>>() }))
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, handler: (event: unknown, payload: unknown) => Promise<unknown>) => electronMock.handlers.set(channel, handler), removeHandler: (channel: string) => electronMock.handlers.delete(channel) } }))

import { registerValidatedHandler } from '../../src/main/ipc'

describe('validated IPC handler', () => {
  beforeEach(() => electronMock.handlers.clear())

  it('validates requests and responses at the process boundary', async () => {
    registerValidatedHandler('app:getInfo', () => ({ name: 'Pizza Promo Pro', version: '0.1.0', online: true, platform: 'test' }))
    const handler = electronMock.handlers.get('app:getInfo')!
    await expect(handler({}, {})).resolves.toMatchObject({ ok: true, data: { name: 'Pizza Promo Pro' } })
    await expect(handler({}, { unexpected: true })).resolves.toMatchObject({ ok: true })
  })

  it('returns a safe error envelope for malformed input', async () => {
    registerValidatedHandler('data:remove', () => ({ id: crypto.randomUUID() }))
    const response = await electronMock.handlers.get('data:remove')!({}, { entity: 'businesses', id: '../unsafe' })
    expect(response).toMatchObject({ ok: false, error: { code: 'VALIDATION_OR_OPERATION_ERROR' } })
  })
})
