import express from 'express'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

const app = express()

app.use(express.json({ limit: '1mb' }))
app.disable('x-powered-by')

app.use(routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
