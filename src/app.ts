import express from 'express'
import routes from './routes'
import { rootRedirect } from './controllers/url.controllers'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

const app = express()

app.use(express.json({ limit: '1mb' }))
app.disable('x-powered-by')

app.use(routes)

app.get('/:code(\\w{3,16})', rootRedirect)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
