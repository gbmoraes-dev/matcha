import { z } from 'zod'
import { channels } from '../channels'
import { EMAILS_QUEUE } from '../channels/emails'

export const emailRequestedSchema = z.object({
  id: z.uuid(),
  to: z.email(),
  subject: z.string().min(1),
  html: z.string().min(1),
})

export type EmailRequestedMessage = z.infer<typeof emailRequestedSchema>

export function dispatchEmailRequested(
  data: Omit<EmailRequestedMessage, 'id'>,
) {
  return channels.emails.send(
    {
      routingKey: EMAILS_QUEUE,
      durable: true,
    },
    emailRequestedSchema.parse({ id: Bun.randomUUIDv7(), ...data }),
  )
}
