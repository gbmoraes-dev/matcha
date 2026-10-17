import { env } from '../env'
import { logger } from '../utils/logger'
import { app } from './app'

app.listen({ hostname: env.HOSTNAME, port: env.PORT })

logger.info(
  { url: app.server?.url, docs: new URL('/docs', app.server?.url) },
  'server is running',
)
