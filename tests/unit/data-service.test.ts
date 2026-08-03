import { describe, expect, it, vi } from 'vitest'

vi.mock('electron',()=>({app:{getPath:()=>process.cwd()}}))

import { normalizeRecordInput } from '../../src/main/domain/record-input'

describe('record persistence field mapping',()=>{
  it('maps renderer field names to database columns including numbered address lines',()=>{
    expect(normalizeRecordInput({addressLine1:'1601 Penfield Rd',addressLine2:'Suite 2',postalCode:'14625',priceCents:1999,visualStyle:'photorealistic'})).toEqual({
      address_line_1:'1601 Penfield Rd',address_line_2:'Suite 2',postal_code:'14625',price_cents:1999,visual_style:'photorealistic'
    })
  })
})
