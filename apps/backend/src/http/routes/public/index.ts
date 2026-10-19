import { Elysia } from 'elysia'
import { authRoutes } from './auth'
import { liveness } from './liveness'
import { readiness } from './readiness'

export const publicRoutes = new Elysia()
  .use(liveness)
  .use(readiness)
  .use(authRoutes)
