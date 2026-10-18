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
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CONNECTION_TIMEOUT_MS: z.coerce.number().default(2000),
  QUERY_TIMEOUT_MS: z.coerce.number().default(5000),
  CACHE_URL: z.url({ protocol: /^rediss?$/ }),
  BROKER_URL: z.url({ protocol: /^amqp?$/ }),
  BUCKET_URL: z.url({ protocol: /^https?$/ }),
  BUCKET_NAME: z.string().min(1),
  BUCKET_ACCESS_KEY: z.string().min(1),
  BUCKET_SECRET_KEY: z.string().min(1),
})

export const env = schema.parse(process.env)
