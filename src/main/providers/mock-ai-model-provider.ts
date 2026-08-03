import type { AiCompletion, AiMessage, AiModelProvider } from './ai-model-provider'

export class MockAiModelProvider implements AiModelProvider {
  readonly id='local_mock'
  async complete(messages:readonly AiMessage[]):Promise<AiCompletion>{
    const question=messages.filter((message)=>message.role==='user').at(-1)?.content??''
    const context=messages.find((message)=>message.role==='system')?.content??''
    const hasMenu=context.includes('Menu facts:')
    return {provider:this.id,model:'local-deterministic-v1',text:`Here is a safe starting point for “${question.slice(0,160)}”.\n\n${hasMenu?'I can use the saved menu and promotion facts shown in this workspace.':'Add menu items and current promotions so I can ground the recommendation in specific facts.'}\n\nI can help shape the concept, platform approach, media direction, and review checklist. I will not approve, schedule, or publish anything.`}
  }
}
