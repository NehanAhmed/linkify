import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import routes from './routes'
import { rootRedirect } from './controllers/url.controllers'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

const app = express()

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : '*'

app.use(helmet())
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '1mb' }))
app.disable('x-powered-by')

app.use(routes)

app.get('/:code(\\w{3,16})', rootRedirect)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
