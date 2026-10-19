import { treaty } from '@elysia/eden'
import { Elysia } from 'elysia'
import { plugins } from './plugins'
import { publicRoutes } from './routes/public'

export const app = new Elysia().use(plugins).use(publicRoutes)

export const api = treaty(app)
