import type { ApiErrorResponse } from "@linkify/shared"
import type {
  ShortUrl,
  Visit,
  VisitStats,
  Collection,
  Tag,
  Plan,
  UserSubscription,
  Usage,
  ApiKey,
  Pagination,
  BulkResult,
  CreateUrlPayload,
  UpdateUrlSettingsPayload,
  BulkOperationPayload,
  CreateCollectionPayload,
  CreateTagPayload,
  CreateApiKeyPayload,
  UpdateApiKeyPayload,
  CheckoutPayload,
  HealthResponse,
} from "@linkify/shared"

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

async function requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>),
    },
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    const err = json as ApiErrorResponse
    throw new ApiError(err.error || "Request failed", err.code || "UNKNOWN_ERROR")
  }

  return res.blob()
}

export function setAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// Auth
export function fetchMe(token: string) {
  return request<{ id: string; email: string; role: string; createdAt: string }>(
    "/api/auth/me",
    { headers: setAuthHeader(token) }
  )
}

export function refreshToken(token: string) {
  return request<{ access_token: string; refresh_token: string; expires_in: number; user: { id: string } }>(
    "/api/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: token }),
    }
  )
}

export function resetPassword(email: string) {
  return request<{ message: string }>(
    "/api/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  )
}

// API Keys
export function createApiKey(token: string, payload: CreateApiKeyPayload) {
  return request<{ key: string; name: string; id: number }>(
    "/api/auth/api-keys",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function listApiKeys(token: string) {
  return request<ApiKey[]>(
    "/api/auth/api-keys",
    { headers: setAuthHeader(token) }
  )
}

export function updateApiKey(token: string, id: number, payload: UpdateApiKeyPayload) {
  return request<{ id: number }>(
    `/api/auth/api-keys/${id}`,
    {
      method: "PUT",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function revokeApiKey(token: string, id: number) {
  return request<{ message: string }>(
    `/api/auth/api-keys/${id}`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
    }
  )
}

// URLs
export function createUrl(token: string, payload: CreateUrlPayload) {
  return request<ShortUrl>(
    "/api/urls",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function bulkCreateUrls(token: string, urls: { url: string; customCode?: string }[]) {
  return request<BulkResult[]>(
    "/api/urls/bulk",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify({ urls }),
    }
  )
}

export function listUrls(token: string, params?: Record<string, string>, signal?: AbortSignal) {
  const searchParams = new URLSearchParams(params)
  const qs = searchParams.toString()
  return request<{ urls: ShortUrl[]; pagination: Pagination }>(
    `/api/urls${qs ? `?${qs}` : ""}`,
    { headers: setAuthHeader(token), signal }
  )
}

export function getUrlInfo(token: string | null, code: string, signal?: AbortSignal) {
  const headers = token ? setAuthHeader(token) : undefined
  return request<ShortUrl>(
    `/api/urls/${code}/info`,
    headers ? { headers, signal } : { signal }
  )
}

export function getUrlVisits(token: string, code: string, params?: { page?: number; limit?: number }, signal?: AbortSignal) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return request<{ visits: Visit[]; pagination: Pagination }>(
    `/api/urls/${code}/visits${qs ? `?${qs}` : ""}`,
    { headers: setAuthHeader(token), signal }
  )
}

export function getUrlStats(token: string, code: string, signal?: AbortSignal) {
  return request<VisitStats>(`/api/urls/${code}/stats`, { headers: setAuthHeader(token), signal })
}

export function exportVisitsCsv(token: string, code: string) {
  return requestBlob(`/api/urls/${code}/visits/export`, { headers: setAuthHeader(token) })
}

export function generateQrCode(code: string, format: "png" | "svg" = "png", logo?: string, signal?: AbortSignal) {
  const searchParams = new URLSearchParams({ format })
  if (logo) searchParams.set("logo", logo)
  return requestBlob(`/api/urls/${code}/qr?${searchParams.toString()}`, { signal })
}

export function updateUrlSettings(token: string, code: string, payload: UpdateUrlSettingsPayload) {
  return request<{ message: string }>(
    `/api/urls/${code}/settings`,
    {
      method: "PATCH",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function setUrlPassword(token: string, code: string, password: string) {
  return request<{ message: string }>(
    `/api/urls/${code}/password`,
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify({ password }),
    }
  )
}

export function removeUrlPassword(token: string, code: string) {
  return request<{ message: string }>(
    `/api/urls/${code}/password`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
    }
  )
}

export function verifyUrlPassword(code: string, password: string) {
  return request<{ token: string }>(
    `/api/urls/${code}/verify-password-token`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  )
}

export function softDeleteUrl(token: string, code: string) {
  return request<{ message: string }>(
    `/api/urls/${code}`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
    }
  )
}

export function purgeUrl(token: string, code: string) {
  return request<{ message: string }>(
    `/api/urls/${code}/purge`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
    }
  )
}

export function bulkOperations(token: string, payload: BulkOperationPayload) {
  return request<BulkResult[]>(
    "/api/urls/bulk-operations",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function importCsv(token: string, csv: string, collectionId?: number) {
  return request<BulkResult[]>(
    "/api/urls/import/csv",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify({ csv, collectionId }),
    }
  )
}

// Collections
export function listCollections(token: string, params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return request<{ collections: Collection[]; pagination: Pagination }>(
    `/api/collections${qs ? `?${qs}` : ""}`,
    { headers: setAuthHeader(token) }
  )
}

export function createCollection(token: string, payload: CreateCollectionPayload) {
  return request<Collection>(
    "/api/collections",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function getCollection(token: string, id: number) {
  return request<Collection>(
    `/api/collections/${id}`,
    { headers: setAuthHeader(token) }
  )
}

export function updateCollection(token: string, id: number, payload: Partial<Pick<Collection, "name" | "parentId" | "sortOrder">>) {
  return request<Collection>(
    `/api/collections/${id}`,
    {
      method: "PATCH",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function deleteCollection(token: string, id: number) {
  return request<{ message: string }>(
    `/api/collections/${id}`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
    }
  )
}

export function reorderCollections(token: string, items: { id: number; sortOrder: number }[]) {
  return request<{ message: string }>(
    "/api/collections/reorder",
    {
      method: "PATCH",
      headers: setAuthHeader(token),
      body: JSON.stringify(items),
    }
  )
}

export function shareCollection(token: string, id: number) {
  return request<{ shareToken: string; shareUrl: string }>(
    `/api/collections/${id}/share`,
    {
      method: "POST",
      headers: setAuthHeader(token),
    }
  )
}

export function revokeCollectionShare(token: string, id: number) {
  return request<{ message: string }>(
    `/api/collections/${id}/share`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
    }
  )
}

export function getCollectionUrls(token: string, id: number, params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return request<{ urlCodes: string[]; pagination: Pagination }>(
    `/api/collections/${id}/urls${qs ? `?${qs}` : ""}`,
    { headers: setAuthHeader(token) }
  )
}

export function addUrlToCollection(token: string, id: number, urlCode: string) {
  return request<{ urlCode: string; collectionId: number }>(
    `/api/collections/${id}/urls`,
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify({ urlCode }),
    }
  )
}

export function removeUrlFromCollection(token: string, id: number, urlCode: string) {
  return request<{ message: string }>(
    `/api/collections/${id}/urls`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
      body: JSON.stringify({ urlCode }),
    }
  )
}

// Tags
export function listTags(token: string, params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return request<{ tags: Tag[]; pagination: Pagination }>(
    `/api/tags${qs ? `?${qs}` : ""}`,
    { headers: setAuthHeader(token) }
  )
}

export function createTag(token: string, payload: CreateTagPayload) {
  return request<Tag>(
    "/api/tags",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function updateTag(token: string, id: number, payload: Partial<CreateTagPayload>) {
  return request<Tag>(
    `/api/tags/${id}`,
    {
      method: "PATCH",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function deleteTag(token: string, id: number) {
  return request<{ message: string }>(
    `/api/tags/${id}`,
    {
      method: "DELETE",
      headers: setAuthHeader(token),
    }
  )
}

export function bulkTagUrls(token: string, codes: string[], tagIds: number[]) {
  return request<BulkResult[]>(
    "/api/tags/bulk",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify({ codes, tagIds }),
    }
  )
}

export function getTagUrls(token: string, id: number, params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return request<{ urlCodes: string[]; pagination: Pagination }>(
    `/api/tags/${id}/urls${qs ? `?${qs}` : ""}`,
    { headers: setAuthHeader(token) }
  )
}

// Billing
export function listPlans() {
  return request<Plan[]>("/api/billing/plans")
}

export function createCheckoutSession(token: string, payload: CheckoutPayload) {
  return request<{ url: string; sessionId: string }>(
    "/api/billing/checkout",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify(payload),
    }
  )
}

export function getPortalUrl(token: string) {
  return request<{ url: string }>(
    "/api/billing/portal",
    { headers: setAuthHeader(token) }
  )
}

export function getSubscription(token: string) {
  return request<UserSubscription>(
    "/api/billing/subscription",
    { headers: setAuthHeader(token) }
  )
}

export function cancelSubscription(token: string, subscriptionId: number) {
  return request<{ message: string }>(
    "/api/billing/cancel",
    {
      method: "POST",
      headers: setAuthHeader(token),
      body: JSON.stringify({ subscriptionId }),
    }
  )
}

export function getUsage(token: string) {
  return request<Usage>(
    "/api/billing/usage",
    { headers: setAuthHeader(token) }
  )
}

// Health
export function getHealth() {
  return request<HealthResponse>("/api/health")
}
