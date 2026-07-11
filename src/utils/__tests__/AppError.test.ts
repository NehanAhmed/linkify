import { describe, it, expect } from 'vitest'
import { AppError } from '../AppError'

describe('AppError', () => {
  it('creates error with message, statusCode, and code', () => {
    const err = new AppError('Not found', 404, 'URL_NOT_FOUND')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.message).toBe('Not found')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('URL_NOT_FOUND')
    expect(err.name).toBe('AppError')
  })

  it('defaults code to undefined when not provided', () => {
    const err = new AppError('Server error', 500)
    expect(err.message).toBe('Server error')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBeUndefined()
  })

  it('works with instanceof checks', () => {
    const err = new AppError('Not found', 404)
    expect(err instanceof AppError).toBe(true)
    expect(err instanceof Error).toBe(true)
  })

  it('has a valid stack trace', () => {
    const err = new AppError('Test', 400)
    expect(err.stack).toBeDefined()
    expect(err.stack).toContain('AppError')
  })
})
