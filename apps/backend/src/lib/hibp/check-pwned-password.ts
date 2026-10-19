import { env } from '@/env'
import { logger } from '@/utils/logger'

const RANGE_URL = 'https://api.pwnedpasswords.com/range/'

export async function checkPwnedPassword(password: string) {
  const hash = new Bun.CryptoHasher('sha1')
    .update(password)
    .digest('hex')
    .toUpperCase()

  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  return fetch(RANGE_URL + prefix, {
    headers: { 'Add-Padding': 'true' },
    signal: AbortSignal.timeout(env.CONNECTION_TIMEOUT_MS),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`unexpected status ${response.status}`)
      }

      const body = await response.text()

      return body.split('\n').some((line) => {
        const [candidate, count] = line.trim().split(':')

        return candidate === suffix && Number(count) > 0
      })
    })
    .catch((error: Error) => {
      logger.warn({ err: error }, 'pwned password check failed')

      return false
    })
}
