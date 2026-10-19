import { spyOn } from 'bun:test'
import { channels } from '@/broker/channels'
import { redis } from '@/cache'
import { db } from '@/database'
import { users } from '@/database/schema/users'
import { env } from '@/env'

export const signUpBody = {
  email: 'ana@example.com',
  username: 'ana_silva',
  firstName: 'Ana',
  lastName: 'Silva',
  password: crypto.randomUUID(),
}

export async function resetAuth() {
  await db.delete(users)

  const keys = await redis.keys(`${env.NAME}:rate-limit:*`)

  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

export function spyOnEmails() {
  return spyOn(channels.emails, 'send').mockResolvedValue(undefined)
}

export function sentEmails(emails: ReturnType<typeof spyOnEmails>) {
  return emails.mock.calls.map(
    ([, message]) => message as { to: string; html: string },
  )
}

export function tokenFrom(email: { html: string } | undefined) {
  const token = email?.html.match(/verify\?token=([\w-]+)/)?.[1]

  if (!token) {
    throw new Error('verification link not found in the email')
  }

  return token
}

export function spyOnPwnedPasswords(pwned: string[] = []) {
  const hashes = pwned.map((password) =>
    new Bun.CryptoHasher('sha1').update(password).digest('hex').toUpperCase(),
  )

  return spyOn(globalThis, 'fetch').mockImplementation((async (
    input: Request | string | URL,
  ) => {
    const prefix = String(input).split('/').at(-1) ?? ''
    const lines = hashes
      .filter((hash) => hash.startsWith(prefix))
      .map((hash) => `${hash.slice(5)}:42`)

    return new Response(
      [...lines, '0000000000000000000000000000000000A:0'].join('\r\n'),
    )
  }) as typeof fetch)
}
