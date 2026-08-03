import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database'
import { MockContentAgent } from '../providers/mock-content-agent'
import { ConfiguredContentAgent } from '../providers/configured-content-agent'
import type { AgentPlatform, FactSource } from '../providers/content-agent'
import { audit } from './data-service'
import { assertSafeAgentObjective } from '../domain/agent-safety'
import { completeAi, getAiConfig } from './ai-service'
import { validateContentVariant } from '../domain/content-variant-validation'

function factualContext(): FactSource[] {
  const database=getDatabase(), sources:FactSource[]=[]
  const business=database.prepare('SELECT id, name, website, phone FROM businesses ORDER BY created_at LIMIT 1').get() as {id:string;name:string;website:string|null;phone:string|null}|undefined
  if(!business) throw new Error('Create the business profile before using the Content Producer.')
  sources.push({type:'business',id:business.id,label:business.name,facts:{name:business.name,website:business.website,phone:business.phone}})
  const location=database.prepare('SELECT id, name, city, region, hours_json FROM locations ORDER BY created_at LIMIT 1').get() as {id:string;name:string;city:string;region:string;hours_json:string}|undefined
  if(location) sources.push({type:'location',id:location.id,label:location.name,facts:{name:location.name,city:location.city,region:location.region,hours:location.hours_json}})
  const menu=database.prepare('SELECT mi.id, mi.name, mi.description, mi.price_cents, mi.currency FROM menu_items mi WHERE mi.active = 1 ORDER BY mi.updated_at DESC LIMIT 1').get() as {id:string;name:string;description:string|null;price_cents:number;currency:string}|undefined
  if(menu) sources.push({type:'menu_item',id:menu.id,label:menu.name,facts:{name:menu.name,description:menu.description,priceCents:menu.price_cents,currency:menu.currency,displayPrice:`$${(menu.price_cents/100).toFixed(2)}`,dollarPrice:`${(menu.price_cents/100).toFixed(2)} dollars`}})
  const now=Date.now(), promotion=database.prepare('SELECT id, name, description, coupon_code, starts_at, ends_at FROM promotions WHERE active = 1 AND starts_at <= ? AND ends_at > ? ORDER BY updated_at DESC LIMIT 1').get(now,now) as {id:string;name:string;description:string;coupon_code:string|null;starts_at:number;ends_at:number}|undefined
  if(promotion) sources.push({type:'promotion',id:promotion.id,label:promotion.name,facts:{name:promotion.name,description:promotion.description,couponCode:promotion.coupon_code,startsAt:promotion.starts_at,endsAt:promotion.ends_at}})
  return sources
}

export async function produceContentPackage(objective:string,platforms:AgentPlatform[]):Promise<Record<string,unknown>> {
  const database=getDatabase(), sources=factualContext(), agent=getAiConfig().provider==='local_mock'?new MockContentAgent():new ConfiguredContentAgent(completeAi)
  assertSafeAgentObjective(objective,sources)
  const result=await agent.produce({objective,platforms:[...new Set(platforms)],sources})
  if(!result.requiresHumanApproval) throw new Error('Agent output must require human approval.')
  for(const variant of result.variants){const warnings=validateContentVariant(variant.platform,variant.copy,result.sources);if(warnings.length)throw new Error(`The AI-generated ${variant.platform.replaceAll('_',' ')} draft needs factual correction before it can be saved: ${warnings.map(warning=>warning.message).join(' ')}`)}
  const business=sources.find((source)=>source.type==='business')!, id=randomUUID(), now=Date.now(), sourcePromotion=sources.find((source)=>source.type==='promotion')
  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('INSERT INTO content_items (id, business_id, promotion_id, title, brief, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id,business.id,sourcePromotion?.id??null,result.concept.slice(0,140),objective,'draft',now,now)
    const insert=database.prepare('INSERT INTO content_variants (id, content_item_id, platform, copy, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for(const variant of result.variants) insert.run(randomUUID(),id,variant.platform,variant.copy,JSON.stringify({generatedBy:result.provider,sources:result.sources.map(({type,id,label})=>({type,id,label})),mediaPrompts:result.mediaPrompts,suggestedTiming:result.suggestedTiming,requiresHumanApproval:true}),now,now)
    database.exec('COMMIT')
  } catch(error){database.exec('ROLLBACK');throw error}
  audit('agent.content_package.created','content_items',id,{provider:result.provider,platforms:result.variants.map((variant)=>variant.platform),sourceIds:result.sources.map((source)=>source.id),requiresHumanApproval:true})
  return {contentItemId:id,provider:result.provider,concept:result.concept,variantCount:result.variants.length,mediaPrompts:result.mediaPrompts,suggestedTiming:result.suggestedTiming,sources:result.sources.map(({type,id,label})=>({type,id,label})),status:'draft',requiresHumanApproval:true}
}
