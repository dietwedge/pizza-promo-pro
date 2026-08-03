import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../src/renderer/src/App'

describe('desktop app shell', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'pizzaSocial', { configurable: true, value: { invoke: vi.fn(async (channel: string, request?: unknown) => {
      if (channel === 'app:getInfo') return { ok: true, data: { name: 'Pizza Promo Pro', version: '0.1.0', online: true, platform: 'test' } }
      if (channel === 'updates:getStatus') return { ok: true, data: { state: 'unavailable', currentVersion: '0.1.0', availableVersion: null, progressPercent: null, message: 'Update checks are available in installed builds.' } }
      if (channel === 'ai:getConfig') return { ok: true, data: { provider: 'local_mock', model: 'local-deterministic-v1', endpoint: '', hasApiKey: false, liveEnabled: false, updatedAt: 0 } }
      if (channel === 'ai:suggestPromotion') return {ok:true,data:{name:'Tuesday Family Pizza Night',description:'Pair a large cheese pizza with a family add-on at a value you approve.',couponCode:'TUESDAY',terms:'Tuesdays only during the dates shown. Cannot be combined with other offers.',rationale:'A clear weekday occasion is easy to explain.',provider:'local_mock',model:'local-deterministic-v1'}}
      if (channel === 'ai:suggestBrandProfile') return {ok:true,data:{voice:'Warm, direct, neighborhood-focused',audience:'Local families and nearby workers',visualStyle:'Authentic food and storefront photography',positioning:'The neighborhood pizza shop for dependable local nights.',rules:['Use verified prices','Show the real pizza'],provider:'local_mock',model:'local-deterministic-v1'}}
      if (channel === 'onboarding:getStatus') return { ok: true, data: { shouldShow: false, dismissed: false, completionPercent: 50, essentialComplete: true, steps: [
        {id:'business',label:'Business profile',status:'complete',description:'Shop facts',target:'businesses'},{id:'location',label:'Store location',status:'complete',description:'Address and hours',target:'locations'},{id:'brand',label:'Brand profile',status:'complete',description:'Voice',target:'brandProfiles'},{id:'menu',label:'Menu facts',status:'complete',description:'Menu',target:'menuItems'},
        {id:'ai',label:'AI content provider',status:'optional',description:'AI',target:'settings'},{id:'organicConnections',label:'Social accounts',status:'optional',description:'Social',target:'settings'},{id:'mediaProvider',label:'Higgsfield media provider',status:'optional',description:'Media',target:'settings'},{id:'adAccounts',label:'Advertising account',status:'optional',description:'Ads',target:'ads'}] } }
      if (channel === 'data:list' && (request as {entity?:string})?.entity === 'businesses') return { ok: true, data: [{ id:'11111111-1111-4111-8111-111111111111', name:'The Pizza Shoppe', email:'pizza@example.com' }] }
      return { ok: true, data: [] }
    }) } })
  })

  it('uses plain-English navigation and labels mock providers', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Business profile' })).toBeVisible()
    expect(await screen.findByText(/Mock providers/i)).toBeVisible()
    expect(screen.getByText('Human approval required')).toBeVisible()
  })

  it('shows every provider setup path in Settings', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(await screen.findByText('Social media accounts')).toBeVisible()
    expect(screen.getByText('Google Business Profile')).toBeVisible()
    expect(screen.getByText('Instagram')).toBeVisible()
    expect(screen.getByText('Higgsfield MCP connection')).toBeVisible()
    expect(screen.getByText('Higgsfield account')).toBeVisible()
    expect(screen.getByRole('button',{name:'Sign in with Higgsfield'})).toBeVisible()
    expect(screen.getByText('Live adapters off')).toBeVisible()
    expect(screen.getByText('AI Content Provider')).toBeVisible()
    expect(screen.getByText('Pizza Promo Pro updates')).toBeVisible()
    expect(screen.getByRole('button', { name: /Check for updates/i })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Ollama — local AI' })).toBeVisible()
  })

  it('shows Higgsfield connection progress and the result beside the button', async () => {
    let finishCheck: ((value: {ok:true;data:{valid:boolean;message:string;liveVerified:boolean}})=>void)|undefined
    const invokeMock=vi.fn(async (channel:string)=>{
      if(channel==='app:getInfo')return {ok:true,data:{name:'Pizza Promo Pro',version:'0.1.0',online:true,platform:'test'}}
      if(channel==='updates:getStatus')return {ok:true,data:{state:'unavailable',currentVersion:'0.1.0',availableVersion:null,progressPercent:null,message:'Unavailable in tests.'}}
      if(channel==='ai:getConfig')return {ok:true,data:{provider:'local_mock',model:'local-deterministic-v1',endpoint:'',hasApiKey:false,liveEnabled:false,updatedAt:0}}
      if(channel==='onboarding:getStatus')return {ok:true,data:{shouldShow:false,dismissed:true,completionPercent:100,essentialComplete:true,steps:[]}}
      if(channel==='connections:list')return {ok:true,data:[{id:'connection.higgsfield_mcp',kind:'higgsfield_mcp',provider:'higgsfield',displayName:'Higgsfield MCP',endpoint:'https://example.com/mcp',status:'configured',liveEnabled:false,hasSecret:false,updatedAt:1}]}
      if(channel==='connections:check')return new Promise(resolve=>{finishCheck=resolve})
      return {ok:true,data:[]}
    })
    Object.defineProperty(window,'pizzaSocial',{configurable:true,value:{invoke:invokeMock}})
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Settings'}))
    const checkButton=await screen.findByRole('button',{name:'Check connection'})
    fireEvent.click(checkButton)
    expect(await screen.findByRole('button',{name:'Checking…'})).toBeDisabled()
    expect(screen.getByText('Contacting the MCP server…')).toBeVisible()
    finishCheck?.({ok:true,data:{valid:true,message:'Connected to Higgsfield. 4 tools available; no tools were run.',liveVerified:true}})
    expect(await screen.findByText('Connected to Higgsfield. 4 tools available; no tools were run.')).toBeVisible()
  })

  it('requires a Higgsfield cost estimate before supervised generation',async()=>{
    const item={id:'11111111-1111-4111-8111-111111111111',title:'Friday special',brief:'Create a warm overhead photograph of our Friday pizza special.',status:'draft',updated_at:1,variants:[],generationJobs:[]}
    const referenceId='55555555-5555-4555-8555-555555555555'
    const invokeMock=vi.fn(async(channel:string,request?:unknown)=>{
      if(channel==='app:getInfo')return {ok:true,data:{name:'Pizza Promo Pro',version:'0.1.0',online:true,platform:'test'}}
      if(channel==='onboarding:getStatus')return {ok:true,data:{shouldShow:false,dismissed:true,completionPercent:100,essentialComplete:true,steps:[]}}
      if(channel==='content:listStudio')return {ok:true,data:[item]}
      if(channel==='media:list')return {ok:true,data:[{id:referenceId,kind:'image',original_filename:'real-shop-pizza.jpg',mime_type:'image/jpeg',byte_size:1200,source:'import',created_at:1}]}
      if(channel==='media:readPreview')return {ok:true,data:{dataUrl:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',filename:'real-shop-pizza.jpg',kind:'image',mimeType:'image/jpeg'}}
      if(channel==='media:listHiggsfieldModels')return {ok:true,data:{models:[{id:'gpt_image_2',label:'GPT Image 2',kind:'image',recommendation:'recommended',bestFor:'Polished promotions and readable text.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'high quality · 2K',supportsImageReferences:true},{id:'nano_banana_2_lite',label:'Nano Banana 2 Lite',kind:'image',recommendation:'budget',bestFor:'Fast lower-cost drafts.',supportedAspects:['1:1','4:5','9:16','16:9'],outputSummary:'fast · 1K',supportsImageReferences:false},{id:'kling3_0_turbo',label:'Kling 3.0 Turbo',kind:'video',recommendation:'budget',bestFor:'Fast social clips.',supportedAspects:['1:1','9:16','16:9'],outputSummary:'5 seconds · 720p',supportsImageReferences:false}]}}
      if(channel==='media:estimateHiggsfield')return {ok:true,data:{provider:'higgsfield',kind:'image',model:'gpt_image_2',modelLabel:'GPT Image 2',aspectRatio:'1:1',credits:7,settings:{},outputSummary:'high quality · 2K',referenceAssetIds:(request as {referenceAssetIds?:string[]})?.referenceAssetIds??[]}}
      if(channel==='media:generateHiggsfield')return {ok:true,data:{status:'completed',requiresReview:true}}
      return {ok:true,data:[]}
    })
    Object.defineProperty(window,'pizzaSocial',{configurable:true,value:{invoke:invokeMock}})
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Content'}))
    fireEvent.click(await screen.findByRole('button',{name:'Create with Higgsfield'}))
    expect(await screen.findByText('Show Higgsfield what this shop looks like')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'real-shop-pizza.jpg'}))
    expect(await screen.findByRole('option',{name:'Nano Banana 2 Lite · Budget'})).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Output'),{target:{value:'video'}})
    expect(screen.getByRole('option',{name:'Kling 3.0 Turbo · Budget'})).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Output'),{target:{value:'image'}})
    expect(screen.queryByRole('button',{name:/Approve prompt/})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Check Higgsfield cost'}))
    await waitFor(()=>expect(invokeMock).toHaveBeenCalledWith('media:estimateHiggsfield',expect.objectContaining({referenceAssetIds:[referenceId]})))
    const approve=await screen.findByRole('button',{name:'Approve prompt & use 7 credits'})
    fireEvent.click(approve)
    await waitFor(()=>expect(invokeMock).toHaveBeenCalledWith('media:generateHiggsfield',expect.objectContaining({contentItemId:item.id,model:'gpt_image_2',referenceAssetIds:[referenceId],maxCredits:7,confirmSpend:true,confirmReview:true})))
  })

  it('provides a dedicated supervised AI chat workspace', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'AI Assistant' }))
    expect(await screen.findByText('What are you working on?')).toBeVisible()
    expect(screen.getByText('Human control stays on')).toBeVisible()
    expect(screen.getByPlaceholderText(/Ask about content/i)).toBeVisible()
  })

  it('places an editable AI copilot inside promotion creation',async()=>{
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Promotions'}))
    fireEvent.click(await screen.findByRole('button',{name:'Add promotion'}))
    expect(screen.getByText('Promotion copilot')).toBeVisible()
    fireEvent.change(screen.getByPlaceholderText(/Bring families in/),{target:{value:'Bring families in on a slow Tuesday night'}})
    fireEvent.click(screen.getByRole('button',{name:'Suggest promotion'}))
    expect(await screen.findByText('Tuesday Family Pizza Night')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Use this idea'}))
    expect(screen.getByDisplayValue('Tuesday Family Pizza Night')).toBeVisible()
    expect(screen.getByDisplayValue('TUESDAY')).toBeVisible()
    expect(screen.getByDisplayValue(/Tuesdays only/)).toBeVisible()
  })

  it('builds an editable Brand Profile from a guided owner interview',async()=>{
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Brand profile'}))
    fireEvent.click(await screen.findByRole('button',{name:'Add brand profile'}))
    expect(document.querySelectorAll('.brand-question-list textarea')).toHaveLength(5)
    expect(document.querySelector('.brand-interview-actions .primary')).toHaveTextContent('Build my brand profile')
    fireEvent.change(screen.getByLabelText('What should people understand about this pizza shop?'),{target:{value:'A dependable neighborhood shop with a long local story.'}})
    fireEvent.change(screen.getByLabelText('Who are the customers you most want to reach?'),{target:{value:'Local families and nearby workers.'}})
    fireEvent.click(screen.getByRole('button',{name:'Build my brand profile'}))
    expect(await screen.findByText('The neighborhood pizza shop for dependable local nights.')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Use this profile'}))
    expect(screen.getByDisplayValue('Warm, direct, neighborhood-focused')).toBeVisible()
    expect(screen.getByDisplayValue('Authentic food and storefront photography')).toBeVisible()
  })

  it('keeps paid-media drafting separate from live launch authority', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Ads' }))
    expect(await screen.findByText('Paid media control room')).toBeVisible()
    expect(screen.getByText('Live delivery locked')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save ad account' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /launch/i })).not.toBeInTheDocument()
  })

  it('provides a focused platform-copy review desk', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Review desk' }))
    expect(await screen.findByText('Editorial proofing')).toBeVisible()
    expect(screen.getByText('Human approval required')).toBeVisible()
    expect(screen.getByText('Approve the package')).toBeVisible()
    expect(screen.getByText('Schedule on Calendar')).toBeVisible()
  })

  it('approves a complete content package from the Review Desk',async()=>{
    const item={id:'11111111-1111-4111-8111-111111111111',title:'Friday family night',brief:'A verified Friday offer.',status:'ready_for_review',updated_at:1,variants:[{id:'22222222-2222-4222-8222-222222222222',platform:'instagram',copy:'Friday family night is ready.',metadata_json:'{}'}],generationJobs:[]}
    const invokeMock=vi.fn(async(channel:string)=>{
      if(channel==='app:getInfo')return {ok:true,data:{name:'Pizza Promo Pro',version:'0.1.0',online:true,platform:'test'}}
      if(channel==='onboarding:getStatus')return {ok:true,data:{shouldShow:false,dismissed:true,completionPercent:100,essentialComplete:true,steps:[]}}
      if(channel==='content:listStudio')return {ok:true,data:[item]}
      if(channel==='content:transition')return {ok:true,data:{...item,status:'approved'}}
      return {ok:true,data:[]}
    })
    Object.defineProperty(window,'pizzaSocial',{configurable:true,value:{invoke:invokeMock}})
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Review desk'}))
    fireEvent.click(await screen.findByRole('button',{name:'Approve package'}))
    await waitFor(()=>expect(invokeMock).toHaveBeenCalledWith('content:transition',{contentItemId:item.id,to:'approved'}))
    expect(await screen.findByText('Friday family night is approved and ready to schedule.')).toBeVisible()
  })

  it('presents approved content in a structured monthly calendar',async()=>{
    const item={id:'11111111-1111-4111-8111-111111111111',title:'Friday family night',brief:'A verified Friday offer.',status:'approved',updated_at:1,variants:[],generationJobs:[]}
    const invokeMock=vi.fn(async(channel:string)=>{
      if(channel==='app:getInfo')return {ok:true,data:{name:'Pizza Promo Pro',version:'0.1.0',online:true,platform:'test'}}
      if(channel==='onboarding:getStatus')return {ok:true,data:{shouldShow:false,dismissed:true,completionPercent:100,essentialComplete:true,steps:[]}}
      if(channel==='content:listStudio')return {ok:true,data:[item]}
      if(channel==='schedule:list')return {ok:true,data:[]}
      if(channel==='schedule:create')return {ok:true,data:[]}
      return {ok:true,data:[]}
    })
    Object.defineProperty(window,'pizzaSocial',{configurable:true,value:{invoke:invokeMock}})
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Calendar'}))
    expect(await screen.findByRole('heading',{name:'Schedule approved content'})).toBeVisible()
    expect(await screen.findByRole('option',{name:'Friday family night'})).toBeVisible()
    expect(document.querySelectorAll('.month-grid > div')).toHaveLength(42)
    expect(screen.getByRole('button',{name:'Previous month'})).toBeVisible()
  })

  it('labels performance data sources and keeps live reporting disabled', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Performance' }))
    expect(await screen.findByText('Outcome reporting')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Generate local sample' })).toBeVisible()
    expect(screen.getByText(/Live provider reporting remains disabled/i)).toBeVisible()
  })

  it('guides first-run setup from verified workspace readiness', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Setup' }))
    expect(await screen.findByText('Workspace mise en place')).toBeVisible()
    expect(screen.getByText('Essential ingredients')).toBeVisible()
    expect(await screen.findByText('Your content foundation is ready.')).toBeVisible()
  })

  it('edits an existing business profile without creating a duplicate', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Business profile' }))
    expect(await screen.findByText('The Pizza Shoppe')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByDisplayValue('The Pizza Shoppe')).toBeVisible()
    fireEvent.change(screen.getByDisplayValue('The Pizza Shoppe'),{target:{value:'The Pizza Shoppe Updated'}})
    fireEvent.click(screen.getByRole('button',{name:'Save changes'}))
    await waitFor(()=>expect(window.pizzaSocial.invoke).toHaveBeenCalledWith('data:save',expect.objectContaining({entity:'businesses',value:expect.objectContaining({id:'11111111-1111-4111-8111-111111111111',name:'The Pizza Shoppe Updated'})})))
  })

  it('edits and explicitly deletes existing Content Studio records',async()=>{
    const item={id:'11111111-1111-4111-8111-111111111111',title:'Friday special',brief:'Promote the verified Friday pizza special to local families.',status:'draft',updated_at:1,variants:[{id:'22222222-2222-4222-8222-222222222222',platform:'instagram',copy:'Friday pizza.',metadata_json:'{}'}],generationJobs:[]}
    const invokeMock=vi.fn(async(channel:string)=>{
      if(channel==='app:getInfo')return {ok:true,data:{name:'Pizza Promo Pro',version:'0.1.0',online:true,platform:'test'}}
      if(channel==='onboarding:getStatus')return {ok:true,data:{shouldShow:false,dismissed:true,completionPercent:100,essentialComplete:true,steps:[]}}
      if(channel==='content:listStudio')return {ok:true,data:[item]}
      if(channel==='content:updateDraft')return {ok:true,data:{...item,title:'Friday BOGO'}}
      if(channel==='content:delete')return {ok:true,data:{deleted:true}}
      return {ok:true,data:[]}
    })
    Object.defineProperty(window,'pizzaSocial',{configurable:true,value:{invoke:invokeMock}})
    vi.spyOn(window,'confirm').mockReturnValue(true)
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Content'}))
    fireEvent.click(await screen.findByRole('button',{name:'Edit'}))
    fireEvent.change(screen.getByDisplayValue('Friday special'),{target:{value:'Friday BOGO'}})
    fireEvent.click(screen.getByRole('button',{name:'Save and rebuild drafts'}))
    await waitFor(()=>expect(invokeMock).toHaveBeenCalledWith('content:updateDraft',expect.objectContaining({contentItemId:item.id,title:'Friday BOGO',regenerateVariants:true})))
    fireEvent.click(screen.getByRole('button',{name:'Delete'}))
    await waitFor(()=>expect(invokeMock).toHaveBeenCalledWith('content:delete',{contentItemId:item.id,confirmDelete:true}))
  })

  it('shows and highlights the result of creating platform drafts',async()=>{
    const created={id:'11111111-1111-4111-8111-111111111111',title:'Friday Night BOGO',brief:'Promote the verified Friday buy one get one pizza special.',status:'draft',updated_at:1,variants:[{id:'22222222-2222-4222-8222-222222222222',platform:'google_business_profile',copy:'Friday offer.',metadata_json:'{}'},{id:'33333333-3333-4333-8333-333333333333',platform:'facebook',copy:'Friday offer.',metadata_json:'{}'},{id:'44444444-4444-4444-8444-444444444444',platform:'instagram',copy:'Friday offer.',metadata_json:'{}'}],generationJobs:[]}
    let items:typeof created[]=[]
    const invokeMock=vi.fn(async(channel:string)=>{
      if(channel==='app:getInfo')return {ok:true,data:{name:'Pizza Promo Pro',version:'0.1.0',online:true,platform:'test'}}
      if(channel==='onboarding:getStatus')return {ok:true,data:{shouldShow:false,dismissed:true,completionPercent:100,essentialComplete:true,steps:[]}}
      if(channel==='content:listStudio')return {ok:true,data:items}
      if(channel==='content:createDraft'){items=[created];return {ok:true,data:created}}
      return {ok:true,data:[]}
    })
    Object.defineProperty(window,'pizzaSocial',{configurable:true,value:{invoke:invokeMock}})
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Content'}))
    fireEvent.click(await screen.findByRole('button',{name:'Create content'}))
    fireEvent.change(screen.getByLabelText('Working title'),{target:{value:'Friday Night BOGO'}})
    fireEvent.change(screen.getByLabelText('What should this post communicate?'),{target:{value:'Promote the verified Friday buy one get one pizza special.'}})
    fireEvent.click(screen.getByRole('button',{name:'Create 3 drafts'}))
    expect(await screen.findByText(/Created “Friday Night BOGO” with 3 platform drafts/)).toBeVisible()
    expect(screen.getByText('Just created')).toBeVisible()
  })

  it('guides AI-assisted content production through one explained starting point',async()=>{
    const invokeMock=vi.fn(async(channel:string)=>{
      if(channel==='app:getInfo')return {ok:true,data:{name:'Pizza Promo Pro',version:'0.1.0',online:true,platform:'test'}}
      if(channel==='onboarding:getStatus')return {ok:true,data:{shouldShow:false,dismissed:true,completionPercent:100,essentialComplete:true,steps:[]}}
      if(channel==='content:listStudio')return {ok:true,data:[]}
      if(channel==='agent:producePackage')return {ok:true,data:{variantCount:3,sources:[{type:'promotion',label:'Friday special'}]}}
      return {ok:true,data:[]}
    })
    Object.defineProperty(window,'pizzaSocial',{configurable:true,value:{invoke:invokeMock}})
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button',{name:'Content'}))
    expect(await screen.findByLabelText('Content production workflow')).toBeVisible()
    expect(screen.getByText('Describe the outcome')).toBeVisible()
    expect(screen.getByText('Review and deliver')).toBeVisible()
    fireEvent.change(screen.getByLabelText('Content direction'),{target:{value:'Bring in more family dinner orders this Friday.'}})
    fireEvent.click(screen.getByRole('button',{name:'Build 3 platform drafts'}))
    await waitFor(()=>expect(invokeMock).toHaveBeenCalledWith('agent:producePackage',{objective:'Bring in more family dinner orders this Friday.',platforms:['google_business_profile','facebook','instagram']}))
    expect(await screen.findByText(/created 3 grounded drafts/i)).toBeVisible()
  })
})
