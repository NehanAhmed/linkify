import { pgTable, serial, text, timestamp, integer, index } from 'drizzle-orm/pg-core'

export const urls = pgTable('urls', {
  code: text('code').primaryKey(),
  url: text('url').notNull(),
  title: text('title'),
  description: text('description'),
  image: text('image'),
  visits: integer('visits').default(0).notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const visits = pgTable(
  'visits',
  {
    id: serial('id').primaryKey(),
    code: text('code')
      .notNull()
      .references(() => urls.code, { onDelete: 'cascade' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    referer: text('referer'),
    visitedAt: timestamp('visited_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('visits_code_idx').on(table.code),
    visitedAtIdx: index('visits_visited_at_idx').on(table.visitedAt),
  }),
)
