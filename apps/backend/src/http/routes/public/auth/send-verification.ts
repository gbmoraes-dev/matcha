import { and, eq, isNull } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { db } from '@/database'
import { emailVerificationTokens } from '@/database/schema/email-verification-tokens'
import { users } from '@/database/schema/users'
import { error } from '@/http/plugins/error'
import { rateLimit } from '@/http/plugins/rate-limit'
import { sendVerificationEmail } from '@/utils/send-verification-email'

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
})

export const sendVerification = new Elysia()
  .use(
    rateLimit({
      name: 'send-verification',
      max: 3,
      duration: 15 * 60 * 1000,
    }),
  )
  .post(
    '/verification/send',
    async ({ body, status }) => {
      const { email } = body

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
        })
        .from(users)
        .where(and(eq(users.email, email), isNull(users.verifiedAt)))

      if (user) {
        await db
          .update(emailVerificationTokens)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(emailVerificationTokens.userId, user.id),
              isNull(emailVerificationTokens.usedAt),
            ),
          )

        await sendVerificationEmail(user)
      }

      return status(202, '')
    },
    {
      body: schema,
      detail: {
        tags: ['Auth'],
        summary: 'Send the verification email',
        description:
          'Always answers 202, so it does not reveal which emails are registered',
        operationId: 'sendVerification',
      },
      response: {
        202: z.literal(''),
        422: error,
        429: error,
        500: error,
      },
    },
  )
