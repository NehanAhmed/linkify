import type { ApiErrorResponse } from "@linkify/shared"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  code: string
  details?: { field: string; message: string }[]

  constructor(message: string, code: string, details?: { field: string; message: string }[]) {
    super(message)
    this.code = code
    this.details = details
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const json = await res.json()

  if (!res.ok || !json.success) {
    const err = json as ApiErrorResponse
    throw new ApiError(err.error, err.code, err.details)
  }

  return json.data as T
}

export function setAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function fetchMe(token: string) {
  return request<{ id: string; email: string; role: string; createdAt: string }>(
    "/api/auth/me",
    { headers: setAuthHeader(token) }
  )
}


