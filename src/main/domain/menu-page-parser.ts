export type MenuPreviewItem={name:string;description:string;priceCents:number|null;currency:string;selected:boolean}

function decode(value:string):string{return value.replace(/<[^>]+>/g,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim()}
function priceCents(value:unknown):number|null{if(typeof value==='number'&&Number.isFinite(value))return Math.round(value*100);if(typeof value!=='string')return null;const match=value.replace(/,/g,'').match(/\d+(?:\.\d{1,2})?/);return match?Math.round(Number(match[0])*100):null}

function structuredItems(value:unknown,items:MenuPreviewItem[]):void{
  if(Array.isArray(value)){value.forEach(item=>structuredItems(item,items));return}
  if(!value||typeof value!=='object')return
  const record=value as Record<string,unknown>,types=Array.isArray(record['@type'])?record['@type']:[record['@type']]
  if(types.some(type=>type==='MenuItem'||type==='Product')){
    const offers=Array.isArray(record.offers)?record.offers[0]:record.offers,offer=offers&&typeof offers==='object'?offers as Record<string,unknown>:{},name=typeof record.name==='string'?decode(record.name):''
    if(name)items.push({name,description:typeof record.description==='string'?decode(record.description):'',priceCents:priceCents(offer.price??record.price),currency:typeof offer.priceCurrency==='string'?offer.priceCurrency.toUpperCase():'USD',selected:true})
  }
  for(const child of Object.values(record))if(child&&typeof child==='object')structuredItems(child,items)
}

export function parseMenuPage(html:string):MenuPreviewItem[]{
  const items:MenuPreviewItem[]=[]
  for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const source=match[1];if(source)structuredItems(JSON.parse(source.trim()) as unknown,items)}catch{/* Ignore malformed third-party structured data. */}}
  if(!items.length){const text=html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi,'\n');for(const line of text.split(/\n+/).map(decode)){const match=line.match(/^(.{2,120}?)\s+\$\s?(\d+(?:\.\d{1,2})?)(?:\s|$)/);if(match?.[1]&&match[2])items.push({name:match[1].trim(),description:'',priceCents:priceCents(match[2]),currency:'USD',selected:true})}}
  const seen=new Set<string>();return items.filter(item=>{const key=item.name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).slice(0,200)
}
