import { cors as plugin } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { env } from '@/env'
import { REQUEST_ID_HEADER } from './request-id'

export const cors = new Elysia({ name: 'cors' }).use(
  plugin({
    origin: env.ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: [REQUEST_ID_HEADER],
    credentials: true,
  }),
)
