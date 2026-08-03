export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type AiCompletion = { text: string; provider: string; model: string }
export interface AiModelProvider { readonly id: string; complete(messages: readonly AiMessage[]): Promise<AiCompletion> }
