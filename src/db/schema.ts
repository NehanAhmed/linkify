import { pgTable, serial, text, timestamp, integer, index } from 'drizzle-orm/pg-core'

export const urls = pgTable('urls', {
  code: text('code').primaryKey(),
  url: text('url').notNull(),
  title: text('title'),
  description: text('description'),
  image: text('image'),
  visits: integer('visits').default(0).notNull(),
  uniqueVisits: integer('unique_visits').default(0).notNull(),
  expiresAt: timestamp('expires_at'),
  lastCheckedAt: timestamp('last_checked_at'),
  lastStatusCode: integer('last_status_code'),
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
    country: text('country'),
    city: text('city'),
    isp: text('isp'),
    deviceType: text('device_type'),
    os: text('os'),
    browser: text('browser'),
    browserVersion: text('browser_version'),
    referrerCategory: text('referrer_category'),
    visitedAt: timestamp('visited_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('visits_code_idx').on(table.code),
    visitedAtIdx: index('visits_visited_at_idx').on(table.visitedAt),
    ipCodeIdx: index('visits_ip_code_idx').on(table.ipAddress, table.code),
  }),
)
