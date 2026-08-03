import { z } from 'zod'
import { platformCopyLimits } from '../../shared/platform-copy'
import type { AgentPlatform, ContentAgentResult, FactSource } from '../providers/content-agent'

const planningScaffolding = /\*{0,2}\b(?:post\s+idea\s*\d*|theme|focus|suggested\s+caption\s+angle|visual\s+suggestion|strategy|rationale)\s*\*{0,2}\s*:/i
const markdownHeading = /(?:^|\n)\s{0,3}#{1,6}\s+\S/m
const genericFiller = /\b(?:delicious deal in town|taste the love|whether you crave|get ready for (?:the )?deliciousness)\b/i
const resultSchema = z.object({
  concept: z.string().trim().min(3).max(140),
  creativeBrief:z.object({audience:z.string().trim().min(3).max(240),message:z.string().trim().min(3).max(500),tone:z.string().trim().min(3).max(240),callToAction:z.string().trim().min(3).max(240),visualDirection:z.string().trim().min(20).max(1200)}).strict(),
  variants: z.array(z.object({platform:z.string(),copy:z.string().trim().min(3)})).min(1),
  mediaPrompts: z.array(z.object({kind:z.enum(['image','video']),prompt:z.string().trim().min(10).max(1200)})).max(4).default([]),
  suggestedTiming: z.object({rationale:z.string().trim().min(3).max(500),localHour:z.number().int().min(0).max(23)}).default({rationale:'Choose a time that matches the shop schedule.',localHour:17})
}).strict()

function jsonObject(text:string):unknown{
  const match=text.match(/\{[\s\S]*\}/)
  if(!match)throw new Error('The AI did not return a structured content package. Try again.')
  try{return JSON.parse(match[0])}catch{throw new Error('The AI content package could not be read. Try again.')}
}

function assertPublishable(value:string,label:string):void{
  if(planningScaffolding.test(value)||markdownHeading.test(value))throw new Error(`${label} contains planning notes instead of finished customer-facing copy. Try again.`)
  if(genericFiller.test(value))throw new Error(`${label} uses generic promotional filler instead of the campaign's specific direction. Try again.`)
}

export function parseContentAgentOutput(text:string,requested:readonly AgentPlatform[],provider:string,model:string,sources:readonly FactSource[]):ContentAgentResult{
  const parsed=resultSchema.parse(jsonObject(text)),requestedUnique=[...new Set(requested)],received=new Set<string>()
  assertPublishable(parsed.concept,'The package title')
  const variants=parsed.variants.map(({platform,copy})=>{
    if(!requestedUnique.includes(platform as AgentPlatform)||received.has(platform))throw new Error('The AI returned an unexpected or duplicate platform draft.')
    const typed=platform as AgentPlatform,limit=platformCopyLimits[typed]
    if(copy.length>limit)throw new Error(`The ${typed.replaceAll('_',' ')} draft exceeds its ${limit}-character limit.`)
    assertPublishable(copy,`The ${typed.replaceAll('_',' ')} draft`);received.add(platform)
    return {platform:typed,copy}
  })
  const missing=requestedUnique.filter(platform=>!received.has(platform));if(missing.length)throw new Error(`The AI did not create drafts for: ${missing.join(', ')}.`)
  return {provider:`${provider}:${model}`,concept:parsed.concept,creativeBrief:parsed.creativeBrief,variants,mediaPrompts:parsed.mediaPrompts,suggestedTiming:parsed.suggestedTiming,sources,requiresHumanApproval:true}
}
