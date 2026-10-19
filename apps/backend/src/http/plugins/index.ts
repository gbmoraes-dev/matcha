import { Elysia } from 'elysia'
import { cors } from './cors'
import { errorHandler } from './error'
import { openapi } from './openapi'
import { requestId } from './request-id'
import { requestLogger } from './request-logger'

// The request logger must come before cors and openapi: Elysia hooks only
// reach the routes registered after them.
export const plugins = new Elysia()
  .use(requestId)
  .use(requestLogger)
  .use(cors)
  .use(openapi)
  .use(errorHandler)
