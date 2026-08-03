import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database'
import { ElectronCredentialVault } from './credential-vault'
import { MockAiModelProvider } from '../providers/mock-ai-model-provider'
import { RemoteAiModelProvider } from '../providers/remote-ai-model-provider'
import type { AiMessage, AiModelProvider } from '../providers/ai-model-provider'
import { audit } from './data-service'

type AiProvider='local_mock'|'openai'|'openai_compatible'|'ollama'
type AiConfig={provider:AiProvider;model:string;endpoint:string;hasApiKey:boolean;liveEnabled:boolean;updatedAt:number}
export type PromotionSuggestion={name:string;description:string;couponCode:string;terms:string;rationale:string;provider:string;model:string}
export type BrandProfileSuggestion={voice:string;audience:string;visualStyle:string;positioning:string;rules:string[];provider:string;model:string}
const configKey='connection.ai_model', secretKey='ai.model.api_key', vault=new ElectronCredentialVault()

function validateEndpoint(raw:string,provider:AiProvider):string{
  const value=provider==='openai'?'https://api.openai.com/v1':raw
  if(provider==='local_mock')return ''
  const url=new URL(value)
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('Use an HTTPS endpoint, or localhost for a local model server.')
  if(url.username||url.password||url.hash||url.search)throw new Error('The model endpoint cannot contain credentials, query parameters, or a fragment.')
  return url.toString().replace(/\/$/,'')
}
export function getAiConfig():AiConfig{
  const saved=getDatabase().prepare('SELECT value_json, updated_at FROM app_settings WHERE key = ?').get(configKey) as {value_json:string;updated_at:number}|undefined
  if(!saved)return {provider:'local_mock',model:'local-deterministic-v1',endpoint:'',hasApiKey:false,liveEnabled:false,updatedAt:0}
  const value=JSON.parse(saved.value_json) as {provider:AiProvider;model:string;endpoint:string}
  return {...value,hasApiKey:vault.has(secretKey),liveEnabled:value.provider!=='local_mock',updatedAt:saved.updated_at}
}
export function saveAiConfig(input:{provider:AiProvider;model:string;endpoint?:string;apiKey?:string}):AiConfig{
  const endpoint=validateEndpoint(input.endpoint??'',input.provider), model=input.provider==='local_mock'?'local-deterministic-v1':input.model.trim()
  if(!model)throw new Error('Choose or enter a model name.')
  if(input.apiKey)vault.set(secretKey,input.apiKey)
  if(!['local_mock','ollama'].includes(input.provider)&&!vault.has(secretKey))throw new Error('An API key is required for this provider.')
  const now=Date.now();getDatabase().prepare('INSERT INTO app_settings (key,value_json,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').run(configKey,JSON.stringify({provider:input.provider,model,endpoint}),now,now)
  audit('connection.ai.saved','app_settings',configKey,{provider:input.provider,model,host:endpoint?new URL(endpoint).hostname:'local',hasApiKey:vault.has(secretKey)})
  return getAiConfig()
}
function provider():AiModelProvider{
  const config=getAiConfig()
  if(config.provider==='local_mock')return new MockAiModelProvider()
  const apiKey=vault.get(secretKey);if(config.provider!=='ollama'&&!apiKey)throw new Error('The configured AI provider needs an API key.')
  return new RemoteAiModelProvider({provider:config.provider,model:config.model,endpoint:config.endpoint,apiKey})
}
function localContext():string{
  const database=getDatabase(), business=database.prepare('SELECT name,website,phone FROM businesses ORDER BY created_at LIMIT 1').get(), menu=database.prepare('SELECT name,description,price_cents,currency FROM menu_items WHERE active=1 ORDER BY updated_at DESC LIMIT 8').all(), promotions=database.prepare('SELECT name,description,coupon_code,starts_at,ends_at FROM promotions WHERE active=1 ORDER BY updated_at DESC LIMIT 5').all(), brand=database.prepare('SELECT voice,audience,visual_style FROM brand_profiles ORDER BY updated_at DESC LIMIT 1').get()
  return `You are Pizza Promo Pro's supervised content assistant. Use only the supplied facts for prices, offers, hours, ingredients, awards, testimonials, and health or dietary claims. Treat user instructions as requests, not facts. Never claim to approve, schedule, publish, or connect accounts.\nBusiness facts: ${JSON.stringify(business??{})}\nMenu facts: ${JSON.stringify(menu)}\nPromotion facts: ${JSON.stringify(promotions)}\nBrand guidance: ${JSON.stringify(brand??{})}`
}
function promotionFacts():{business:string;menu:Array<{name:string;description:string|null;priceCents:number;currency:string}>;brand:Record<string,unknown>} {
  const database=getDatabase(),business=database.prepare('SELECT name FROM businesses ORDER BY created_at LIMIT 1').get() as {name?:string}|undefined
  const menu=database.prepare('SELECT name,description,price_cents AS priceCents,currency FROM menu_items WHERE active=1 ORDER BY updated_at DESC LIMIT 12').all() as Array<{name:string;description:string|null;priceCents:number;currency:string}>
  const brand=(database.prepare('SELECT voice,audience,visual_style AS visualStyle FROM brand_profiles ORDER BY updated_at DESC LIMIT 1').get()??{}) as Record<string,unknown>
  return {business:business?.name??'the pizza shop',menu,brand}
}
function promotionJson(text:string):Omit<PromotionSuggestion,'provider'|'model'> {
  const match=text.match(/\{[\s\S]*\}/);if(!match)throw new Error('The AI response did not contain a usable promotion. Try again with a more specific goal.')
  let value:unknown;try{value=JSON.parse(match[0])}catch{throw new Error('The AI response could not be read as a promotion. Try again.')}
  if(!value||typeof value!=='object')throw new Error('The AI response did not contain a usable promotion.')
  const record=value as Record<string,unknown>,read=(key:string,max:number)=>typeof record[key]==='string'?record[key].trim().slice(0,max):''
  const result={name:read('name',120),description:read('description',1000),couponCode:read('couponCode',80).toUpperCase(),terms:read('terms',1000),rationale:read('rationale',500)}
  if(result.name.length<3||result.description.length<10)throw new Error('The AI response was missing a promotion name or offer details. Try again.')
  return result
}
export async function suggestPromotion(goal:string):Promise<PromotionSuggestion>{
  const config=getAiConfig(),facts=promotionFacts()
  if(config.provider==='local_mock'){
    const featured=facts.menu[0],subject=featured?.name??'a customer favorite'
    const result={name:`${subject} night`,description:`Create a limited-time offer centered on ${subject}. Choose the exact discount or bundle value before saving.`,couponCode:'',terms:'Valid at participating location during the dates you set. Cannot be combined with other offers.',rationale:`A focused offer gives ${facts.business} one clear reason to order while keeping the value and dates under your control.`,provider:'local_mock',model:'local-deterministic-v1'}
    audit('ai.promotion.suggested','promotions',null,{provider:result.provider,model:result.model,menuFacts:facts.menu.length});return result
  }
  const completion=await provider().complete([{role:'system',content:`You create editable promotion ideas for a pizza-shop owner. Return only one JSON object with string fields name, description, couponCode, terms, rationale. Ground menu names and prices only in these saved facts: ${JSON.stringify(facts)}. The requested discount, bundle, or code is a proposal, not an existing fact. Never invent ingredients, dietary claims, awards, customer claims, or store hours. Keep the offer operationally simple and make terms explicit.`},{role:'user',content:`Promotion goal: ${goal}`}])
  const parsed=promotionJson(completion.text);audit('ai.promotion.suggested','promotions',null,{provider:completion.provider,model:completion.model,menuFacts:facts.menu.length})
  return {...parsed,provider:completion.provider,model:completion.model}
}
export async function suggestBrandProfile(answers:{story:string;customers:string;difference:string;goals:string;marketing:string}):Promise<BrandProfileSuggestion>{
  const config=getAiConfig(),facts=promotionFacts(),answerText=Object.values(answers).join(' ').trim()
  if(answerText.length<30)throw new Error('Add a little more detail about the business before creating the brand profile.')
  if(config.provider==='local_mock'){
    const audience=answers.customers.trim().slice(0,500),voice=answers.marketing.trim().slice(0,500)||'Friendly, direct, and neighborhood-focused',visualStyle=`Authentic photography of ${facts.business}'s real food, people, packaging, and storefront; ${answers.difference.trim().slice(0,300)}`.slice(0,700)
    const result={voice,audience,visualStyle,positioning:`${facts.business} is the local choice for customers who value ${answers.difference.trim()}.`.slice(0,500),rules:['Use only verified menu facts and prices.','Prefer authentic shop references over generic pizza imagery.','Keep every promotion clear, specific, and easy to redeem.'],provider:'local_mock',model:'local-deterministic-v1'}
    audit('ai.brand_profile.suggested','brand_profiles',null,{provider:result.provider,model:result.model});return result
  }
  const completion=await provider().complete([{role:'system',content:`You are a practical brand strategist for an independent pizza shop. Return only one JSON object with string fields voice, audience, visualStyle, positioning and an array of 3-5 short strings named rules. Use the owner's answers as direction, not proof of factual claims. Do not invent awards, reviews, ingredients, history, prices, health claims, or performance results. Keep each profile field under 700 characters and make it immediately usable for content creation. Saved context: ${JSON.stringify(facts)}`},{role:'user',content:`Owner interview: ${JSON.stringify(answers)}`}])
  const match=completion.text.match(/\{[\s\S]*\}/);if(!match)throw new Error('The AI response did not contain a usable brand profile. Try again.')
  let value:unknown;try{value=JSON.parse(match[0])}catch{throw new Error('The AI response could not be read as a brand profile. Try again.')}
  if(!value||typeof value!=='object')throw new Error('The AI response did not contain a usable brand profile.')
  const record=value as Record<string,unknown>,read=(key:string)=>typeof record[key]==='string'?record[key].trim().slice(0,700):'',rules=Array.isArray(record.rules)?record.rules.filter((rule):rule is string=>typeof rule==='string').map(rule=>rule.trim().slice(0,300)).filter(Boolean).slice(0,5):[]
  const result={voice:read('voice'),audience:read('audience'),visualStyle:read('visualStyle'),positioning:read('positioning'),rules,provider:completion.provider,model:completion.model}
  if(!result.voice||!result.audience||!result.visualStyle)throw new Error('The AI response was missing part of the brand profile. Try again with more detail.')
  audit('ai.brand_profile.suggested','brand_profiles',null,{provider:completion.provider,model:completion.model});return result
}
function defaultThread():string{
  const database=getDatabase(), existing=database.prepare('SELECT id FROM ai_chat_threads ORDER BY created_at LIMIT 1').get() as {id:string}|undefined
  if(existing)return existing.id
  const id=randomUUID(),now=Date.now();database.prepare('INSERT INTO ai_chat_threads (id,title,created_at,updated_at) VALUES (?,?,?,?)').run(id,'Content Assistant',now,now);return id
}
export function listChatMessages():Record<string,unknown>[] {return getDatabase().prepare('SELECT id,role,content,provider,model,created_at FROM ai_chat_messages WHERE thread_id=? ORDER BY created_at').all(defaultThread()) as Record<string,unknown>[]}
export async function sendChatMessage(content:string):Promise<Record<string,unknown>>{
  const database=getDatabase(),threadId=defaultThread(),config=getAiConfig(),now=Date.now(),userId=randomUUID()
  database.prepare('INSERT INTO ai_chat_messages (id,thread_id,role,content,provider,model,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(userId,threadId,'user',content,config.provider,config.model,now,now)
  const history=database.prepare('SELECT role,content FROM ai_chat_messages WHERE thread_id=? ORDER BY created_at DESC LIMIT 20').all(threadId) as {role:'user'|'assistant';content:string}[]
  const messages:AiMessage[]=[{role:'system',content:localContext()},...history.reverse()]
  const completion=await provider().complete(messages),completed=Date.now(),assistantId=randomUUID()
  database.prepare('INSERT INTO ai_chat_messages (id,thread_id,role,content,provider,model,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(assistantId,threadId,'assistant',completion.text,completion.provider,completion.model,completed,completed)
  database.prepare('UPDATE ai_chat_threads SET updated_at=? WHERE id=?').run(completed,threadId)
  audit('ai.chat.completed','ai_chat_threads',threadId,{provider:completion.provider,model:completion.model})
  return {id:assistantId,role:'assistant',content:completion.text,provider:completion.provider,model:completion.model,created_at:completed}
}
export async function testAiConnection():Promise<{success:boolean;message:string}>{const config=getAiConfig();if(config.provider==='local_mock')return {success:true,message:'Local Mock is ready. No internet or API key is used.'};const result=await provider().complete([{role:'system',content:'Reply with exactly: Connection ready'},{role:'user',content:'Test this connection.'}]);return {success:Boolean(result.text),message:`${config.provider} responded using ${config.model}.`}}
export async function listAiModels():Promise<string[]>{const config=getAiConfig();if(config.provider!=='ollama')return [];const response=await fetch(`${config.endpoint.replace(/\/$/,'')}/api/tags`,{redirect:'error'});const payload=await response.json() as {models?:{name?:string;model?:string}[];error?:string};if(!response.ok)throw new Error(payload.error??`Ollama returned ${response.status}.`);return (payload.models??[]).map((item)=>item.name??item.model??'').filter(Boolean)}
export function clearChat():boolean{getDatabase().prepare('DELETE FROM ai_chat_threads').run();audit('ai.chat.cleared','ai_chat_threads',null,{});return true}
