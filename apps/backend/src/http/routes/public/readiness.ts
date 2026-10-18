import { Elysia } from 'elysia'
import { z } from 'zod'
import { db } from '@/database'

const status = z.enum(['available', 'unavailable'])

const schema = z.object({
  application: status,
  database: status,
})

export const readiness = new Elysia().get(
  '/readyz',
  async ({ status }) => {
    const checks = await Promise.allSettled([db.$client.query('SELECT 1')])

    const hasError = checks.some((check) => check.status === 'rejected')

    if (hasError) {
      return status(503, {
        application: 'available',
        database:
          checks[0].status === 'fulfilled' ? 'available' : 'unavailable',
      })
    }

    return status(200, {
      application: 'available',
      database: 'available',
    })
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
