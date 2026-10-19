import type { Context } from 'elysia-rate-limit'
import { z } from 'zod'
import { redis } from '@/cache'
import { env } from '@/env'

const INCREMENT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`

const DECREMENT = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  redis.call('DECR', KEYS[1])
end
`

const incremented = z.tuple([z.number(), z.number()])

export function redisRateLimitContext(name: string, duration: number): Context {
  const prefix = `${env.NAME}:rate-limit:${name}:`

  return {
    init() {},
    async increment(key) {
      const result = await redis.send('EVAL', [
        INCREMENT,
        '1',
        prefix + key,
        String(duration),
      ])
      const [count, ttl] = incremented.parse(result)
      const nextReset = Date.now() + ttl

      return {
        count,
        nextReset: new Date(nextReset),
        start: nextReset - duration,
      }
    },
    async decrement(key) {
      await redis.send('EVAL', [DECREMENT, '1', prefix + key])
    },
    async reset(key) {
      if (key) {
        await redis.del(prefix + key)
      }
    },
    kill() {},
  }
}
