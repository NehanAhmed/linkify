import { createHmac } from 'crypto'
import { env } from './env'

const DELIMITER = '|'

export function createFingerprint(ip?: string | null, userAgent?: string | null, acceptLanguage?: string | null): string {
  const parts = [
    (ip ?? '').trim(),
    (userAgent ?? '').trim(),
    (acceptLanguage ?? '').trim(),
  ]
  const payload = parts.join(DELIMITER)
  return createHmac('sha256', env.FINGERPRINT_SECRET).update(payload).digest('hex')
}
