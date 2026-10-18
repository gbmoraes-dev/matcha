import { Elysia } from 'elysia'
import { liveness } from './liveness'
import { readiness } from './readiness'

export const publicRoutes = new Elysia().use(liveness).use(readiness)
