import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import {
  resetAuth,
  sentEmails,
  signUpBody,
  spyOnEmails,
  spyOnPwnedPasswords,
  tokenFrom,
} from '@test/auth'
import { db } from '@/database'
import { emailVerificationTokens } from '@/database/schema/email-verification-tokens'
import { env } from '@/env'
import { api } from '@/http/app'

beforeEach(resetAuth)

afterEach(() => {
  mock.restore()
})

async function signUp() {
  const emails = spyOnEmails()
  spyOnPwnedPasswords()

  await api.auth['sign-up'].post(signUpBody)

  const token = tokenFrom(sentEmails(emails)[0])
  emails.mockClear()

  return { emails, token }
}

test('POST /auth/verification/send sends a new link that replaces the previous one', async () => {
  const { emails, token: oldToken } = await signUp()

  const { status } = await api.auth.verification.send.post({
    email: '  ANA@Example.com ',
  })

  const [email] = sentEmails(emails)
  const old = await api.auth.verify.post({ token: oldToken })
  const fresh = await api.auth.verify.post({ token: tokenFrom(email) })
  expect(status).toBe(202)
  expect(emails).toHaveBeenCalledTimes(1)
  expect(email?.to).toBe(signUpBody.email)
  expect(email?.html).toContain(`${env.ORIGIN}/verify?token=`)
  expect(old.status).toBe(400)
  expect(fresh.status).toBe(204)
})

test('POST /auth/verification/send answers 202 without sending for an unknown email', async () => {
  const emails = spyOnEmails()

  const { status } = await api.auth.verification.send.post({
    email: 'nobody@example.com',
  })

  expect(status).toBe(202)
  expect(emails).not.toHaveBeenCalled()
  expect(await db.select().from(emailVerificationTokens)).toHaveLength(0)
})

test('POST /auth/verification/send answers 202 without sending for a verified user', async () => {
  const { emails, token } = await signUp()
  await api.auth.verify.post({ token })

  const { status } = await api.auth.verification.send.post({
    email: signUpBody.email,
  })

  expect(status).toBe(202)
  expect(emails).not.toHaveBeenCalled()
  expect(await db.select().from(emailVerificationTokens)).toHaveLength(1)
})

test('POST /auth/verification/send returns 422 for an invalid email', async () => {
  const emails = spyOnEmails()

  const { error, status } = await api.auth.verification.send.post({
    email: 'not-an-email',
  })

  expect(status).toBe(422)
  expect(error?.value).toMatchObject({ code: 'VALIDATION' })
  expect(emails).not.toHaveBeenCalled()
})
