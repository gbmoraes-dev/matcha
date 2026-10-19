import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { env } from '@/env'
import { logger } from '@/utils/logger'

const pool = new Pool({
  application_name: `${env.NAME}-migrate`,
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: env.CONNECTION_TIMEOUT_MS,
})

await migrate(drizzle({ client: pool }), {
  migrationsFolder: './src/database/migrations',
})

await pool.end()

logger.info('migrations applied')
