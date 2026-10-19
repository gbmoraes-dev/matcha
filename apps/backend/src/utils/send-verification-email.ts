import { render } from '@react-email/components'
import { dispatchEmailRequested } from '@/broker/messages/email-requested'
import { db } from '@/database'
import { emailVerificationTokens } from '@/database/schema/email-verification-tokens'
import { env } from '@/env'
import { VerifyAccount } from '@/mailer/templates/verify-account'
import { hashToken } from '@/utils/hash-token'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

type Recipient = {
  id: string
  email: string
  firstName: string
}

export async function sendVerificationEmail(user: Recipient) {
  const token = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString('base64url')

  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  })

  const url = new URL('/verify', env.ORIGIN)
  url.searchParams.set('token', token)

  await dispatchEmailRequested({
    to: user.email,
    subject: 'Verify your Matcha account',
    html: await render(
      VerifyAccount({ name: user.firstName, url: url.toString() }),
    ),
  })
}
