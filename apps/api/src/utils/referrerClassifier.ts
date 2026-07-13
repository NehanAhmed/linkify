export type ReferrerCategory = 'direct' | 'search' | 'social' | 'other'

const SEARCH_DOMAINS = [
  'google.', 'bing.', 'duckduckgo.', 'yahoo.', 'yandex.',
  'baidu.', 'ask.', 'ecosia.', 'qwant.', 'searx.',
]

const SOCIAL_DOMAINS = [
  'facebook.', 'twitter.', 'x.com', 't.co',
  'reddit.', 'linkedin.', 'instagram.', 'youtube.',
  'tiktok.', 'pinterest.', 'snapchat.', 'whatsapp.',
  'telegram.', 'discord.', 'threads.net',
]

function domainMatches(url: string, patterns: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return patterns.some((p) => hostname.includes(p) || hostname.endsWith(p))
  } catch {
    return false
  }
}

export function classifyReferrer(referer: string | undefined): ReferrerCategory {
  if (!referer || referer.trim() === '') {
    return 'direct'
  }

  if (domainMatches(referer, SEARCH_DOMAINS)) return 'search'
  if (domainMatches(referer, SOCIAL_DOMAINS)) return 'social'

  return 'other'
}
