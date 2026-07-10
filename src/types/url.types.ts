export interface CreateUrlRequest {
  url: string
  customCode?: string
}

export interface UrlResponse {
  code: string
  url: string
  shortUrl: string
  createdAt: string
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
  message?: string
}

export interface PaginationParams {
  page: number
  limit: number
}
