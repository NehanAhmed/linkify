export const BLOCKLIST_TLDS = new Set([
  // Known phishing/malware domains — this is a minimal starter set
  // In production, integrate with Google Safe Browsing or a blocklist API
  'bit.ly',
  'tinyurl.com',
  'shorturl.at',
  't.co',
  'ow.ly',
  'buff.ly',
  'rb.gy',
  'tiny.cc',
  'shorturl.com',
  'short-link.com',
])

export const BLOCKLIST_PATTERNS: RegExp[] = [
  // Typosquatting / lookalike patterns
  /\bpaypa[li0]/i,
  /\bpaypa[l1]s[a4]f[e3]/i,
  /\bg00gle\b/i,
  /\bg00gle\b/i,
  /\bgo0gle\b/i,
  /\bfac3book\b/i,
  /\bfaceb00k\b/i,
  /\binstagr[a4]m\b/i,
  /\bwhats[a4]pp\b/i,
  /\bmicr0s0ft\b/i,
  /\bmicr0soft\b/i,
  /\bnetfl[i1]x\b/i,
  /\bsteamc[o0]mmunit[y4]\b/i,

  // Common phishing URL structures
  /login\.\w+\.(com|net|org)\/[a-z]+\/update/i,
  /secure-.*\.\w+\.\w+/i,
  /account-verify/i,
  /password-reset/i,
  /confirm-identity/i,

  // Suspicious TLD patterns
  /\.(zip|mov|mp3|exe|msi|dmg|scr)$/i,
]
