import { z } from 'zod'

const schema = z.object({
  NAME: z.string().default('application'),
  ENVIRONMENT: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  HOSTNAME: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().min(0).max(65535).default(3333),
})

export const env = schema.parse(process.env)
