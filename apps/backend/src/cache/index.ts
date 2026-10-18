import { RedisClient } from 'bun'
import { env } from '@/env'
import { logger } from '@/utils/logger'

export const redis = new RedisClient(env.CACHE_URL, {
  connectionTimeout: env.CONNECTION_TIMEOUT_MS,
  maxRetries: 4294967295,
})

redis.onclose = (error) => {
  logger.warn({ err: error }, 'cache connection closed')
}

redis.onconnect = () => {
  logger.info('cache connected')
}
