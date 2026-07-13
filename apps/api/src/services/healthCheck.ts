export interface HealthCheckResult {
  statusCode: number | null
  ok: boolean
}

export async function checkLink(url: string): Promise<HealthCheckResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'linkify-health-check/1.0' },
    })

    clearTimeout(timeout)

    const statusCode = response.status

    // Follow redirects manually (up to 2 hops) to catch final status
    if (statusCode >= 300 && statusCode < 400) {
      const location = response.headers.get('location')
      if (location) {
        return checkLinkFollow(new URL(location, url).toString(), 1)
      }
    }

    return {
      statusCode,
      ok: statusCode >= 200 && statusCode < 400,
    }
  } catch {
    return { statusCode: null, ok: false }
  }
}

async function checkLinkFollow(url: string, hop: number): Promise<HealthCheckResult> {
  if (hop > 2) {
    return { statusCode: null, ok: false }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'linkify-health-check/1.0' },
    })

    clearTimeout(timeout)

    const statusCode = response.status

    if (statusCode >= 300 && statusCode < 400) {
      const location = response.headers.get('location')
      if (location) {
        return checkLinkFollow(new URL(location, url).toString(), hop + 1)
      }
    }

    return {
      statusCode,
      ok: statusCode >= 200 && statusCode < 400,
    }
  } catch {
    return { statusCode: null, ok: false }
  }
}
