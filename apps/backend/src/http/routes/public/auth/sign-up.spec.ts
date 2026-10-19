import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import {
  resetAuth,
  sentEmails,
  signUpBody,
  spyOnEmails,
  spyOnPwnedPasswords,
} from '@test/auth'
import { db } from '@/database'
import { emailVerificationTokens } from '@/database/schema/email-verification-tokens'
import { users } from '@/database/schema/users'
import { env } from '@/env'
import { api } from '@/http/app'
import { hashToken } from '@/utils/hash-token'

beforeEach(resetAuth)

afterEach(() => {
  mock.restore()
})

test('POST /auth/sign-up creates an unverified user and sends the verification email', async () => {
  const emails = spyOnEmails()
  spyOnPwnedPasswords()

  const { data, status } = await api.auth['sign-up'].post(signUpBody)

  const [user] = await db.select().from(users)
  const [email] = sentEmails(emails)
  expect(status).toBe(201)
  expect(data).toEqual({
    id: expect.any(String),
    email: 'ana@example.com',
    username: 'ana_silva',
    firstName: 'Ana',
    lastName: 'Silva',
  })
  expect(user?.id).toBe(data?.id)
  expect(user?.verifiedAt).toBeNull()
  expect(emails).toHaveBeenCalledTimes(1)
  expect(email?.to).toBe('ana@example.com')
  expect(email?.html).toContain(`${env.ORIGIN}/verify?token=`)
})

test('POST /auth/sign-up stores the password as an argon2id hash', async () => {
  spyOnEmails()
  spyOnPwnedPasswords()

  await api.auth['sign-up'].post(signUpBody)

  const [user] = await db.select().from(users)
  expect(user?.passwordHash).toStartWith('$argon2id$')
  expect(user?.passwordHash).not.toContain(signUpBody.password)
  expect(
    await Bun.password.verify(signUpBody.password, user?.passwordHash ?? ''),
  ).toBe(true)
})

test('POST /auth/sign-up stores only the hash of a verification token that lasts 24 hours', async () => {
  const emails = spyOnEmails()
  spyOnPwnedPasswords()
  const before = Date.now()

  await api.auth['sign-up'].post(signUpBody)

  const token = sentEmails(emails)[0]?.html.match(/verify\?token=([\w-]+)/)?.[1]
  const [stored] = await db.select().from(emailVerificationTokens)
  const ttl = (stored?.expiresAt.getTime() ?? 0) - before
  expect(stored?.tokenHash).toBe(hashToken(token ?? ''))
  expect(stored?.tokenHash).not.toBe(token)
  expect(stored?.usedAt).toBeNull()
  expect(ttl).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000)
  expect(ttl).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000)
})

test('POST /auth/sign-up rejects a password found in Have I Been Pwned with 422', async () => {
  const emails = spyOnEmails()
  const pwned = spyOnPwnedPasswords([signUpBody.password])

  const { error, status } = await api.auth['sign-up'].post(signUpBody)

  const [url] = pwned.mock.calls[0] ?? []
  expect(status).toBe(422)
  expect(error?.value).toMatchObject({
    code: 'PASSWORD_PWNED',
    details: [{ path: '/password' }],
  })
  expect(await db.select().from(users)).toHaveLength(0)
  expect(emails).not.toHaveBeenCalled()
  expect(String(url)).toMatch(
    /^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/,
  )
})

test('POST /auth/sign-up still creates the account when Have I Been Pwned fails', async () => {
  spyOnEmails()
  spyOnPwnedPasswords().mockRejectedValue(new Error('network down'))

  const { status } = await api.auth['sign-up'].post(signUpBody)

  expect(status).toBe(201)
  expect(await db.select().from(users)).toHaveLength(1)
})

test('POST /auth/sign-up rejects a common password, whatever its case, even when Have I Been Pwned fails', async () => {
  const emails = spyOnEmails()
  spyOnPwnedPasswords().mockRejectedValue(new Error('network down'))

  const { error, status } = await api.auth['sign-up'].post({
    ...signUpBody,
    password: 'BaseBall',
  })

  expect(status).toBe(422)
  expect(error?.value).toMatchObject({
    code: 'PASSWORD_COMMON',
    details: [{ path: '/password' }],
  })
  expect(await db.select().from(users)).toHaveLength(0)
  expect(emails).not.toHaveBeenCalled()
})

test('POST /auth/sign-up returns 409 for a duplicate email, whatever its case', async () => {
  const emails = spyOnEmails()
  spyOnPwnedPasswords()
  await api.auth['sign-up'].post(signUpBody)

  const { error, status } = await api.auth['sign-up'].post({
    ...signUpBody,
    email: 'ANA@example.com',
    username: 'another_ana',
  })

  expect(status).toBe(409)
  expect(error?.value).toMatchObject({ code: 'EMAIL_TAKEN' })
  expect(await db.select().from(users)).toHaveLength(1)
  expect(emails).toHaveBeenCalledTimes(1)
})

test('POST /auth/sign-up returns 409 for a duplicate username, whatever its case', async () => {
  const emails = spyOnEmails()
  spyOnPwnedPasswords()
  await api.auth['sign-up'].post(signUpBody)

  const { error, status } = await api.auth['sign-up'].post({
    ...signUpBody,
    email: 'other@example.com',
    username: 'ANA_SILVA',
  })

  expect(status).toBe(409)
  expect(error?.value).toMatchObject({ code: 'USERNAME_TAKEN' })
  expect(await db.select().from(users)).toHaveLength(1)
  expect(emails).toHaveBeenCalledTimes(1)
})

const invalid = {
  'a malformed email': { email: 'not-an-email' },
  'a username with spaces': { username: 'ana silva' },
  'a password that is too short': { password: 'a'.repeat(7) },
  'a password that is too long': { password: 'a'.repeat(129) },
}

for (const [name, override] of Object.entries(invalid)) {
  test(`POST /auth/sign-up returns 422 for ${name}`, async () => {
    const emails = spyOnEmails()
    spyOnPwnedPasswords()

    const { error, status } = await api.auth['sign-up'].post({
      ...signUpBody,
      ...override,
    })

    expect(status).toBe(422)
    expect(error?.value).toMatchObject({ code: 'VALIDATION' })
    expect(await db.select().from(users)).toHaveLength(0)
    expect(emails).not.toHaveBeenCalled()
  })
}
