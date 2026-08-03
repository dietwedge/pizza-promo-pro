import type { AiCompletion, AiMessage, AiModelProvider } from './ai-model-provider'

type RemoteConfig={provider:'openai'|'openai_compatible'|'ollama';model:string;endpoint:string;apiKey?:string}
export class RemoteAiModelProvider implements AiModelProvider {
  readonly id:string
  constructor(private readonly config:RemoteConfig){this.id=config.provider}
  async complete(messages:readonly AiMessage[]):Promise<AiCompletion>{
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),45_000)
    try{
      if(this.config.provider==='ollama'){
        const response=await fetch(`${this.config.endpoint.replace(/\/$/,'')}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:this.config.model,messages,stream:false}),signal:controller.signal,redirect:'error'})
        const payload=await response.json() as {message?:{content?:string};error?:string}
        if(!response.ok)throw new Error(payload.error??`Ollama returned ${response.status}.`)
        const text=payload.message?.content
        if(!text?.trim())throw new Error('Ollama returned an empty response.')
        return {text,provider:this.id,model:this.config.model}
      }
      if(this.config.provider==='openai'){
        const response=await fetch(`${this.config.endpoint.replace(/\/$/,'')}/responses`,{method:'POST',headers:{Authorization:`Bearer ${this.config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.config.model,input:messages.map(({role,content})=>({role,content})),max_output_tokens:1200}),signal:controller.signal,redirect:'error'})
        const payload=await response.json() as {output_text?:string;output?:{content?:{text?:string}[]}[];error?:{message?:string}}
        if(!response.ok)throw new Error(payload.error?.message??`OpenAI returned ${response.status}.`)
        const text=payload.output_text??payload.output?.flatMap((item)=>item.content??[]).map((item)=>item.text??'').join('')
        if(!text?.trim())throw new Error('The model returned an empty response.')
        return {text,provider:this.id,model:this.config.model}
      }
      const response=await fetch(`${this.config.endpoint.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${this.config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.config.model,messages,temperature:.5,max_tokens:1200}),signal:controller.signal,redirect:'error'})
      const payload=await response.json() as {choices?:{message?:{content?:string}}[];error?:{message?:string}}
      if(!response.ok)throw new Error(payload.error?.message??`The model endpoint returned ${response.status}.`)
      const text=payload.choices?.[0]?.message?.content
      if(!text?.trim())throw new Error('The model returned an empty response.')
      return {text,provider:this.id,model:this.config.model}
    }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('The model request timed out after 45 seconds.');throw error}finally{clearTimeout(timeout)}
  }
}
