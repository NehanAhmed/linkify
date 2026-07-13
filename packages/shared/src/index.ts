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
