import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '@/env'
import { logger } from '@/utils/logger'

const pool = new Pool({
  application_name: env.NAME,
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: env.CONNECTION_TIMEOUT_MS,
  query_timeout: env.QUERY_TIMEOUT_MS,
  statement_timeout: env.QUERY_TIMEOUT_MS,
})

pool.on('error', (error) => {
  logger.error({ err: error }, 'database idle client error')
})

export const db = drizzle({
  client: pool,
  logger: env.ENVIRONMENT === 'development' && {
    logQuery: (query) => logger.info({ query }, 'database query'),
  },
})
