import { broker } from '@/broker/broker'
import { env } from '@/env'

export const EMAILS_QUEUE = `${env.NAME}.emails`
export const EMAILS_DEAD_QUEUE = `${EMAILS_QUEUE}.dlq`

export const emailsQueue = {
  queue: EMAILS_QUEUE,
  durable: true,
  arguments: {
    'x-dead-letter-exchange': '',
    'x-dead-letter-routing-key': EMAILS_DEAD_QUEUE,
  },
}

export const emails = broker.createPublisher({
  confirm: true,
  queues: [{ queue: EMAILS_DEAD_QUEUE, durable: true }, emailsQueue],
})
