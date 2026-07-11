import { pgTable, serial, text, timestamp, integer, index, uuid, boolean, uniqueIndex, primaryKey, jsonb, numeric, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  role: text('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull(),
  name: text('name').notNull(),
  scopes: text('scopes').array(),
  allowedIps: text('allowed_ips').array(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const urls = pgTable(
  'urls',
  {
    code: text('code').primaryKey(),
    url: text('url').notNull(),
    title: text('title'),
    description: text('description'),
    image: text('image'),
    visits: integer('visits').default(0).notNull(),
    uniqueVisits: integer('unique_visits').default(0).notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash'),
    blockBots: boolean('block_bots').default(false).notNull(),
    activeAt: timestamp('active_at'),
    expiresAt: timestamp('expires_at'),
    deletedAt: timestamp('deleted_at'),
    lastCheckedAt: timestamp('last_checked_at'),
    lastStatusCode: integer('last_status_code'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    affiliateId: text('affiliate_id'),
    affiliateNetwork: text('affiliate_network'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userDeletedIdx: index('urls_user_deleted_idx').on(table.userId, table.deletedAt),
    deletedAtIdx: index('urls_deleted_at_idx').on(table.deletedAt),
  }),
)

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
    isBot: boolean('is_bot').default(false).notNull(),
    fingerprint: text('fingerprint'),
    isAffiliateClick: boolean('is_affiliate_click').default(false).notNull(),
    affiliateCommission: numeric('affiliate_commission'),
    visitedAt: timestamp('visited_at').defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('visits_code_idx').on(table.code),
    visitedAtIdx: index('visits_visited_at_idx').on(table.visitedAt),
    codeVisitedIdx: index('visits_code_visited_idx').on(table.code, table.visitedAt),
    fingerprintCodeIdx: index('visits_fingerprint_code_idx').on(table.fingerprint, table.code, table.visitedAt),
    ipCodeIdx: index('visits_ip_code_idx').on(table.ipAddress, table.code),
  }),
)

export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    parentId: integer('parent_id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0).notNull(),
    shareToken: text('share_token').unique(),
    sharedAt: timestamp('shared_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    parentIdIdx: index('collections_parent_id_idx').on(table.parentId),
    userIdIdx: index('collections_user_id_idx').on(table.userId),
    shareTokenIdx: index('collections_share_token_idx').on(table.shareToken),
  }),
)

export const urlCollections = pgTable(
  'url_collections',
  {
    urlCode: text('url_code')
      .notNull()
      .references(() => urls.code, { onDelete: 'cascade' }),
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.urlCode, table.collectionId] }),
    collectionIdIdx: index('url_collections_collection_id_idx').on(table.collectionId),
  }),
)

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color').notNull().default('#6366f1'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userTagNameIdx: uniqueIndex('tags_user_name_idx').on(table.userId, table.name),
  }),
)

export const urlTags = pgTable(
  'url_tags',
  {
    urlCode: text('url_code')
      .notNull()
      .references(() => urls.code, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.urlCode, table.tagId] }),
    tagIdIdx: index('url_tags_tag_id_idx').on(table.tagId),
  }),
)

export const urlStatsHourly = pgTable(
  'url_stats_hourly',
  {
    code: text('code')
      .notNull()
      .references(() => urls.code, { onDelete: 'cascade' }),
    hour: timestamp('hour', { withTimezone: true }).notNull(),
    visits: integer('visits').default(0).notNull(),
    uniqueVisits: integer('unique_visits').default(0).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.code, table.hour] }),
  }),
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id'),
    metadata: jsonb('metadata'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('audit_log_user_id_idx').on(table.userId),
    actionIdx: index('audit_log_action_idx').on(table.action),
    createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
  }),
)

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  maxLinks: integer('max_links').default(100).notNull(),
  maxCustomDomains: integer('max_custom_domains').default(0).notNull(),
  apiRateLimit: integer('api_rate_limit').default(100).notNull(),
  features: jsonb('features').default([]).notNull(),
  priceMonthly: integer('price_monthly').default(0).notNull(),
  priceYearly: integer('price_yearly').default(0).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: integer('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeCustomerId: text('stripe_customer_id'),
    status: text('status').notNull().default('incomplete'),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    trialEnd: timestamp('trial_end'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
    stripeSubIdIdx: uniqueIndex('subscriptions_stripe_sub_id_idx').on(table.stripeSubscriptionId),
    stripeCustIdIdx: index('subscriptions_stripe_cust_id_idx').on(table.stripeCustomerId),
  }),
)

export const usageQuota = pgTable(
  'usage_quota',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    yearMonth: varchar('year_month', { length: 7 }).notNull(),
    requestsCount: integer('requests_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userMonthIdx: uniqueIndex('usage_quota_user_month_idx').on(table.userId, table.yearMonth),
  }),
)

export const customDomains = pgTable(
  'custom_domains',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    verificationToken: text('verification_token').notNull(),
    verifiedAt: timestamp('verified_at'),
    sslStatus: text('ssl_status').default('pending').notNull(),
    sslExpiresAt: timestamp('ssl_expires_at'),
    active: boolean('active').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userDomainIdx: uniqueIndex('custom_domains_user_domain_idx').on(table.userId, table.domain),
    domainIdx: uniqueIndex('custom_domains_domain_idx').on(table.domain),
  }),
)
