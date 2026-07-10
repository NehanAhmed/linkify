export interface CreateUrlRequest {
  url: string
  customCode?: string
  ttlDays?: number
}

export interface UrlResponse {
  code: string
  url: string
  shortUrl: string
  title?: string | null
  description?: string | null
  image?: string | null
  visits: number
  expiresAt?: string | null
  createdAt: string
}

export interface BulkCreateItem {
  index: number
  success: boolean
  data?: UrlResponse
  error?: string
}

export interface VisitResponse {
  id: number
  code: string
  ipAddress: string | null
  userAgent: string | null
  referer: string | null
  visitedAt: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: Array<{ field: string; message: string }>
  message?: string
}

export interface PaginationParams {
  page: number
  limit: number
}
