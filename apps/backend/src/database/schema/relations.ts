import { defineRelations } from 'drizzle-orm'
import { schema } from '.'

export const relations = defineRelations(schema, (r) => ({
  users: {
    emailVerificationTokens: r.many.emailVerificationTokens({
      from: r.users.id,
      to: r.emailVerificationTokens.userId,
    }),
  },
  emailVerificationTokens: {
    user: r.one.users({
      from: r.emailVerificationTokens.userId,
      to: r.users.id,
      optional: false,
    }),
  },
}))
