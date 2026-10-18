import { Elysia } from 'elysia'
import { z } from 'zod'
import { broker } from '@/broker/broker'
import { redis } from '@/cache'
import { db } from '@/database'
import { env } from '@/env'
import { s3 } from '@/storage'
import { withTimeout } from '@/utils/with-timeout'

const dependency = z.enum(['available', 'unavailable'])

const schema = z.object({
  application: dependency,
  database: dependency,
  cache: dependency,
  bucket: dependency,
  broker: dependency,
})

type Dependency = z.infer<typeof dependency>

async function probe(
  label: string,
  check: () => Promise<unknown>,
): Promise<Dependency> {
  return withTimeout(check(), env.CONNECTION_TIMEOUT_MS, label).then(
    () => 'available',
    () => 'unavailable',
  )
}

export const readiness = new Elysia().get(
  '/readyz',
  async ({ status }) => {
    const [database, cache, bucket, brokerStatus] = await Promise.all([
      probe('database', () => db.$client.query('SELECT 1')),
      probe('cache', () => redis.ping()),
      probe('bucket', () => s3.list({ maxKeys: 1 })),
      probe('broker', () => broker.onConnect(env.CONNECTION_TIMEOUT_MS, true)),
    ])

    const checks = {
      application: 'available',
      database,
      cache,
      bucket,
      broker: brokerStatus,
    } as const

    const isReady = Object.values(checks).every(
      (value) => value === 'available',
    )

    return status(isReady ? 200 : 503, checks)
  },
  {
    detail: {
      tags: ['Health'],
      summary: 'Get readiness status',
      description:
        'Get the readiness status of the service and its dependencies',
      operationId: 'getReadiness',
    },
    response: {
      200: schema,
      503: schema,
    },
  },
)
