import { createHash } from 'crypto'

export function createFingerprint(ip?: string | null, userAgent?: string | null, acceptLanguage?: string | null): string {
  const hash = createHash('sha256')
  hash.update(ip ?? '')
  hash.update(userAgent ?? '')
  hash.update(acceptLanguage ?? '')
  return hash.digest('hex')
}
