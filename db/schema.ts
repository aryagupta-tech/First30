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
  revision: integer('revision').notNull().default(1),
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

export const caseIntake = sqliteTable('case_intake', {
  caseId: text('case_id').primaryKey().references(() => cases.id, { onDelete: 'cascade' }),
  lossTiming: text('loss_timing').notNull().default('under_30_minutes'),
  helplineContacted: integer('helpline_contacted', { mode: 'boolean' }).notNull().default(false),
  bankContacted: integer('bank_contacted', { mode: 'boolean' }).notNull().default(false),
  delayReason: text('delay_reason').notNull().default(''),
  updatedAt: integer('updated_at').notNull(),
});

export const complainantProfiles = sqliteTable('complainant_profiles', {
  caseId: text('case_id').primaryKey().references(() => cases.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(), mobile: text('mobile').notNull(), gender: text('gender').notNull(),
  dateOfBirth: text('date_of_birth').notNull(), relationName: text('relation_name').notNull(), address: text('address').notNull(),
  state: text('state').notNull(), district: text('district').notNull(), policeStation: text('police_station').notNull(),
  pincode: text('pincode').notNull(), updatedAt: integer('updated_at').notNull(),
});

export const complaintSubmissions = sqliteTable('complaint_submissions', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  acknowledgement: text('acknowledgement').notNull(), status: text('status').notNull().default('action_required'),
  payloadJson: text('payload_json').notNull(), submittedAt: integer('submitted_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_complaint_submissions_case').on(table.caseId), uniqueIndex('idx_complaint_submissions_ack').on(table.acknowledgement)]);

export const informationRequestResponses = sqliteTable('information_request_responses', {
  id: text('id').primaryKey(), requestId: text('request_id').notNull().references(() => informationRequests.id, { onDelete: 'cascade' }),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  evidenceId: text('evidence_id').notNull().references(() => evidence.id, { onDelete: 'cascade' }),
  note: text('note').notNull(), createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_request_responses_request').on(table.requestId), index('idx_request_responses_case').on(table.caseId)]);

export const schemaMigrations = sqliteTable('schema_migrations', {
  version: integer('version').primaryKey(), appliedAt: integer('applied_at').notNull(),
});

export const idempotencyRecords = sqliteTable('idempotency_records', {
  id: text('id').primaryKey(), sessionId: text('session_id').notNull(), scope: text('scope').notNull(),
  idempotencyKey: text('idempotency_key').notNull(), requestHash: text('request_hash').notNull(),
  status: text('status').notNull().default('pending'), responseJson: text('response_json'),
  createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(),
}, (table) => [uniqueIndex('idx_idempotency_session_scope_key').on(table.sessionId, table.scope, table.idempotencyKey), index('idx_idempotency_expiry').on(table.expiresAt)]);

export const workflowRuns = sqliteTable('workflow_runs', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), currentStep: text('current_step').notNull().default('snapshot'),
  requestId: text('request_id').notNull(), attemptCount: integer('attempt_count').notNull().default(0),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), completedAt: integer('completed_at'),
}, (table) => [uniqueIndex('idx_workflow_runs_case').on(table.caseId), index('idx_workflow_runs_status').on(table.status, table.updatedAt)]);

export const workflowSteps = sqliteTable('workflow_steps', {
  id: text('id').primaryKey(), runId: text('run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  stepCode: text('step_code').notNull(), status: text('status').notNull(), attemptCount: integer('attempt_count').notNull().default(0),
  lastErrorCode: text('last_error_code'), startedAt: integer('started_at'), completedAt: integer('completed_at'),
}, (table) => [uniqueIndex('idx_workflow_steps_run_code').on(table.runId, table.stepCode)]);

export const outboxJobs = sqliteTable('outbox_jobs', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  runId: text('run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }), kind: text('kind').notNull(),
  payloadJson: text('payload_json').notNull(), status: text('status').notNull().default('pending'),
  attemptCount: integer('attempt_count').notNull().default(0), availableAt: integer('available_at').notNull(),
  leaseUntil: integer('lease_until'), lastErrorCode: text('last_error_code'), createdAt: integer('created_at').notNull(), completedAt: integer('completed_at'),
}, (table) => [uniqueIndex('idx_outbox_run_kind').on(table.runId, table.kind), index('idx_outbox_status_available').on(table.status, table.availableAt)]);

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(), actor: text('actor').notNull(), action: text('action').notNull(),
  requestId: text('request_id').notNull(), metadataJson: text('metadata_json').notNull().default('{}'),
  previousHash: text('previous_hash').notNull(), eventHash: text('event_hash').notNull(), createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_audit_case_sequence').on(table.caseId, table.sequence), index('idx_audit_case_created').on(table.caseId, table.createdAt)]);

export const evidenceStorage = sqliteTable('evidence_storage', {
  evidenceId: text('evidence_id').primaryKey().references(() => evidence.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), attemptCount: integer('attempt_count').notNull().default(0),
  lastErrorCode: text('last_error_code'), updatedAt: integer('updated_at').notNull(),
});

export const secureProfiles = sqliteTable('secure_profiles', {
  caseId: text('case_id').primaryKey().references(() => cases.id, { onDelete: 'cascade' }),
  ciphertext: text('ciphertext').notNull(), iv: text('iv').notNull(), keyVersion: integer('key_version').notNull().default(1), updatedAt: integer('updated_at').notNull(),
});

export const secureSubmissionPayloads = sqliteTable('secure_submission_payloads', {
  submissionId: text('submission_id').primaryKey().references(() => complaintSubmissions.id, { onDelete: 'cascade' }),
  ciphertext: text('ciphertext').notNull(), iv: text('iv').notNull(), keyVersion: integer('key_version').notNull().default(1), createdAt: integer('created_at').notNull(),
});

export const rateLimitBuckets = sqliteTable('rate_limit_buckets', {
  bucketKey: text('bucket_key').notNull(), scope: text('scope').notNull(), windowStart: integer('window_start').notNull(),
  count: integer('count').notNull().default(0), expiresAt: integer('expires_at').notNull(),
}, (table) => [uniqueIndex('idx_rate_limit_bucket_scope').on(table.bucketKey, table.scope), index('idx_rate_limit_expiry').on(table.expiresAt)]);
