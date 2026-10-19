import { treaty } from '@elysia/eden'
import { Elysia } from 'elysia'
import { plugins } from './plugins'
import { privateRoutes } from './routes/private'
import { publicRoutes } from './routes/public'

export const app = new Elysia()
  .use(plugins)
  .use(publicRoutes)
  .use(privateRoutes)

export const api = treaty(app)
