import { describe, expect, it, vi } from 'vitest'

vi.mock('electron',()=>({app:{getAppPath:()=>process.cwd()}}))

import { buildHiggsfieldGenerationArgs, higgsfieldProfile, parseHiggsfieldGenerationResult, parseHiggsfieldWorkspaces } from '../../src/main/services/higgsfield-cli-service'

describe('Higgsfield connector responses',()=>{
  it('normalizes workspace lists without retaining account secrets',()=>{
    expect(parseHiggsfieldWorkspaces({data:{workspaces:[{id:'workspace-1',name:'The Pizza Shoppe',access_token:'never expose'}]}})).toEqual([{id:'workspace-1',name:'The Pizza Shoppe'}])
  })

  it('supports alternate official response field names and ignores malformed rows',()=>{
    expect(parseHiggsfieldWorkspaces({items:[{workspace_id:'workspace-2',display_name:'Downtown'},null,{name:'Missing id'}]})).toEqual([{id:'workspace-2',name:'Downtown'}])
  })

  it('uses fixed catalog-backed image and video profiles',()=>{
    expect(higgsfieldProfile('image','1:1')).toEqual({kind:'image',model:'gpt_image_2',settings:{aspect_ratio:'1:1',quality:'high',resolution:'2k'}})
    expect(higgsfieldProfile('video','9:16')).toEqual({kind:'video',model:'seedance_2_0',settings:{aspect_ratio:'9:16',duration:5,resolution:'720p',mode:'std'}})
    expect(buildHiggsfieldGenerationArgs('create','Approved pizza brief',higgsfieldProfile('image','1:1'))).toContain('--wait')
  })

  it('extracts only HTTPS media results from completed jobs',()=>{
    expect(parseHiggsfieldGenerationResult([{id:'job-1',result_url:'https://cdn.example.com/result.png'}])).toEqual({remoteUrl:'https://cdn.example.com/result.png',providerOutputId:'job-1'})
    expect(()=>parseHiggsfieldGenerationResult({result_url:'http://unsafe.example/result.png'})).toThrow('downloadable media URL')
  })
})
