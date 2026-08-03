import { describe, expect, it, vi } from 'vitest'

vi.mock('electron',()=>({app:{getAppPath:()=>process.cwd()}}))

import { buildHiggsfieldGenerationArgs, higgsfieldProfile, parseHiggsfieldGenerationResult, parseHiggsfieldModelCatalog, parseHiggsfieldWorkspaces } from '../../src/main/services/higgsfield-cli-service'

describe('Higgsfield connector responses',()=>{
  it('normalizes workspace lists without retaining account secrets',()=>{
    expect(parseHiggsfieldWorkspaces({data:{workspaces:[{id:'workspace-1',name:'The Pizza Shoppe',access_token:'never expose'}]}})).toEqual([{id:'workspace-1',name:'The Pizza Shoppe'}])
  })

  it('supports alternate official response field names and ignores malformed rows',()=>{
    expect(parseHiggsfieldWorkspaces({items:[{workspace_id:'workspace-2',display_name:'Downtown'},null,{name:'Missing id'}]})).toEqual([{id:'workspace-2',name:'Downtown'}])
  })

  it('uses model-specific catalog-backed image and video profiles',()=>{
    expect(higgsfieldProfile('gpt_image_2','1:1')).toEqual({kind:'image',model:'gpt_image_2',settings:{aspect_ratio:'1:1',quality:'high',resolution:'2k'}})
    expect(higgsfieldProfile('nano_banana_2_lite','4:5')).toEqual({kind:'image',model:'nano_banana_2_lite',settings:{aspect_ratio:'4:5',resolution:'1k',thinking:'HIGH'}})
    expect(higgsfieldProfile('kling3_0_turbo','9:16')).toEqual({kind:'video',model:'kling3_0_turbo',settings:{aspect_ratio:'9:16',duration:5,resolution:'720p'}})
    expect(()=>higgsfieldProfile('kling3_0_turbo','4:5')).toThrow('not supported')
    expect(buildHiggsfieldGenerationArgs('create','Approved pizza brief',higgsfieldProfile('gpt_image_2','1:1'))).toContain('--wait')
    expect(buildHiggsfieldGenerationArgs('create','Approved pizza brief',higgsfieldProfile('gpt_image_2','1:1'),['C:\\media\\pizza.jpg'])).toEqual(expect.arrayContaining(['--image-references','C:\\media\\pizza.jpg']))
  })

  it('normalizes the live catalog and discards malformed rows',()=>{
    expect(parseHiggsfieldModelCatalog([{display_name:'Nano Banana 2 Lite',job_type:'nano_banana_2_lite',type:'image'},{display_name:'broken'}])).toEqual([{display_name:'Nano Banana 2 Lite',job_type:'nano_banana_2_lite',type:'image'}])
  })

  it('extracts only HTTPS media results from completed jobs',()=>{
    expect(parseHiggsfieldGenerationResult([{id:'job-1',result_url:'https://cdn.example.com/result.png'}])).toEqual({remoteUrl:'https://cdn.example.com/result.png',providerOutputId:'job-1'})
    expect(()=>parseHiggsfieldGenerationResult({result_url:'http://unsafe.example/result.png'})).toThrow('downloadable media URL')
  })
})
