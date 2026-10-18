import { Resend } from 'resend'
import { env } from '@/env'

export const resend =
  env.ENVIRONMENT === 'production' ? new Resend(env.RESEND_API_KEY) : undefined
