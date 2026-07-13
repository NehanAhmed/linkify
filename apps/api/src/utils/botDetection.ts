const BOT_UA_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /discordbot/i,
  /pinterest/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mozi..?.\s+ozilla/i,
  /wget/i,
  /curl/i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /go-http-client/i,
  /okhttp/i,
  /axios/i,
  /node-fetch/i,
]

const HEADLESS_BROWSER_PATTERNS = [
  /headlesschrome/i,
  /headless/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /chromium-headless/i,
]

export function isBot(userAgent?: string | null, _ip?: string | null): { isBot: boolean; botType?: string } {
  if (!userAgent) {
    return { isBot: false }
  }

  for (const pattern of HEADLESS_BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: 'headless_browser' }
    }
  }

  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: 'known_bot' }
    }
  }

  return { isBot: false }
}
