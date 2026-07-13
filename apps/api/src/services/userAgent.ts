import { UAParser } from 'ua-parser-js'

export interface ParsedUA {
  deviceType: string | null
  os: string | null
  browser: string | null
  browserVersion: string | null
}

export function parseUserAgent(ua: string | undefined): ParsedUA {
  if (!ua) {
    return { deviceType: null, os: null, browser: null, browserVersion: null }
  }

  const parser = new UAParser(ua)
  const browser = parser.getBrowser()
  const os = parser.getOS()
  const device = parser.getDevice()

  let deviceType: string | null = null
  if (device.type) {
    deviceType = device.type
  } else if (os.name && /android/i.test(os.name)) {
    deviceType = 'mobile'
  } else {
    deviceType = 'desktop'
  }

  return {
    deviceType,
    os: os.name ?? null,
    browser: browser.name ?? null,
    browserVersion: browser.version ?? null,
  }
}
