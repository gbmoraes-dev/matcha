import { Elysia } from 'elysia'
import { z } from 'zod'
import { db } from '@/database'
import { users } from '@/database/schema/users'
import { env } from '@/env'
import { error } from '@/http/plugins/error'
import { rateLimit } from '@/http/plugins/rate-limit'
import { isCommonPassword } from '@/lib/common-passwords/is-common-password'
import { checkPwnedPassword } from '@/lib/hibp/check-pwned-password'
import { sendVerificationEmail } from '@/utils/send-verification-email'

const UNIQUE_VIOLATION = '23505'

const conflicts: Record<string, { code: string; message: string }> = {
  users_email_key: {
    code: 'EMAIL_TAKEN',
    message: 'This email is already registered',
  },
  users_username_key: {
    code: 'USERNAME_TAKEN',
    message: 'This username is already taken',
  },
}

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Use 3 to 20 letters, numbers or underscores'),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  password: z.string().min(8).max(128),
})

const user = z.object({
  id: z.uuid(),
  email: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
})

export const signUp = new Elysia()
  .use(rateLimit({ name: 'sign-up', max: 5, duration: 15 * 60 * 1000 }))
  .post(
    '/sign-up',
    async ({ body, status }) => {
      if (isCommonPassword(body.password)) {
        return status(422, {
          code: 'PASSWORD_COMMON',
          message: 'This password is too common. Choose a different one.',
          details: [
            {
              path: '/password',
              message: 'This password is too common',
            },
          ],
        })
      }

      if (await checkPwnedPassword(body.password)) {
        return status(422, {
          code: 'PASSWORD_PWNED',
          message:
            'This password has appeared in a data breach. Choose a different one.',
          details: [
            {
              path: '/password',
              message: 'This password has appeared in a data breach',
            },
          ],
        })
      }

      const { password, email, username, firstName, lastName } = body

      const passwordHash = await Bun.password.hash(password, {
        algorithm: 'argon2id',
        memoryCost: env.PASSWORD_MEMORY_COST,
        timeCost: env.PASSWORD_TIME_COST,
      })

      const created = await db
        .insert(users)
        .values({
          email,
          username,
          firstName,
          lastName,
          passwordHash,
        })
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .then(([row]) => row)
        .catch((cause: { cause?: { code?: string; constraint?: string } }) => {
          const conflict =
            cause.cause?.code === UNIQUE_VIOLATION
              ? conflicts[cause.cause.constraint ?? '']
              : undefined

          if (!conflict) {
            throw cause
          }

          return conflict
        })

      if (!created) {
        throw new Error('user was not returned after insert')
      }

      if ('code' in created) {
        return status(409, created)
      }

      await sendVerificationEmail(created)

      return status(201, created)
    },
    {
      body: schema,
      detail: {
        tags: ['Auth'],
        summary: 'Create an account',
        description:
          'Create an unverified account and send the verification email',
        operationId: 'signUp',
      },
      response: {
        201: user,
        409: error,
        422: error,
        429: error,
        500: error,
      },
    },
  )
