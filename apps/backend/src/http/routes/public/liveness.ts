import { Elysia } from 'elysia'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['available', 'unavailable']),
  uptime: z.number(),
})

export const liveness = new Elysia().get(
  '/healthz',
  () => ({
    status: 'available' as const,
    uptime: process.uptime(),
  }),
  {
    detail: {
      tags: ['Health'],
      summary: 'Get liveness status',
      description: 'Get the liveness status of the service',
      operationId: 'getLiveness',
    },
    response: {
      200: schema,
      500: z.object({
        message: z.string(),
      }),
    },
  },
)
