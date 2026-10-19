import { rateLimit as plugin } from 'elysia-rate-limit'
import { env } from '@/env'
import { redisRateLimitContext } from './redis-rate-limit-context'

type RateLimitOptions = {
  name: string
  max: number
  duration: number
}

const errorResponse = Response.json(
  { code: 'RATE_LIMITED', message: 'Too many requests' },
  { status: 429 },
)

export function rateLimit({ name, max, duration }: RateLimitOptions) {
  return plugin({
    max,
    duration,
    scoping: 'scoped',
    errorResponse,
    context: redisRateLimitContext(name, duration),
    generator: (request, server) => {
      const forwarded = env.TRUST_PROXY
        ? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
        : undefined

      return forwarded || server?.requestIP(request)?.address || 'unknown'
    },
  })
}
