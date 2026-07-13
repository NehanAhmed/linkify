export interface CreateUrlRequest {
  url: string
  customCode?: string
  ttlDays?: number
  password?: string
  activeAt?: string
  tags?: string[]
  collectionId?: number
}

export interface UrlResponse {
  code: string
  url: string
  shortUrl: string
  title?: string | null
  description?: string | null
  image?: string | null
  visits: number
  uniqueVisits: number
  expiresAt?: string | null
  activeAt?: string | null
  hasPassword: boolean
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
  country: string | null
  city: string | null
  deviceType: string | null
  os: string | null
  browser: string | null
  browserVersion: string | null
  referrerCategory: string | null
  visitedAt: string
}

export interface UrlStatsResponse {
  totalVisits: number
  uniqueVisits: number
  hourly: Array<{ hour: string; count: number }>
  daily: Array<{ date: string; count: number }>
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

export interface CollectionResponse {
  id: number
  name: string
  parentId: number | null
  sortOrder: number
  urlCount?: number
  createdAt: string
}

export interface TagResponse {
  id: number
  name: string
  color: string
  createdAt: string
}

export interface BulkOperationResponse {
  code: string
  success: boolean
  error?: string
}
