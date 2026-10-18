import { broker } from '@/broker/broker'
import { logger } from '@/utils/logger'

await broker.onConnect(0)

logger.info('worker is listening for messages')
