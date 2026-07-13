import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}

  const chainable = ['from', 'where', 'limit', 'orderBy', 'values', 'set', 'delete']
  for (const m of chainable) {
    qb[m] = vi.fn(() => qb)
  }

  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)

  const db = {
    select: vi.fn(() => qb),
    insert: vi.fn(() => qb),
    update: vi.fn(() => qb),
    delete: vi.fn(() => qb),
  }

  function reset() {
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }

  return { mockQb: qb, mockDb: db, resetQb: reset }
})

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../../utils/encryption', () => ({
  encrypt: vi.fn((s: string) => `enc:${s}`),
  decrypt: vi.fn((s: string) => s.replace('enc:', '')),
}))

vi.mock('../../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedkey'),
  },
  hash: vi.fn().mockResolvedValue('$2b$12$hashedkey'),
}))

import { syncUser, getUserDecryptedEmail, checkRefreshTokenReuse, createApiKey, updateApiKey, listApiKeys, revokeApiKey } from '../auth.services'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('syncUser', () => {
  it('returns existing user role', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ role: 'admin', email: 'enc:admin@test.com' }]).then(onfulfilled)

    const role = await syncUser('user-1')

    expect(role).toBe('admin')
  })

  it('creates a new user', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    const role = await syncUser('new-user', 'new@test.com')

    expect(role).toBe('user')
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('updates email if changed', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ role: 'user', email: 'enc:old@test.com' }]).then(onfulfilled)

    await syncUser('user-1', 'new@test.com')

    expect(mockDb.update).toHaveBeenCalled()
  })
})

describe('getUserDecryptedEmail', () => {
  it('returns decrypted email', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ email: 'enc:test@test.com' }]).then(onfulfilled)

    const email = await getUserDecryptedEmail('user-1')

    expect(email).toBe('test@test.com')
  })

  it('returns null if user not found', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    const email = await getUserDecryptedEmail('nonexistent')

    expect(email).toBeNull()
  })

  it('returns raw email if decryption fails', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ email: 'not-encrypted' }]).then(onfulfilled)

    const email = await getUserDecryptedEmail('user-1')

    expect(email).toBe('not-encrypted')
  })
})

describe('checkRefreshTokenReuse', () => {
  it('returns true if token not seen before', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    const valid = await checkRefreshTokenReuse('user-1', 'some-token')

    expect(valid).toBe(true)
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('returns false and logs if token reused', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ id: 1 }]).then(onfulfilled)

    const valid = await checkRefreshTokenReuse('user-1', 'reused-token')

    expect(valid).toBe(false)
    expect(mockDb.delete).toHaveBeenCalled()
  })
})

describe('createApiKey', () => {
  it('creates an API key', async () => {
    mockQb.returning.mockResolvedValueOnce([{ id: 1 }])

    const result = await createApiKey('user-1', 'My Key')

    expect(result.name).toBe('My Key')
    expect(result.key).toMatch(/^linkify_/)
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('creates API key with options', async () => {
    mockQb.returning.mockResolvedValueOnce([{ id: 2 }])

    const result = await createApiKey('user-1', 'Restricted', ['read'], new Date('2025-01-01'), ['1.2.3.4'])

    expect(result.name).toBe('Restricted')
    expect(result.key).toMatch(/^linkify_/)
  })
})

describe('updateApiKey', () => {
  it('updates an owned API key', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ id: 1, userId: 'user-1' }]).then(onfulfilled)

    await updateApiKey('user-1', 1, { name: 'Renamed' })

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws if API key not found', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    await expect(updateApiKey('user-1', 999, { name: 'X' })).rejects.toThrow('API key not found')
  })

  it('throws if not the owner', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ id: 1, userId: 'other-user' }]).then(onfulfilled)

    await expect(updateApiKey('user-1', 1, { name: 'X' })).rejects.toThrow('API key not found')
  })
})

describe('listApiKeys', () => {
  it('lists all keys for a user', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 1, name: 'Key 1', scopes: null, allowedIps: null, lastUsedAt: null, expiresAt: null, createdAt: new Date() },
    ]).then(onfulfilled)

    const keys = await listApiKeys('user-1')

    expect(keys).toHaveLength(1)
    expect(keys[0].name).toBe('Key 1')
  })
})

describe('revokeApiKey', () => {
  it('revokes an owned API key', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ id: 1, userId: 'user-1' }]).then(onfulfilled)

    await revokeApiKey('user-1', 1)

    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('throws if API key not found', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    await expect(revokeApiKey('user-1', 999)).rejects.toThrow('API key not found')
  })

  it('throws if not the owner', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ id: 1, userId: 'other-user' }]).then(onfulfilled)

    await expect(revokeApiKey('user-1', 1)).rejects.toThrow('API key not found')
  })
})
