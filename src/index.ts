import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import app from './app'
import { createServer } from 'http'
import { startHealthCheckJob } from './jobs/healthCheckJob'

const PORT = process.env.PORT || 3000
const server = createServer(app)

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)

  const interval = Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 3_600_000
  if (interval > 0) {
    startHealthCheckJob(interval)
    console.log('Link health check job started')
  }
})
