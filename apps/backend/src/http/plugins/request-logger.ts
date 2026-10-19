import { Elysia } from 'elysia'
import { logger } from '@/utils/logger'
import { REQUEST_ID_HEADER } from './request-id'

const startedAt = new WeakMap<Request, number>()

function getLevel(path: string, status: number) {
  if (path === '/healthz' || path === '/readyz' || path.startsWith('/docs')) {
    return 'debug'
  }

  if (status >= 500) {
    return 'error'
  }

  return status >= 400 ? 'warn' : 'info'
}

export const requestLogger = new Elysia({ name: 'request-logger' })
  .onRequest(({ request }) => {
    startedAt.set(request, performance.now())
  })
  .onAfterResponse({ as: 'global' }, ({ request, set, responseValue }) => {
    const start = startedAt.get(request) ?? performance.now()
    const path = new URL(request.url).pathname
    const status =
      responseValue instanceof Response
        ? responseValue.status
        : typeof set.status === 'number'
          ? set.status
          : 200

    const log = logger.child({
      requestId: String(set.headers[REQUEST_ID_HEADER]),
    })

    log[getLevel(path, status)](
      {
        method: request.method,
        path,
        status,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
      },
      'request completed',
    )
  })
