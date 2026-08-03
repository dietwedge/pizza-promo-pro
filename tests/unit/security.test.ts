import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from '../../src/main/security'

describe('external URL policy', () => {
  it('allows only approved HTTPS hosts', () => {
    expect(isAllowedExternalUrl('https://www.instagram.com/p/example')).toBe(true)
    expect(isAllowedExternalUrl('http://www.instagram.com/p/example')).toBe(false)
    expect(isAllowedExternalUrl('https://www.instagram.com.evil.example/p/example')).toBe(false)
  })

  it('rejects dangerous and malformed URLs', () => {
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})
