// Drizzle schema for the Neon (Postgres) license store.
//
// This is the *backend* database — separate from the desktop app's local
// SQLite. It is queried only by the Vercel serverless functions that handle
// Square webhooks and activation (Phase 1 / Phase 2). Nothing here ships
// inside the Electron app.
//
// Neon is plain serverless Postgres, so Drizzle speaks to it natively with
// the same ORM the desktop app already uses — no Supabase required.

import { pgTable, text, integer, timestamp, uuid, index } from 'drizzle-orm/pg-core'

// One row per sold license. `key` is the human-enterable id from mint-key.mjs.
export const licenses = pgTable('licenses', {
  key: text('key').primaryKey(),
  email: text('email').notNull(),
  squareOrderId: text('square_order_id').unique(), // dedupe webhook retries
  status: text('status').notNull().default('active'), // active | refunded | revoked
  plan: text('plan').notNull().default('founding'),
  activationLimit: integer('activation_limit').notNull().default(2), // seats per key
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// One row per machine that activates a key — enforces the seat limit and gives
// support a view of where a key is in use.
export const activations = pgTable(
  'activations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenseKey: text('license_key')
      .notNull()
      .references(() => licenses.key, { onDelete: 'cascade' }),
    machineId: text('machine_id').notNull(), // stable per-install id from the app
    activatedAt: timestamp('activated_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('activations_license_idx').on(table.licenseKey)]
)
