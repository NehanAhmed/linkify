import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import app from './app'
import { createServer } from 'http'

const PORT = process.env.PORT || 3000
const server = createServer(app)

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
