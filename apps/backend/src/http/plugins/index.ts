import { Elysia } from 'elysia'
import { cors } from './cors'
import { errorHandler } from './error'
import { openapi } from './openapi'
import { requestId } from './request-id'

export const plugins = new Elysia()
  .use(requestId)
  .use(cors)
  .use(openapi)
  .use(errorHandler)
