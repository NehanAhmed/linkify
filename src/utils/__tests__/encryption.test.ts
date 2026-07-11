import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../encryption'

describe('encryption', () => {
  const testText = 'sensitive-data@example.com'

  it('encrypts and decrypts a plaintext string', () => {
    const encrypted = encrypt(testText)
    expect(encrypted).toBeTruthy()
    expect(encrypted).not.toBe(testText)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(testText)
  })

  it('produces the expected format: iv:authTag:ciphertext', () => {
    const encrypted = encrypt('hello')
    const parts = encrypted.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^[a-f0-9]{32}$/)
    expect(parts[1]).toMatch(/^[a-f0-9]{32}$/)
    expect(parts[2]).toBeTruthy()
    expect(parts[2]).toMatch(/^[a-f0-9]+$/)
  })

  it('produces different ciphertexts for the same input (unique IV)', () => {
    const result1 = encrypt(testText)
    const result2 = encrypt(testText)
    expect(result1).not.toBe(result2)
  })

  it('throws on invalid payload format', () => {
    expect(() => decrypt('invalid')).toThrow('Invalid encrypted payload')
    expect(() => decrypt('a:b:c:d')).toThrow('Invalid encrypted payload')
    expect(() => decrypt('')).toThrow('Invalid encrypted payload')
  })

  it('throws on tampered payload', () => {
    const encrypted = encrypt('secret')
    const parts = encrypted.split(':')
    const tampered = `aa${parts[0].slice(2)}:${parts[1]}:${parts[2]}`
    expect(() => decrypt(tampered)).toThrow()
  })

  it('handles empty string', () => {
    const encrypted = encrypt('')
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe('')
  })

  it('handles special characters', () => {
    const special = 'héllo wörld! 👋 \n\t\"\'<>'
    const encrypted = encrypt(special)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(special)
  })

  it('handles long text', () => {
    const long = 'a'.repeat(10000)
    const encrypted = encrypt(long)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(long)
  })
})
