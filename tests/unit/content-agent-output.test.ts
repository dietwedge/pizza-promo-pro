import { describe, expect, it } from 'vitest'
import { parseContentAgentOutput } from '../../src/main/domain/content-agent-output'
import type { FactSource } from '../../src/main/providers/content-agent'
import { ConfiguredContentAgent } from '../../src/main/providers/configured-content-agent'

const sources:FactSource[]=[{type:'business',id:'business-1',label:'The Pizza Shoppe',facts:{name:'The Pizza Shoppe'}}]
const packageJson=(variants:unknown[])=>JSON.stringify({concept:'Friday pizza night',variants,mediaPrompts:[{kind:'image',prompt:'Photograph the real pizza on the saved shop table.'}],suggestedTiming:{rationale:'Confirm against the saved store schedule.',localHour:17}})

describe('configured content-agent output',()=>{
  it('accepts one finished customer-facing caption per requested platform',()=>{
    const result=parseContentAgentOutput(packageJson([{platform:'facebook',copy:'Friday calls for pizza. Order directly from The Pizza Shoppe.'},{platform:'instagram',copy:'Friday calls for pizza. Order from The Pizza Shoppe.\n\n#Pizza'}]),['facebook','instagram'],'openai','gpt-test',sources)
    expect(result.variants).toHaveLength(2)
    expect(result.provider).toBe('openai:gpt-test')
    expect(result.requiresHumanApproval).toBe(true)
  })

  it('rejects assistant planning scaffolding before persistence',()=>{
    expect(()=>parseContentAgentOutput(packageJson([{platform:'facebook',copy:'Post Idea 1: BOGO\n**Theme:** drive immediate sales'}]),['facebook'],'openai','gpt-test',sources)).toThrow(/planning notes/i)
    expect(()=>parseContentAgentOutput(packageJson([{platform:'facebook',copy:'## Caption\nFriday pizza.'}]),['facebook'],'openai','gpt-test',sources)).toThrow(/planning notes/i)
  })

  it('rejects missing, duplicate, and over-limit platform output',()=>{
    expect(()=>parseContentAgentOutput(packageJson([{platform:'facebook',copy:'Friday pizza.'}]),['facebook','instagram'],'openai','gpt-test',sources)).toThrow(/did not create drafts/i)
    expect(()=>parseContentAgentOutput(packageJson([{platform:'x',copy:'A'.repeat(281)}]),['x'],'openai','gpt-test',sources)).toThrow(/280-character limit/i)
    expect(()=>parseContentAgentOutput(packageJson([{platform:'facebook',copy:'Friday pizza.'},{platform:'facebook',copy:'Another post.'}]),['facebook'],'openai','gpt-test',sources)).toThrow(/duplicate/i)
  })

  it('uses the configured model as a final-copy writer with strategy separated from output',async()=>{
    let messages:readonly {role:string;content:string}[]=[]
    const agent=new ConfiguredContentAgent(async(input)=>{messages=input;return {provider:'ollama',model:'local-model',text:packageJson([{platform:'facebook',copy:'Friday calls for pizza. Order from The Pizza Shoppe.'}])}})
    const result=await agent.produce({objective:'Theme: Increase Friday dinner orders',platforms:['facebook'],sources})
    expect(messages[0]?.content).toContain('final-copy writer')
    expect(messages[1]?.content).toContain('direction')
    expect(result.variants[0]?.copy).not.toContain('Theme:')
  })
})
