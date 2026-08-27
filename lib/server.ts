import { env } from 'cloudflare:workers';
import { evaluateReadiness } from './workflow';
import { stableJson, sha256Hex } from './response-file';
import { derivePassport, type ObservationRecord, type ResolutionRecord } from './evidence-passport';
import { ZodError } from 'zod';
import { assertMutationSecurity, decryptPrivateJson, problem } from './reliability';

const DAY = 24 * 60 * 60 * 1000;
const COOKIE = 'f30_session';
const CURRENT_SCHEMA_VERSION = 5;

// The original demo schema is retained for additive migration compatibility.
// FIRST30's current routes never create financial hold or restoration records.
const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS demo_sessions (id TEXT PRIMARY KEY, persona_id TEXT NOT NULL DEFAULT 'sunita', locale TEXT NOT NULL DEFAULT 'en', ai_calls INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en', status TEXT NOT NULL DEFAULT 'draft', step INTEGER NOT NULL DEFAULT 1, fraud_type TEXT NOT NULL DEFAULT 'fake_kyc', channel TEXT NOT NULL DEFAULT 'upi', amount INTEGER NOT NULL DEFAULT 0, occurred_at TEXT, reference TEXT, bank TEXT, recipient TEXT, narrative_input TEXT, complaint_en TEXT, complaint_hi TEXT, acknowledgement TEXT, held_amount INTEGER NOT NULL DEFAULT 0, restored_amount INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, submitted_at INTEGER, revision INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, amount INTEGER NOT NULL, reference TEXT NOT NULL, bank TEXT, recipient TEXT, occurred_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS suspects (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, type TEXT NOT NULL, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, kind TEXT NOT NULL, object_key TEXT, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL DEFAULT 0, is_sample INTEGER NOT NULL DEFAULT 0, extracted_json TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS case_events (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, type TEXT NOT NULL, title_en TEXT NOT NULL, title_hi TEXT NOT NULL, detail_en TEXT NOT NULL, detail_hi TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS information_requests (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', prompt_en TEXT NOT NULL, prompt_hi TEXT NOT NULL, evidence_id TEXT, created_at INTEGER NOT NULL, completed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS restorations (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'available', confirmed_at INTEGER, completed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS evidence_integrity (evidence_id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, ocr_text TEXT, extraction_json TEXT, confirmed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS evidence_analysis (evidence_id TEXT PRIMARY KEY, client_sha256 TEXT NOT NULL, ocr_method TEXT NOT NULL, analysis_status TEXT NOT NULL DEFAULT 'pending', analysed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS evidence_observations (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, evidence_id TEXT NOT NULL, field TEXT NOT NULL, value TEXT NOT NULL, normalized_value TEXT NOT NULL, source_text TEXT NOT NULL, confidence INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS fact_resolutions (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, field TEXT NOT NULL, value TEXT NOT NULL, normalized_value TEXT NOT NULL, resolution_type TEXT NOT NULL, source_evidence_id TEXT, confirmed_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS passport_findings (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, rule_code TEXT NOT NULL, status TEXT NOT NULL, title_en TEXT NOT NULL, title_hi TEXT NOT NULL, detail_en TEXT NOT NULL, detail_hi TEXT NOT NULL, evidence_ids_json TEXT NOT NULL DEFAULT '[]', acknowledgement_note TEXT, acknowledged_at INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS custody_events (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, evidence_id TEXT, action TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS incident_events (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, occurred_at TEXT NOT NULL, event_type TEXT NOT NULL, description_en TEXT NOT NULL, description_hi TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'citizen', position INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS milestones (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, kind TEXT NOT NULL, reference TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', occurred_at TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS case_exports (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, version INTEGER NOT NULL, verification_code TEXT NOT NULL, content_fingerprint TEXT NOT NULL, manifest_hash TEXT NOT NULL, signature TEXT NOT NULL, manifest_json TEXT NOT NULL, file_count INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS case_intake (case_id TEXT PRIMARY KEY, loss_timing TEXT NOT NULL DEFAULT 'under_30_minutes', helpline_contacted INTEGER NOT NULL DEFAULT 0, bank_contacted INTEGER NOT NULL DEFAULT 0, delay_reason TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS complainant_profiles (case_id TEXT PRIMARY KEY, full_name TEXT NOT NULL, mobile TEXT NOT NULL, gender TEXT NOT NULL, date_of_birth TEXT NOT NULL, relation_name TEXT NOT NULL, address TEXT NOT NULL, state TEXT NOT NULL, district TEXT NOT NULL, police_station TEXT NOT NULL, pincode TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS complaint_submissions (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, acknowledgement TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'action_required', payload_json TEXT NOT NULL, submitted_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS information_request_responses (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, case_id TEXT NOT NULL, evidence_id TEXT NOT NULL, note TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS idempotency_records (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, scope TEXT NOT NULL, idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', response_json TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS workflow_runs (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', current_step TEXT NOT NULL DEFAULT 'snapshot', request_id TEXT NOT NULL, attempt_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, completed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS workflow_steps (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, step_code TEXT NOT NULL, status TEXT NOT NULL, attempt_count INTEGER NOT NULL DEFAULT 0, last_error_code TEXT, started_at INTEGER, completed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS outbox_jobs (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, run_id TEXT NOT NULL, kind TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempt_count INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL, lease_until INTEGER, last_error_code TEXT, created_at INTEGER NOT NULL, completed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, sequence INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, request_id TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', previous_hash TEXT NOT NULL, event_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS evidence_storage (evidence_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending', attempt_count INTEGER NOT NULL DEFAULT 0, last_error_code TEXT, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS secure_profiles (case_id TEXT PRIMARY KEY, ciphertext TEXT NOT NULL, iv TEXT NOT NULL, key_version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS secure_submission_payloads (submission_id TEXT PRIMARY KEY, ciphertext TEXT NOT NULL, iv TEXT NOT NULL, key_version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limit_buckets (bucket_key TEXT NOT NULL, scope TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_session_updated ON cases(session_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_case_created ON case_events(case_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_requests_case ON information_requests(case_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_case ON transactions(case_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_restorations_case ON restorations(case_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_integrity_sha ON evidence_integrity(sha256, evidence_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_observations_case_field ON evidence_observations(case_id, field)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_observations_evidence ON evidence_observations(evidence_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_fact_resolutions_case_field ON fact_resolutions(case_id, field)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_passport_findings_case_rule ON passport_findings(case_id, rule_code)`,
  `CREATE INDEX IF NOT EXISTS idx_custody_events_case_created ON custody_events(case_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_incident_events_case_position ON incident_events(case_id, position)`,
  `CREATE INDEX IF NOT EXISTS idx_milestones_case_created ON milestones(case_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_case_exports_verification_code ON case_exports(verification_code)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_case_exports_case_fingerprint ON case_exports(case_id, content_fingerprint)`,
  `CREATE INDEX IF NOT EXISTS idx_case_exports_case_version ON case_exports(case_id, version)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_complaint_submissions_case ON complaint_submissions(case_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_complaint_submissions_ack ON complaint_submissions(acknowledgement)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_request_responses_request ON information_request_responses(request_id)`,
  `CREATE INDEX IF NOT EXISTS idx_request_responses_case ON information_request_responses(case_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_session_scope_key ON idempotency_records(session_id, scope, idempotency_key)`,
  `CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_records(expires_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_runs_case ON workflow_runs(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status, updated_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_steps_run_code ON workflow_steps(run_id, step_code)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_run_kind ON outbox_jobs(run_id, kind)`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_status_available ON outbox_jobs(status, available_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_case_sequence ON audit_events(case_id, sequence)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_case_created ON audit_events(case_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_bucket_scope ON rate_limit_buckets(bucket_key, scope)`,
  `CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_buckets(expires_at)`,
];

let schemaReady: Promise<void> | null = null;

export async function ensureSchema() {
  schemaReady ??= (async () => {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)').run();
    const applied = await env.DB.prepare('SELECT version FROM schema_migrations WHERE version = ?').bind(CURRENT_SCHEMA_VERSION).first();
    if (applied) return;
    await env.DB.batch(schemaStatements.map((sql) => env.DB.prepare(sql)));
    const caseColumns = await env.DB.prepare('PRAGMA table_info(cases)').all<{ name: string }>();
    if (!(caseColumns.results || []).some((column) => column.name === 'revision')) await env.DB.prepare('ALTER TABLE cases ADD COLUMN revision INTEGER NOT NULL DEFAULT 1').run();
    const exportColumns = await env.DB.prepare('PRAGMA table_info(case_exports)').all<{ name: string }>();
    if (!(exportColumns.results || []).some((column) => column.name === 'manifest_json')) {
      await env.DB.prepare("ALTER TABLE case_exports ADD COLUMN manifest_json TEXT NOT NULL DEFAULT '{}'").run();
      await env.DB.prepare("UPDATE case_exports SET content_fingerprint = 'legacy:' || id || ':' || content_fingerprint WHERE manifest_json = '{}'").run();
    }
    await env.DB.prepare('PRAGMA optimize').run();
    await env.DB.prepare('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)').bind(CURRENT_SCHEMA_VERSION, Date.now()).run();
  })();
  try { await schemaReady; } catch (error) { schemaReady = null; throw error; }
}

function secret() {
  const value = env.SESSION_SECRET || process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production.');
  return value || 'first30-local-development-secret-change-me';
}

async function hmacKey() {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function hmac(value: string) {
  const bytes = await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(value));
  return Buffer.from(bytes).toString('base64url');
}

async function verifyHmac(value: string, signature: string) {
  try { return crypto.subtle.verify('HMAC', await hmacKey(), Buffer.from(signature, 'base64url'), new TextEncoder().encode(value)); }
  catch { return false; }
}

export async function signBundle(manifestHash: string) {
  return hmac(`first30:response-file:v1:${manifestHash}`);
}

export async function verifyBundleSignature(manifestHash: string, signature: string) {
  return verifyHmac(`first30:response-file:v1:${manifestHash}`, signature);
}

export async function sessionCookie(sessionId: string, secure = false) {
  return `${COOKIE}=${sessionId}.${await hmac(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure ? '; Secure' : ''}`;
}

export async function getSessionId(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [id, signature] = raw.split('.');
  if (!id || !signature || !await verifyHmac(id, signature)) return null;
  const row = await env.DB.prepare('SELECT id FROM demo_sessions WHERE id = ? AND expires_at > ?').bind(id, Date.now()).first();
  return row ? id : null;
}

export async function requireSession(request: Request) {
  const id = await getSessionId(request);
  if (!id) throw problem('SESSION_REQUIRED', 'Your private demo session has ended. Start again to continue.', 401, false);
  await assertMutationSecurity(request, id);
  return id;
}

export async function createSession(locale = 'en') {
  await ensureSchema(); await purgeExpired();
  const id = crypto.randomUUID(); const now = Date.now();
  await env.DB.prepare('INSERT INTO demo_sessions (id, persona_id, locale, ai_calls, created_at, expires_at) VALUES (?, ?, ?, 0, ?, ?)')
    .bind(id, 'sunita', locale === 'hi' ? 'hi' : 'en', now, now + DAY).run();
  return id;
}

const childTables = ['evidence_storage', 'evidence_analysis', 'evidence_observations', 'evidence_integrity', 'fact_resolutions', 'passport_findings', 'custody_events', 'incident_events', 'milestones', 'case_exports', 'information_request_responses', 'outbox_jobs', 'workflow_runs', 'audit_events', 'complaint_submissions', 'secure_profiles', 'complainant_profiles', 'case_intake', 'evidence', 'case_events', 'information_requests', 'restorations', 'transactions', 'suspects'];
const evidenceChildTables = new Set(['evidence_storage', 'evidence_integrity', 'evidence_analysis']);

export async function purgeExpired() {
  const now = Date.now();
  const expired = await env.DB.prepare('SELECT e.object_key FROM evidence e JOIN cases c ON c.id = e.case_id JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ? AND e.object_key IS NOT NULL').bind(now).all<{ object_key: string }>();
  await Promise.all((expired.results || []).map((row) => env.FILES.delete(row.object_key)));
  await env.DB.prepare('DELETE FROM workflow_steps WHERE run_id IN (SELECT w.id FROM workflow_runs w JOIN cases c ON c.id = w.case_id JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(now).run();
  await env.DB.prepare('DELETE FROM secure_submission_payloads WHERE submission_id IN (SELECT cs.id FROM complaint_submissions cs JOIN cases c ON c.id = cs.case_id JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(now).run();
  for (const table of childTables) await env.DB.prepare(`DELETE FROM ${table} WHERE ${evidenceChildTables.has(table) ? 'evidence_id IN (SELECT e.id FROM evidence e JOIN cases c ON c.id = e.case_id JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)' : 'case_id IN (SELECT c.id FROM cases c JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)'}`).bind(now).run();
  await env.DB.prepare('DELETE FROM cases WHERE session_id IN (SELECT id FROM demo_sessions WHERE expires_at <= ?)').bind(now).run();
  await env.DB.prepare('DELETE FROM idempotency_records WHERE expires_at <= ?').bind(now).run();
  await env.DB.prepare('DELETE FROM rate_limit_buckets WHERE expires_at <= ?').bind(now).run();
  await env.DB.prepare('DELETE FROM demo_sessions WHERE expires_at <= ?').bind(now).run();
}

export async function deleteSession(sessionId: string) {
  const objects = await env.DB.prepare('SELECT e.object_key FROM evidence e JOIN cases c ON c.id = e.case_id WHERE c.session_id = ? AND e.object_key IS NOT NULL').bind(sessionId).all<{ object_key: string }>();
  await Promise.all((objects.results || []).map((row) => env.FILES.delete(row.object_key)));
  const caseIds = 'SELECT id FROM cases WHERE session_id = ?';
  const statements = childTables.map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE ${evidenceChildTables.has(table) ? `evidence_id IN (SELECT id FROM evidence WHERE case_id IN (${caseIds}))` : `case_id IN (${caseIds})`}`).bind(sessionId));
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM workflow_steps WHERE run_id IN (SELECT id FROM workflow_runs WHERE case_id IN (${caseIds}))`).bind(sessionId),
    env.DB.prepare(`DELETE FROM secure_submission_payloads WHERE submission_id IN (SELECT id FROM complaint_submissions WHERE case_id IN (${caseIds}))`).bind(sessionId),
    ...statements,
    env.DB.prepare('DELETE FROM idempotency_records WHERE session_id = ?').bind(sessionId),
    env.DB.prepare('DELETE FROM cases WHERE session_id = ?').bind(sessionId), env.DB.prepare('DELETE FROM demo_sessions WHERE id = ?').bind(sessionId),
  ]);
}

export async function ownedCase(sessionId: string, caseId: string) {
  const row = await env.DB.prepare('SELECT * FROM cases WHERE id = ? AND session_id = ?').bind(caseId, sessionId).first<Record<string, unknown>>();
  if (!row) throw problem('CASE_NOT_FOUND', 'This report was not found in your private session.', 404, false);
  return row;
}

export async function ownedEvidence(sessionId: string, caseId: string, evidenceId: string) {
  await ownedCase(sessionId, caseId);
  const row = await env.DB.prepare('SELECT e.*, i.sha256, i.ocr_text, i.extraction_json, i.confirmed_at, a.client_sha256, a.ocr_method, a.analysis_status, a.analysed_at FROM evidence e LEFT JOIN evidence_integrity i ON i.evidence_id = e.id LEFT JOIN evidence_analysis a ON a.evidence_id = e.id WHERE e.id = ? AND e.case_id = ?').bind(evidenceId, caseId).first<Record<string, unknown>>();
  if (!row) throw problem('EVIDENCE_NOT_FOUND', 'This evidence file was not found in your private report.', 404, false);
  return row;
}

async function passportData(caseId: string) {
  const [evidenceRows, observationRows, resolutionRows] = await Promise.all([
    env.DB.prepare('SELECT id, kind, filename FROM evidence WHERE case_id = ? ORDER BY created_at, id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT o.*, e.kind AS evidence_kind, e.filename FROM evidence_observations o JOIN evidence e ON e.id = o.evidence_id WHERE o.case_id = ? ORDER BY o.created_at, o.id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM fact_resolutions WHERE case_id = ? ORDER BY field').bind(caseId).all<Record<string, unknown>>(),
  ]);
  const evidence = (evidenceRows.results || []).map((item) => ({ id: String(item.id), kind: String(item.kind), filename: String(item.filename) }));
  const observations: ObservationRecord[] = (observationRows.results || []).map((item) => ({
    id: String(item.id), evidenceId: String(item.evidence_id), evidenceKind: String(item.evidence_kind), filename: String(item.filename),
    field: String(item.field) as ObservationRecord['field'], value: String(item.value), normalizedValue: String(item.normalized_value), sourceText: String(item.source_text), confidence: Number(item.confidence) / 1000,
  }));
  const resolutions: ResolutionRecord[] = (resolutionRows.results || []).map((item) => ({
    field: String(item.field) as ResolutionRecord['field'], value: String(item.value), normalizedValue: String(item.normalized_value),
    resolutionType: String(item.resolution_type) as ResolutionRecord['resolutionType'], sourceEvidenceId: item.source_evidence_id ? String(item.source_evidence_id) : null,
  }));
  return { evidence, observations, resolutions, passport: derivePassport(evidence, observations, resolutions) };
}

export async function syncPassportFindings(caseId: string) {
  const { passport } = await passportData(caseId); const now = Date.now();
  const current = await env.DB.prepare('SELECT rule_code, acknowledgement_note, acknowledged_at FROM passport_findings WHERE case_id = ?').bind(caseId).all<Record<string, unknown>>();
  const acknowledgements = new Map((current.results || []).map((item) => [String(item.rule_code), { note: item.acknowledgement_note, at: item.acknowledged_at }]));
  const inserts = passport.checks.map((item) => {
    const acknowledgement = acknowledgements.get(item.code);
    return env.DB.prepare('INSERT INTO passport_findings (id, case_id, rule_code, status, title_en, title_hi, detail_en, detail_hi, evidence_ids_json, acknowledgement_note, acknowledged_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), caseId, item.code, item.status, item.titleEn, item.titleHi, item.detailEn, item.detailHi, JSON.stringify(item.evidenceIds), acknowledgement?.note || null, acknowledgement?.at || null, now);
  });
  await env.DB.batch([env.DB.prepare('DELETE FROM passport_findings WHERE case_id = ?').bind(caseId), ...inserts]);
  return passport;
}

export async function recordCustody(caseId: string, evidenceId: string | null, action: string, detail: string) {
  await env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), caseId, evidenceId, action, detail.slice(0, 500), Date.now()).run();
}

export async function caseBundle(sessionId: string, caseId: string) {
  const caseRow = await ownedCase(sessionId, caseId);
  const [evidenceRows, chronology, milestones, exports, passportDataResult, findings, custody, intake, legacyProfile, submission, requests, requestResponses, events, secureProfile] = await Promise.all([
    env.DB.prepare('SELECT e.*, i.sha256, i.ocr_text, i.extraction_json, i.confirmed_at, a.client_sha256, a.ocr_method, a.analysis_status, a.analysed_at FROM evidence e LEFT JOIN evidence_integrity i ON i.evidence_id = e.id LEFT JOIN evidence_analysis a ON a.evidence_id = e.id WHERE e.case_id = ? ORDER BY e.created_at, e.id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM incident_events WHERE case_id = ? ORDER BY position, occurred_at, id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM milestones WHERE case_id = ? ORDER BY occurred_at DESC, created_at DESC, id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT id, version, verification_code, content_fingerprint, manifest_hash, signature, file_count, created_at FROM case_exports WHERE case_id = ? ORDER BY version DESC').bind(caseId).all<Record<string, unknown>>(),
    passportData(caseId),
    env.DB.prepare('SELECT * FROM passport_findings WHERE case_id = ? ORDER BY status, rule_code').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM custody_events WHERE case_id = ? ORDER BY created_at, id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM case_intake WHERE case_id = ?').bind(caseId).first<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM complainant_profiles WHERE case_id = ?').bind(caseId).first<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM complaint_submissions WHERE case_id = ?').bind(caseId).first<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM information_requests WHERE case_id = ? ORDER BY created_at, id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM information_request_responses WHERE case_id = ? ORDER BY created_at, id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT * FROM case_events WHERE case_id = ? ORDER BY created_at, id').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT ciphertext, iv FROM secure_profiles WHERE case_id = ?').bind(caseId).first<{ ciphertext: string; iv: string }>(),
  ]);
  const profile = secureProfile ? await decryptPrivateJson<Record<string, unknown>>(secureProfile.ciphertext, secureProfile.iv) : legacyProfile;
  const contradictions = passportDataResult.passport.checks.filter((item) => item.status === 'conflict').map((item) => item.detailEn);
  const readiness = evaluateReadiness({
    amount: Number(caseRow.amount || 0), occurredAt: String(caseRow.occurred_at || ''), reference: String(caseRow.reference || ''), bank: String(caseRow.bank || ''), recipient: String(caseRow.recipient || ''), narrative: String(caseRow.narrative_input || ''), evidence: evidenceRows.results || [], contradictions,
  });
  return { case: caseRow, evidence: evidenceRows.results, chronology: chronology.results, milestones: milestones.results, exports: exports.results, readiness, observations: passportDataResult.observations, resolutions: passportDataResult.resolutions, passport: passportDataResult.passport, findings: findings.results, custody: custody.results, intake, profile, submission, requests: requests.results, requestResponses: requestResponses.results, events: events.results, meta: { caseRevision: Number(caseRow.revision || 1), savedAt: Number(caseRow.updated_at || Date.now()) } };
}

export async function caseFingerprint(sessionId: string, caseId: string) {
  const bundle = await caseBundle(sessionId, caseId);
  const record = {
    documentTemplateVersion: 3,
    case: {
      id: bundle.case.id, fraudType: bundle.case.fraud_type, channel: bundle.case.channel, amount: bundle.case.amount, occurredAt: bundle.case.occurred_at,
      reference: bundle.case.reference, bank: bundle.case.bank, recipient: bundle.case.recipient, narrative: bundle.case.narrative_input,
      complaintEn: bundle.case.complaint_en, complaintHi: bundle.case.complaint_hi,
    },
    evidence: bundle.evidence.map((item) => ({ id: item.id, filename: item.filename, mimeType: item.mime_type, size: item.size, sha256: item.sha256, confirmedAt: item.confirmed_at })),
    chronology: bundle.chronology.map((item) => ({ occurredAt: item.occurred_at, eventType: item.event_type, descriptionEn: item.description_en, descriptionHi: item.description_hi, source: item.source, position: item.position })),
    observations: bundle.observations,
    resolutions: bundle.resolutions,
    findings: bundle.findings.map((item) => ({ ruleCode: item.rule_code, status: item.status, detailEn: item.detail_en, acknowledgementNote: item.acknowledgement_note, acknowledgedAt: item.acknowledged_at })),
  };
  return sha256Hex(stableJson(record));
}

export async function addEvent(caseId: string, type: string, titleEn: string, titleHi: string, detailEn: string, detailHi: string, createdAt = Date.now()) {
  await env.DB.prepare('INSERT INTO case_events (id, case_id, type, title_en, title_hi, detail_en, detail_hi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), caseId, type, titleEn, titleHi, detailEn, detailHi, createdAt).run();
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('cache-control', 'no-store'); headers.set('x-content-type-options', 'nosniff'); headers.set('referrer-policy', 'no-referrer');
  return Response.json(data, { ...init, headers });
}

export function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  if (error instanceof ZodError) return json({ error: 'Check the highlighted information and try again.', code: 'VALIDATION_FAILED', requestId: crypto.randomUUID(), retryable: false, fieldErrors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'form', issue.message])) }, { status: 400 });
  console.error(error);
  return json({ error: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR', requestId: crypto.randomUUID(), retryable: true }, { status: 500 });
}
