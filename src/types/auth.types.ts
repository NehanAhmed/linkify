export type UserRole = 'user' | 'admin'

export interface AuthenticatedUser {
  id: string
  email?: string
  role: UserRole
  aal?: 'aal1' | 'aal2'
  apiKeyName?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}
