import { index, snakeCase, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const emailVerificationTokens = snakeCase.table(
  'email_verification_tokens',
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('email_verification_tokens_user_id_idx').on(table.userId)],
)
