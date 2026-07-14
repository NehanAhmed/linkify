export interface User {
  id: string
  email: string
  role: "user" | "admin"
  createdAt: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  code: string
  details?: { field: string; message: string }[]
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export type AuthProvider = "google" | "github"

export interface ShortUrl {
  code: string
  url: string
  shortUrl: string
  title: string | null
  description: string | null
  image: string | null
  visits: number
  uniqueVisits: number
  expiresAt: string | null
  activeAt: string | null
  hasPassword: boolean
  blockBots: boolean
  createdAt: string
}

export interface Visit {
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
  isBot: boolean
  visitedAt: string
}

export interface VisitStat {
  hour?: string
  date?: string
  visits: number
  uniqueVisits: number
}

export interface VisitStats {
  totalVisits: number
  uniqueVisits: number
  hourly: VisitStat[]
  daily: VisitStat[]
}

export interface Collection {
  id: number
  name: string
  parentId: number | null
  userId: string
  sortOrder: number
  shareToken: string | null
  sharedAt: string | null
  urlCount?: number
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: number
  name: string
  color: string
  userId: string
  urlCount?: number
  createdAt: string
}

export interface PlanFeatures {
  advancedStats: boolean
  customDomains: boolean
  passwordProtection: boolean
  bulkOperations: boolean
  apiAccess: boolean
  affiliateLinks: boolean
  prioritySupport: boolean
}

export interface Plan {
  id: number
  name: string
  code: string
  description: string
  maxLinks: number
  maxCustomDomains: number
  apiRateLimit: number
  features: PlanFeatures
  priceMonthly: number
  priceYearly: number
  sortOrder: number
}

export interface Subscription {
  id: number
  userId: string
  planId: number
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
}

export interface UserPlanInfo {
  planId: number
  planCode: string
  planName: string
  maxLinks: number
  maxCustomDomains: number
  apiRateLimit: number
  features: PlanFeatures
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export interface UserSubscription {
  plan: UserPlanInfo
  subscription: {
    id: number
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    trialEnd: string | null
  }
}

export interface Usage {
  totalLinks: number
  totalVisits: number
  plan: Plan
  quotaMonth: string
}

export interface ApiKey {
  id: number
  name: string
  scopes: string[]
  allowedIps: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: Pagination
}

export interface BulkResult {
  index?: number
  code?: string
  success: boolean
  data?: unknown
  error?: string
}

export interface CreateUrlPayload {
  url: string
  customCode?: string
  ttlDays?: number
  password?: string
  activeAt?: string
  blockBots?: boolean
  tags?: string[]
  collectionId?: number
}

export interface UpdateUrlSettingsPayload {
  activeAt?: string | null
  expiresAt?: string | null
  password?: string | null
  blockBots?: boolean
}

export interface BulkOperationPayload {
  operation: "tag" | "move" | "extend" | "delete"
  codes: string[]
  tagIds?: number[]
  collectionId?: number
  extendDays?: number
}

export interface CreateCollectionPayload {
  name: string
  parentId?: number
}

export interface CreateTagPayload {
  name: string
  color?: string
}

export interface CreateApiKeyPayload {
  name: string
  scopes?: string[]
  expiresAt?: string
  allowedIps?: string[]
}

export interface UpdateApiKeyPayload {
  name?: string
  scopes?: string[]
  allowedIps?: string[]
  expiresAt?: string
}

export interface CheckoutPayload {
  planCode: string
}

export interface HealthResponse {
  status: string
  uptime: number
  db: string
  redis: string | null
}
