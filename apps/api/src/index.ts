import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import { env } from './utils/env'
import { logger } from './utils/logger'

import app from './app'
import { createServer } from 'http'
import { startHealthCheckJob } from './jobs/healthCheckJob'
import { seedPlans } from './jobs/seedPlans'

const server = createServer(app)

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server started')

  seedPlans().catch((err) => {
    logger.error({ err }, 'Failed to seed plans on startup')
  })

  if (env.HEALTH_CHECK_INTERVAL_MS > 0) {
    startHealthCheckJob(env.HEALTH_CHECK_INTERVAL_MS)
    logger.info({ interval: env.HEALTH_CHECK_INTERVAL_MS }, 'Health check job started')
  }
})
