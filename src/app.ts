import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import * as Sentry from '@sentry/node'
import stripeRoutes from './routes/stripe.routes'
import routes from './routes'
import { rootRedirect } from './controllers/url.controllers'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { csrfProtection } from './middleware/csrf'
import { logger } from './utils/logger'
import { env } from './utils/env'

const app = express()

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
  })
}

const allowedOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : '*'

app.use(helmet())
app.use(cors({ origin: allowedOrigins }))
app.use(compression())
app.use(cookieParser())
app.use(pinoHttp({ logger }))
app.use('/api/stripe', stripeRoutes)
app.use(express.json({ limit: '1mb' }))
app.disable('x-powered-by')
app.use('/api', csrfProtection)

app.use(routes)

app.get('/:code(\\w{3,16})', rootRedirect)

app.use(notFoundHandler)

if (env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(Sentry.expressErrorHandler() as any)
}

app.use(errorHandler)

export default app
