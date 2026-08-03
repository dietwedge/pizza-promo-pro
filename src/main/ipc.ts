import { ipcMain } from 'electron'
import { ipcContracts, resultSchema, type IpcChannel } from '../shared/contracts'

export function registerValidatedHandler<TRequest>(channel: IpcChannel, handler: (request: TRequest) => unknown | Promise<unknown>): void {
  const contract = ipcContracts[channel]
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      const request = contract.request.parse(payload) as TRequest
      const data = contract.response.parse(await handler(request))
      return resultSchema(contract.response).parse({ ok: true, data })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The request could not be completed.'
      return { ok: false, error: { code: 'VALIDATION_OR_OPERATION_ERROR', message } }
    }
  })
}

export function clearIpcHandlers(): void {
  for (const channel of Object.keys(ipcContracts) as IpcChannel[]) ipcMain.removeHandler(channel)
}
