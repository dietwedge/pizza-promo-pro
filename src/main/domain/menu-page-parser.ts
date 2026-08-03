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

function balancedObject(source:string,start:number):string|undefined{
  if(source[start]!=='{')return undefined
  let depth=0,inString=false,escaped=false
  for(let index=start;index<source.length;index++){
    const character=source[index]
    if(inString){if(escaped)escaped=false;else if(character==='\\')escaped=true;else if(character==='"')inString=false;continue}
    if(character==='"'){inString=true;continue}
    if(character==='{')depth++
    if(character==='}'&&--depth===0)return source.slice(start,index+1)
  }
  return undefined
}

function nextFlightItems(html:string):MenuPreviewItem[]{
  const payloads:string[]=[]
  for(const match of html.matchAll(/<script>self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/gi)){
    try{const parsed=JSON.parse(match[1]??'') as unknown;if(Array.isArray(parsed)&&typeof parsed[1]==='string')payloads.push(parsed[1])}catch{/* Ignore malformed framework payloads. */}
  }
  const currency=payloads.join('').match(/"defaultCurrency":"([A-Z]{3})"/)?.[1]??'USD',items:MenuPreviewItem[]=[]
  for(const payload of payloads){
    let cursor=0
    while((cursor=payload.indexOf('"menu":{"categories":',cursor))>=0){
      const start=cursor+'"menu":'.length,object=balancedObject(payload,start)
      cursor=start+1
      if(!object)continue
      try{
        const menu=JSON.parse(object) as {items?:unknown}
        if(!Array.isArray(menu.items))continue
        for(const value of menu.items){
          if(!value||typeof value!=='object')continue
          const item=value as Record<string,unknown>,name=typeof item.name==='string'?decode(item.name):''
          if(!name||item.available===false)continue
          items.push({name,description:typeof item.description==='string'?decode(item.description):'',priceCents:typeof item.price==='number'&&Number.isInteger(item.price)&&item.price>=0?item.price:null,currency,selected:true})
        }
      }catch{/* Ignore malformed or changed framework menu payloads. */}
    }
  }
  return items
}

export function parseMenuPage(html:string):MenuPreviewItem[]{
  const items:MenuPreviewItem[]=[]
  for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const source=match[1];if(source)structuredItems(JSON.parse(source.trim()) as unknown,items)}catch{/* Ignore malformed third-party structured data. */}}
  if(!items.length)items.push(...nextFlightItems(html))
  if(!items.length){const text=html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi,'\n');for(const line of text.split(/\n+/).map(decode)){const match=line.match(/^(.{2,120}?)\s+\$\s?(\d+(?:\.\d{1,2})?)(?:\s|$)/);if(match?.[1]&&match[2])items.push({name:match[1].trim(),description:'',priceCents:priceCents(match[2]),currency:'USD',selected:true})}}
  const seen=new Set<string>();return items.filter(item=>{const key=item.name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).slice(0,200)
}
