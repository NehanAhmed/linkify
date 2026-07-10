import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateUrlSafety } from '../urlSafety'

vi.mock('dns/promises', () => ({
  lookup: vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]),
}))

describe('validateUrlSafety', () => {
  it('rejects invalid URL format', async () => {
    await expect(validateUrlSafety('not-a-url')).rejects.toThrow('Invalid URL')
  })

  it('rejects non-http protocols', async () => {
    await expect(validateUrlSafety('javascript:alert(1)')).rejects.toThrow('Only http and https')
    await expect(validateUrlSafety('file:///etc/passwd')).rejects.toThrow('Only http and https')
    await expect(validateUrlSafety('data:text/html,<script>alert(1)</script>')).rejects.toThrow('Only http and https')
  })

  it('rejects private IP addresses', async () => {
    await expect(validateUrlSafety('http://127.0.0.1')).rejects.toThrow('private networks')
    await expect(validateUrlSafety('http://10.0.0.1')).rejects.toThrow('private networks')
    await expect(validateUrlSafety('http://192.168.1.1')).rejects.toThrow('private networks')
    await expect(validateUrlSafety('http://172.16.0.1')).rejects.toThrow('private networks')
  })

  it('accepts public IP addresses', async () => {
    await expect(validateUrlSafety('http://93.184.216.34')).resolves.not.toThrow()
  })

  it('accepts valid https URLs', async () => {
    await expect(validateUrlSafety('https://example.com')).resolves.not.toThrow()
  })
})
