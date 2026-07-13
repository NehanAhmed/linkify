import { describe, it, expect } from 'vitest'
import { isBot } from '../botDetection'

describe('isBot', () => {
  it('returns false for null UA', () => {
    expect(isBot(null)).toEqual({ isBot: false })
  })

  it('returns false for undefined UA', () => {
    expect(isBot(undefined)).toEqual({ isBot: false })
  })

  it('returns false for a normal browser UA', () => {
    const result = isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')
    expect(result).toEqual({ isBot: false })
  })

  it('returns false for Firefox UA', () => {
    const result = isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0')
    expect(result).toEqual({ isBot: false })
  })

  it('returns false for Safari UA', () => {
    const result = isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')
    expect(result).toEqual({ isBot: false })
  })

  it('detects Googlebot', () => {
    const result = isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
    expect(result).toEqual({ isBot: true, botType: 'known_bot' })
  })

  it('detects Bingbot', () => {
    const result = isBot('Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)')
    expect(result).toEqual({ isBot: true, botType: 'known_bot' })
  })

  it('detects Facebook crawler', () => {
    const result = isBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')
    expect(result).toEqual({ isBot: true, botType: 'known_bot' })
  })

  it('detects Twitterbot', () => {
    const result = isBot('Twitterbot/1.0')
    expect(result).toEqual({ isBot: true, botType: 'known_bot' })
  })

  it('detects curl', () => {
    const result = isBot('curl/7.88.1')
    expect(result).toEqual({ isBot: true, botType: 'known_bot' })
  })

  it('detects wget', () => {
    const result = isBot('Wget/1.21.4')
    expect(result).toEqual({ isBot: true, botType: 'known_bot' })
  })

  it('detects python-requests', () => {
    const result = isBot('python-requests/2.31.0')
    expect(result).toEqual({ isBot: true, botType: 'known_bot' })
  })

  it('detects headless browser via Puppeteer', () => {
    const result = isBot('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36')
    expect(result).toEqual({ isBot: true, botType: 'headless_browser' })
  })

  it('detects headless browser via Playwright', () => {
    const result = isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Playwright/1.40.0')
    expect(result).toEqual({ isBot: true, botType: 'headless_browser' })
  })

  it('detects Selenium', () => {
    const result = isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Selenium')
    expect(result).toEqual({ isBot: true, botType: 'headless_browser' })
  })

  it('detects headless via PhantomJS', () => {
    const result = isBot('Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1')
    expect(result).toEqual({ isBot: true, botType: 'headless_browser' })
  })

  it('checks headless patterns before known_bot patterns', () => {
    const result = isBot('HeadlessChrome/120.0.0.0 Googlebot')
    expect(result).toEqual({ isBot: true, botType: 'headless_browser' })
  })
})
