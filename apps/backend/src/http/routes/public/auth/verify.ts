import { and, eq, gt, isNull } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { db } from '@/database'
import { emailVerificationTokens } from '@/database/schema/email-verification-tokens'
import { users } from '@/database/schema/users'
import { error } from '@/http/plugins/error'
import { rateLimit } from '@/http/plugins/rate-limit'
import { hashToken } from '@/utils/hash-token'

const schema = z.object({
  token: z.string().min(1),
})

export const verify = new Elysia()
  .use(rateLimit({ name: 'verify', max: 10, duration: 15 * 60 * 1000 }))
  .post(
    '/verify',
    async ({ body, status }) => {
      const verified = await db.transaction(async (tx) => {
        const [token] = await tx
          .update(emailVerificationTokens)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(emailVerificationTokens.tokenHash, hashToken(body.token)),
              isNull(emailVerificationTokens.usedAt),
              gt(emailVerificationTokens.expiresAt, new Date()),
            ),
          )
          .returning({ userId: emailVerificationTokens.userId })

        if (!token) {
          return false
        }

        await tx
          .update(users)
          .set({ verifiedAt: new Date() })
          .where(and(eq(users.id, token.userId), isNull(users.verifiedAt)))

        return true
      })

      if (!verified) {
        return status(400, {
          code: 'INVALID_TOKEN',
          message: 'The verification link is invalid or has expired',
        })
      }

      return status(204, undefined)
    },
    {
      body: schema,
      detail: {
        tags: ['Auth'],
        summary: 'Verify an email',
        description: 'Verify the account that owns the token and consume it',
        operationId: 'verifyEmail',
      },
      response: {
        204: z.undefined(),
        400: error,
        422: error,
        429: error,
        500: error,
      },
    },
  )
