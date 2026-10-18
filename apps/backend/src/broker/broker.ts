import { Connection } from 'rabbitmq-client'
import { env } from '@/env'
import { logger } from '@/utils/logger'

export const broker = new Connection({
  url: env.BROKER_URL,
  connectionName: env.NAME,
  connectionTimeout: env.CONNECTION_TIMEOUT_MS,
})

broker.on('error', (error) => {
  logger.error({ err: error }, 'broker connection error')
})

broker.on('connection', () => {
  logger.info('broker connected')
})
