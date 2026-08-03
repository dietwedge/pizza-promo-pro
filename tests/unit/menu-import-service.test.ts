import { describe,expect,it,vi } from 'vitest'

vi.mock('electron',()=>({app:{getPath:()=>process.cwd()}}))

import { detectMenuProvider, parseMenuPage } from '../../src/main/domain/menu-page-parser'

describe('menu page extraction',()=>{
  it('identifies supported ordering storefront URLs without trusting lookalike domains',()=>{
    expect(detectMenuProvider('https://shop.cloveronline.com/menu/all')).toBe('clover')
    expect(detectMenuProvider('https://pizzeria.square.site/s/order')).toBe('square')
    expect(detectMenuProvider('https://www.slicelife.com/restaurants/ny/pizza/menu')).toBe('slice')
    expect(detectMenuProvider('https://order.toasttab.com/online/pizza')).toBe('toast')
    expect(detectMenuProvider('https://toasttab.com.attacker.example/menu')).toBe('other')
  })
  it('extracts reviewable Schema.org menu items without inventing missing prices',()=>{
    const html=`<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"MenuItem","name":"Margherita Pizza","description":"Tomato, mozzarella &amp; basil","offers":{"price":"14.99","priceCurrency":"USD"}},{"@type":"MenuItem","name":"Market Price Special","description":"Ask the shop"}]}</script>`
    expect(parseMenuPage(html)).toEqual([
      {name:'Margherita Pizza',description:'Tomato, mozzarella & basil',priceCents:1499,currency:'USD',selected:true},
      {name:'Market Price Special',description:'Ask the shop',priceCents:null,currency:'USD',selected:true}
    ])
  })

  it('uses a conservative visible-price fallback and removes duplicates',()=>{
    expect(parseMenuPage('<div>Pepperoni Pizza $18.50</div><div>Pepperoni Pizza $18.50</div>')).toEqual([{name:'Pepperoni Pizza',description:'',priceCents:1850,currency:'USD',selected:true}])
  })

  it('extracts available Clover items and cent prices from a Next.js flight payload',()=>{
    const flight='2c:[["$","component",null,{"merchant":{"defaultCurrency":"USD"},"menu":{"categories":{"PIZZA":{"id":"PIZZA","name":"Pizza","items":["CHEESE","SOLD"]}},"items":[{"id":"CHEESE","name":"Classic Cheese Pizza","itemType":"REGULAR","description":"Detroit-style pan pizza with crispy cheese edges","price":1950,"available":true},{"id":"SOLD","name":"Sold Out Slice","description":"Not available","price":500,"available":false},{"id":"MARKET","name":"Market Price Special","description":null,"price":null,"available":true}]}}]]'
    const html=`<script>self.__next_f=(self.__next_f||[])</script><script>self.__next_f.push(${JSON.stringify([1,flight])})</script>`
    expect(parseMenuPage(html)).toEqual([
      {name:'Classic Cheese Pizza',description:'Detroit-style pan pizza with crispy cheese edges',priceCents:1950,currency:'USD',selected:true},
      {name:'Market Price Special',description:'',priceCents:null,currency:'USD',selected:true}
    ])
  })
})
