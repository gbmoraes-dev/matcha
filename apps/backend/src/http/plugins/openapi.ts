import { openapi as plugin } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { z } from 'zod'

export const openapi = new Elysia({ name: 'openapi' }).use(
  plugin({
    path: '/docs',
    exclude: {
      methods: ['OPTIONS'],
      paths: ['/', '/*'],
    },
    documentation: {
      info: {
        title: 'Matcha',
        description: 'Matcha API',
        version: '1.0.0',
      },
    },
    mapJsonSchema: {
      zod: z.toJSONSchema,
    },
  }),
)
