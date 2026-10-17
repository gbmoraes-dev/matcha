import { Elysia } from 'elysia'
import { liveness } from './liveness'

export const publicRoutes = new Elysia().use(liveness)
