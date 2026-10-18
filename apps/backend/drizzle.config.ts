import { defineConfig } from 'drizzle-kit'
import { env } from './src/env'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/*.ts',
  out: './src/database/migrations',
  schemaFilter: ['public'],
  verbose: true,
  breakpoints: true,
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
