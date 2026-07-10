import { randomBytes } from 'crypto'

const CODE_LENGTH = 7
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateShortCode(length: number = CODE_LENGTH): string {
  const bytes = randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return code
}

export function generateCustomCode(slug: string): string {
  return slug.trim().replace(/\s+/g, '-').toLowerCase()
}
