import { treaty } from '@elysia/eden'
import { Elysia } from 'elysia'
import { publicRoutes } from './routes/public'

export const app = new Elysia().use(publicRoutes)

export const api = treaty(app)
