import { Elysia } from 'elysia'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { REQUEST_ID_HEADER } from './request-id'

export const error = z.object({
  code: z.string(),
  message: z.string(),
  details: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
})

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(
  { as: 'global' },
  ({ code, error, set, status }) => {
    if (code === 'VALIDATION' && error.type !== 'response') {
      return status(422, {
        code: 'VALIDATION',
        message: 'The request is invalid',
        details: error.all.map((issue) => ({
          path: issue.path,
          message: issue.summary ?? issue.message,
        })),
      })
    }

    if (code === 'PARSE') {
      return status(400, {
        code: 'BAD_REQUEST',
        message: 'The request body is invalid',
      })
    }

    if (code === 'NOT_FOUND') {
      return status(404, {
        code: 'NOT_FOUND',
        message: 'Route not found',
      })
    }

    logger.error(
      { err: error, requestId: set.headers[REQUEST_ID_HEADER] },
      'unhandled error',
    )

    return status(500, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error has occurred. Please try again later.',
    })
  },
)
