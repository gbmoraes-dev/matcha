import { broker } from '@/broker/broker'
import { emailsQueue } from '@/broker/channels/emails'
import { emailRequestedSchema } from '@/broker/messages/email-requested'
import { env } from '@/env'
import { resend } from '@/mailer/resend'
import { logger } from '@/utils/logger'

const PREFETCH = 2

const consumer = broker.createConsumer(
  {
    queue: emailsQueue.queue,
    queueOptions: emailsQueue,
    requeue: false,
    concurrency: PREFETCH,
    qos: {
      prefetchCount: PREFETCH,
    },
  },
  async (message) => {
    const email = emailRequestedSchema.parse(message.body)

    if (!resend) {
      logger.info(
        {
          emailId: email.id,
          to: email.to,
          subject: email.subject,
          links: [...email.html.matchAll(/href="([^"]+)"/g)].map(
            (match) => match[1],
          ),
          html: email.html,
        },
        'email delivered to the log',
      )

      return
    }

    const { error } = await resend.emails.send(
      {
        from: env.MAIL_FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
      },
      { idempotencyKey: email.id },
    )

    if (error) {
      logger.error({ err: error, emailId: email.id }, 'email delivery failed')

      throw new Error(error.message)
    }
  },
)

consumer.on('error', (error) => {
  logger.error({ err: error }, 'emails consumer error')
})

consumer.on('ready', () => {
  logger.info('worker is listening for messages')
})
