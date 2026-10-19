import { snakeCase, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = snakeCase.table('users', {
  id: uuid()
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  email: text().notNull().unique(),
  username: text().notNull().unique(),
  firstName: text().notNull(),
  lastName: text().notNull(),
  passwordHash: text().notNull(),
  verifiedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})
