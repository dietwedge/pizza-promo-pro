import { describe, expect, it, vi } from 'vitest'

vi.mock('electron',()=>({app:{getAppPath:()=>process.cwd()}}))

import { parseHiggsfieldWorkspaces } from '../../src/main/services/higgsfield-cli-service'

describe('Higgsfield connector responses',()=>{
  it('normalizes workspace lists without retaining account secrets',()=>{
    expect(parseHiggsfieldWorkspaces({data:{workspaces:[{id:'workspace-1',name:'The Pizza Shoppe',access_token:'never expose'}]}})).toEqual([{id:'workspace-1',name:'The Pizza Shoppe'}])
  })

  it('supports alternate official response field names and ignores malformed rows',()=>{
    expect(parseHiggsfieldWorkspaces({items:[{workspace_id:'workspace-2',display_name:'Downtown'},null,{name:'Missing id'}]})).toEqual([{id:'workspace-2',name:'Downtown'}])
  })
})
