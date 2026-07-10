import { describe, it, expect } from 'vitest'
import { classifyReferrer } from '../referrerClassifier'

describe('classifyReferrer', () => {
  it('returns direct for empty referrer', () => {
    expect(classifyReferrer(undefined)).toBe('direct')
    expect(classifyReferrer('')).toBe('direct')
    expect(classifyReferrer('  ')).toBe('direct')
  })

  it('classifies search engines', () => {
    expect(classifyReferrer('https://google.com/search?q=test')).toBe('search')
    expect(classifyReferrer('https://www.google.co.uk/search?q=test')).toBe('search')
    expect(classifyReferrer('https://bing.com/search?q=test')).toBe('search')
    expect(classifyReferrer('https://duckduckgo.com/?q=test')).toBe('search')
    expect(classifyReferrer('https://search.yahoo.com/search?p=test')).toBe('search')
  })

  it('classifies social media', () => {
    expect(classifyReferrer('https://facebook.com/some-post')).toBe('social')
    expect(classifyReferrer('https://twitter.com/user/status/123')).toBe('social')
    expect(classifyReferrer('https://reddit.com/r/linkify')).toBe('social')
    expect(classifyReferrer('https://linkedin.com/in/user')).toBe('social')
    expect(classifyReferrer('https://x.com/elonmusk')).toBe('social')
  })

  it('returns other for unknown referrers', () => {
    expect(classifyReferrer('https://example.com/page')).toBe('other')
    expect(classifyReferrer('https://stackoverflow.com/questions/1')).toBe('other')
  })
})
