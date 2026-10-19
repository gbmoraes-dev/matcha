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
import { api } from '@/http/app'

beforeEach(resetAuth)

afterEach(() => {
  mock.restore()
})

async function signUp() {
  const emails = spyOnEmails()
  spyOnPwnedPasswords()

  await api.auth['sign-up'].post(signUpBody)

  return tokenFrom(sentEmails(emails)[0])
}

function findUser() {
  return db.query.users.findFirst({ where: { email: signUpBody.email } })
}

test('POST /auth/verify marks the user as verified and consumes the token', async () => {
  const token = await signUp()

  const { status } = await api.auth.verify.post({ token })

  const [stored] = await db.select().from(emailVerificationTokens)
  expect(status).toBe(204)
  expect((await findUser())?.verifiedAt).toBeInstanceOf(Date)
  expect(stored?.usedAt).toBeInstanceOf(Date)
})

test('POST /auth/verify returns 400 when the token is reused', async () => {
  const token = await signUp()
  await api.auth.verify.post({ token })
  const verifiedAt = (await findUser())?.verifiedAt

  const { error, status } = await api.auth.verify.post({ token })

  expect(status).toBe(400)
  expect(error?.value).toMatchObject({ code: 'INVALID_TOKEN' })
  expect((await findUser())?.verifiedAt).toEqual(verifiedAt)
})

test('POST /auth/verify returns 400 when the token has expired', async () => {
  const token = await signUp()
  await db
    .update(emailVerificationTokens)
    .set({ expiresAt: new Date(Date.now() - 1000) })

  const { error, status } = await api.auth.verify.post({ token })

  const [stored] = await db.select().from(emailVerificationTokens)
  expect(status).toBe(400)
  expect(error?.value).toMatchObject({ code: 'INVALID_TOKEN' })
  expect((await findUser())?.verifiedAt).toBeNull()
  expect(stored?.usedAt).toBeNull()
})

test('POST /auth/verify returns 400 for an unknown token', async () => {
  const { error, status } = await api.auth.verify.post({ token: 'unknown' })

  expect(status).toBe(400)
  expect(error?.value).toMatchObject({ code: 'INVALID_TOKEN' })
})

test('POST /auth/verify returns 422 for an empty token', async () => {
  const { error, status } = await api.auth.verify.post({ token: '' })

  expect(status).toBe(422)
  expect(error?.value).toMatchObject({ code: 'VALIDATION' })
})
