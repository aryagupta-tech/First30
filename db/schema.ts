import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const demoSessions = sqliteTable('demo_sessions', {
  id: text('id').primaryKey(), personaId: text('persona_id').notNull().default('sunita'),
  locale: text('locale').notNull().default('en'), aiCalls: integer('ai_calls').notNull().default(0),
  createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(),
});

export const cases = sqliteTable('cases', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => demoSessions.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull().default('en'), status: text('status').notNull().default('draft'),
  step: integer('step').notNull().default(1), fraudType: text('fraud_type').notNull().default('fake_kyc'),
  channel: text('channel').notNull().default('upi'), amount: integer('amount').notNull().default(18499),
  occurredAt: text('occurred_at'), reference: text('reference'), bank: text('bank'), recipient: text('recipient'),
  narrativeInput: text('narrative_input'), complaintEn: text('complaint_en'), complaintHi: text('complaint_hi'),
  acknowledgement: text('acknowledgement'), heldAmount: integer('held_amount').notNull().default(0),
  restoredAmount: integer('restored_amount').notNull().default(0), createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(), submittedAt: integer('submitted_at'),
}, (table) => [index('idx_cases_session_updated').on(table.sessionId, table.updatedAt)]);

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), reference: text('reference').notNull(), bank: text('bank'),
  recipient: text('recipient'), occurredAt: text('occurred_at'),
}, (table) => [uniqueIndex('idx_transactions_case').on(table.caseId)]);

export const suspects = sqliteTable('suspects', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), value: text('value').notNull(),
}, (table) => [index('idx_suspects_case').on(table.caseId)]);

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), objectKey: text('object_key'), filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(), size: integer('size').notNull().default(0),
  isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false), extractedJson: text('extracted_json'),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_evidence_case').on(table.caseId)]);

export const caseEvents = sqliteTable('case_events', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), titleEn: text('title_en').notNull(), titleHi: text('title_hi').notNull(),
  detailEn: text('detail_en').notNull(), detailHi: text('detail_hi').notNull(), createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_events_case_created').on(table.caseId, table.createdAt)]);

export const informationRequests = sqliteTable('information_requests', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('open'), promptEn: text('prompt_en').notNull(),
  promptHi: text('prompt_hi').notNull(), evidenceId: text('evidence_id'), createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
}, (table) => [index('idx_requests_case').on(table.caseId)]);

export const restorations = sqliteTable('restorations', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), status: text('status').notNull().default('available'),
  confirmedAt: integer('confirmed_at'), completedAt: integer('completed_at'),
}, (table) => [uniqueIndex('idx_restorations_case').on(table.caseId)]);
