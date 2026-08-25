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

export const evidenceIntegrity = sqliteTable('evidence_integrity', {
  evidenceId: text('evidence_id').primaryKey().references(() => evidence.id, { onDelete: 'cascade' }),
  sha256: text('sha256').notNull(),
  ocrText: text('ocr_text'),
  extractionJson: text('extraction_json'),
  confirmedAt: integer('confirmed_at'),
}, (table) => [uniqueIndex('idx_evidence_integrity_sha').on(table.sha256, table.evidenceId)]);

export const evidenceAnalysis = sqliteTable('evidence_analysis', {
  evidenceId: text('evidence_id').primaryKey().references(() => evidence.id, { onDelete: 'cascade' }),
  clientSha256: text('client_sha256').notNull(),
  ocrMethod: text('ocr_method').notNull(),
  analysisStatus: text('analysis_status').notNull().default('pending'),
  analysedAt: integer('analysed_at'),
});

export const evidenceObservations = sqliteTable('evidence_observations', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  evidenceId: text('evidence_id').notNull().references(() => evidence.id, { onDelete: 'cascade' }),
  field: text('field').notNull(), value: text('value').notNull(), normalizedValue: text('normalized_value').notNull(),
  sourceText: text('source_text').notNull(), confidence: integer('confidence').notNull(), createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_evidence_observations_case_field').on(table.caseId, table.field), index('idx_evidence_observations_evidence').on(table.evidenceId)]);

export const factResolutions = sqliteTable('fact_resolutions', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  field: text('field').notNull(), value: text('value').notNull(), normalizedValue: text('normalized_value').notNull(),
  resolutionType: text('resolution_type').notNull(), sourceEvidenceId: text('source_evidence_id'), confirmedAt: integer('confirmed_at').notNull(),
}, (table) => [uniqueIndex('idx_fact_resolutions_case_field').on(table.caseId, table.field)]);

export const passportFindings = sqliteTable('passport_findings', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  ruleCode: text('rule_code').notNull(), status: text('status').notNull(), titleEn: text('title_en').notNull(), titleHi: text('title_hi').notNull(),
  detailEn: text('detail_en').notNull(), detailHi: text('detail_hi').notNull(), evidenceIdsJson: text('evidence_ids_json').notNull().default('[]'),
  acknowledgementNote: text('acknowledgement_note'), acknowledgedAt: integer('acknowledged_at'), createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_passport_findings_case_rule').on(table.caseId, table.ruleCode)]);

export const custodyEvents = sqliteTable('custody_events', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  evidenceId: text('evidence_id'), action: text('action').notNull(), detail: text('detail').notNull(), createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_custody_events_case_created').on(table.caseId, table.createdAt)]);

export const incidentEvents = sqliteTable('incident_events', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  occurredAt: text('occurred_at').notNull(),
  eventType: text('event_type').notNull(),
  descriptionEn: text('description_en').notNull(),
  descriptionHi: text('description_hi').notNull().default(''),
  source: text('source').notNull().default('citizen'),
  position: integer('position').notNull().default(0),
}, (table) => [index('idx_incident_events_case_position').on(table.caseId, table.position)]);

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  reference: text('reference').notNull().default(''),
  notes: text('notes').notNull().default(''),
  occurredAt: text('occurred_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_milestones_case_created').on(table.caseId, table.createdAt)]);

export const caseExports = sqliteTable('case_exports', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  verificationCode: text('verification_code').notNull(),
  contentFingerprint: text('content_fingerprint').notNull(),
  manifestHash: text('manifest_hash').notNull(),
  signature: text('signature').notNull(),
  manifestJson: text('manifest_json').notNull(),
  fileCount: integer('file_count').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_case_exports_verification_code').on(table.verificationCode),
  uniqueIndex('idx_case_exports_case_fingerprint').on(table.caseId, table.contentFingerprint),
  index('idx_case_exports_case_version').on(table.caseId, table.version),
]);
