import dotenv from 'dotenv'

dotenv.config({ path: '../../.env.local' })

import { createServer } from 'http'

async function main() {
  const { env } = await import('./utils/env')
  const { logger } = await import('./utils/logger')
  const { default: app } = await import('./app')
  const { startHealthCheckJob } = await import('./jobs/healthCheckJob')
  const { seedPlans } = await import('./jobs/seedPlans')

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
}

main().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
