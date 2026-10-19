import Elysia from 'elysia'
import { sendVerification } from './send-verification'
import { signUp } from './sign-up'
import { verify } from './verify'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(sendVerification)
  .use(signUp)
  .use(verify)
