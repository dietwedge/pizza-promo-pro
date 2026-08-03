import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { saveRecord } from './data-service'
import { detectMenuProvider, parseMenuPage, type MenuPreviewItem, type MenuProvider } from '../domain/menu-page-parser'

const MAX_BYTES=2*1024*1024
const providerLabels:Record<MenuProvider,string>={clover:'Clover',square:'Square',slice:'Slice',toast:'Toast',other:'Public menu'}

function isPrivateAddress(address:string):boolean{
  const normalized=address.toLowerCase().replace(/^::ffff:/,'')
  if(normalized==='::1'||normalized==='0.0.0.0')return true
  if(normalized.includes(':'))return normalized.startsWith('fc')||normalized.startsWith('fd')||normalized.startsWith('fe8')||normalized.startsWith('fe9')||normalized.startsWith('fea')||normalized.startsWith('feb')
  const parts=normalized.split('.').map(Number)
  const first=parts[0]??-1,second=parts[1]??-1
  return first===10||first===127||first===0||(first===169&&second===254)||(first===172&&second>=16&&second<=31)||(first===192&&second===168)
}

async function validatePublicUrl(raw:string):Promise<URL>{
  const url=new URL(raw)
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Enter a public HTTP or HTTPS menu URL without embedded credentials.')
  if(url.hostname==='localhost'||url.hostname.endsWith('.local'))throw new Error('Local and private network addresses cannot be imported.')
  const addresses=isIP(url.hostname)?[{address:url.hostname}]:await lookup(url.hostname,{all:true,verbatim:true})
  if(!addresses.length||addresses.some(item=>isPrivateAddress(item.address)))throw new Error('Local and private network addresses cannot be imported.')
  return url
}

async function fetchMenuPage(raw:string):Promise<{html:string;url:string}>{
  let current=raw
  for(let redirects=0;redirects<=3;redirects++){
    const url=await validatePublicUrl(current),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15_000)
    try{
      const response=await fetch(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html,application/xhtml+xml,application/json;q=0.9','User-Agent':'PizzaPromoPro/0.1 menu-import'}})
      if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw new Error('The menu URL redirected without a destination.');current=new URL(location,url).toString();continue}
      if(!response.ok)throw new Error(`The menu page returned HTTP ${response.status}.`)
      const type=(response.headers.get('content-type')??'').toLowerCase()
      if(!type.includes('html')&&!type.includes('json'))throw new Error('The URL did not return an HTML or JSON menu page.')
      const declared=Number(response.headers.get('content-length')??0)
      if(declared>MAX_BYTES)throw new Error('The menu page is larger than the 2 MB import limit.')
      const bytes=new Uint8Array(await response.arrayBuffer())
      if(bytes.byteLength>MAX_BYTES)throw new Error('The menu page is larger than the 2 MB import limit.')
      return {html:new TextDecoder().decode(bytes),url:url.toString()}
    }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('The menu page took too long to respond.');throw error}
    finally{clearTimeout(timeout)}
  }
  throw new Error('The menu URL redirected too many times.')
}

export async function previewMenuUrl(url:string):Promise<{sourceUrl:string;provider:MenuProvider;providerLabel:string;items:MenuPreviewItem[];message:string}>{
  const page=await fetchMenuPage(url),provider=detectMenuProvider(page.url),providerLabel=providerLabels[provider],items=parseMenuPage(page.html)
  return {sourceUrl:page.url,provider,providerLabel,items,message:items.length?`${providerLabel} menu found: ${items.length} possible item${items.length===1?'':'s'}. Review names and prices before importing.`:`No menu items were found on this ${providerLabel} page. Make sure the URL opens the public ordering menu—not the account dashboard—and try again.`}
}

export function importMenuItems(items:Array<{name:string;description:string;priceCents:number;currency:string}>):{imported:number}{
  for(const item of items)saveRecord('menuItems',{name:item.name,description:item.description,priceCents:item.priceCents,currency:item.currency})
  return {imported:items.length}
}
