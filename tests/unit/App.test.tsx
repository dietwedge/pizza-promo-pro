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

  it('provides a dedicated supervised AI chat workspace', async () => {
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'AI Assistant' }))
    expect(await screen.findByText('What are you working on?')).toBeVisible()
    expect(screen.getByText('Human control stays on')).toBeVisible()
    expect(screen.getByPlaceholderText(/Ask about content/i)).toBeVisible()
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
    expect(screen.getByText('Source-aware checks')).toBeVisible()
    expect(screen.getByText('Needs verification')).toBeVisible()
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
})
