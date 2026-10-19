import { Elysia } from 'elysia'
import { logger } from '@/utils/logger'

export const REQUEST_ID_HEADER = 'x-request-id'

export const requestId = new Elysia({ name: 'request-id' })
  .onRequest(({ set }) => {
    set.headers[REQUEST_ID_HEADER] = Bun.randomUUIDv7()
  })
  .derive({ as: 'global' }, ({ set }) => {
    const id = String(set.headers[REQUEST_ID_HEADER])

    return { requestId: id, log: logger.child({ requestId: id }) }
  })
