import { env } from 'cloudflare:workers';

const DAY = 24 * 60 * 60 * 1000;
const COOKIE = 'f30_session';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS demo_sessions (id TEXT PRIMARY KEY, persona_id TEXT NOT NULL DEFAULT 'sunita', locale TEXT NOT NULL DEFAULT 'en', ai_calls INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en', status TEXT NOT NULL DEFAULT 'draft', step INTEGER NOT NULL DEFAULT 1, fraud_type TEXT NOT NULL DEFAULT 'fake_kyc', channel TEXT NOT NULL DEFAULT 'upi', amount INTEGER NOT NULL DEFAULT 18499, occurred_at TEXT, reference TEXT, bank TEXT, recipient TEXT, narrative_input TEXT, complaint_en TEXT, complaint_hi TEXT, acknowledgement TEXT, held_amount INTEGER NOT NULL DEFAULT 0, restored_amount INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, submitted_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, amount INTEGER NOT NULL, reference TEXT NOT NULL, bank TEXT, recipient TEXT, occurred_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS suspects (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, type TEXT NOT NULL, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, kind TEXT NOT NULL, object_key TEXT, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL DEFAULT 0, is_sample INTEGER NOT NULL DEFAULT 0, extracted_json TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS case_events (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, type TEXT NOT NULL, title_en TEXT NOT NULL, title_hi TEXT NOT NULL, detail_en TEXT NOT NULL, detail_hi TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS information_requests (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', prompt_en TEXT NOT NULL, prompt_hi TEXT NOT NULL, evidence_id TEXT, created_at INTEGER NOT NULL, completed_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS restorations (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'available', confirmed_at INTEGER, completed_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_session_updated ON cases(session_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_case_created ON case_events(case_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_requests_case ON information_requests(case_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_case ON transactions(case_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_restorations_case ON restorations(case_id)`,
];

export async function ensureSchema() {
  await env.DB.batch(schemaStatements.map((sql) => env.DB.prepare(sql)));
}

function secret() {
  return env.SESSION_SECRET || process.env.SESSION_SECRET || 'first30-local-development-secret-change-me';
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Buffer.from(bytes).toString('base64url');
}

export async function sessionCookie(sessionId: string) {
  return `${COOKIE}=${sessionId}.${await sign(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export async function getSessionId(request: Request) {
  const cookie = request.headers.get('cookie') || '';
  const raw = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [id, signature] = raw.split('.');
  if (!id || !signature || signature !== await sign(id)) return null;
  const row = await env.DB.prepare('SELECT id FROM demo_sessions WHERE id = ? AND expires_at > ?').bind(id, Date.now()).first();
  return row ? id : null;
}

export async function requireSession(request: Request) {
  const id = await getSessionId(request);
  if (!id) throw new Response(JSON.stringify({ error: 'Session required' }), { status: 401, headers: { 'content-type': 'application/json' } });
  return id;
}

export async function createSession(locale = 'en') {
  await ensureSchema();
  await purgeExpired();
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO demo_sessions (id, persona_id, locale, ai_calls, created_at, expires_at) VALUES (?, ?, ?, 0, ?, ?)')
    .bind(id, 'sunita', locale === 'hi' ? 'hi' : 'en', now, now + DAY).run();
  return id;
}

export async function purgeExpired() {
  const expired = await env.DB.prepare('SELECT e.object_key FROM evidence e JOIN cases c ON c.id = e.case_id JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ? AND e.object_key IS NOT NULL LIMIT 20').bind(Date.now()).all<{ object_key: string }>();
  await Promise.all((expired.results || []).map((row) => env.FILES.delete(row.object_key)));
  await env.DB.prepare('DELETE FROM evidence WHERE case_id IN (SELECT c.id FROM cases c JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM case_events WHERE case_id IN (SELECT c.id FROM cases c JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM information_requests WHERE case_id IN (SELECT c.id FROM cases c JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM restorations WHERE case_id IN (SELECT c.id FROM cases c JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM transactions WHERE case_id IN (SELECT c.id FROM cases c JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM suspects WHERE case_id IN (SELECT c.id FROM cases c JOIN demo_sessions s ON s.id = c.session_id WHERE s.expires_at <= ?)').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM cases WHERE session_id IN (SELECT id FROM demo_sessions WHERE expires_at <= ?)').bind(Date.now()).run();
  await env.DB.prepare('DELETE FROM demo_sessions WHERE expires_at <= ?').bind(Date.now()).run();
}

export async function deleteSession(sessionId: string) {
  const objects = await env.DB.prepare('SELECT e.object_key FROM evidence e JOIN cases c ON c.id = e.case_id WHERE c.session_id = ? AND e.object_key IS NOT NULL').bind(sessionId).all<{ object_key: string }>();
  await Promise.all((objects.results || []).map((row) => env.FILES.delete(row.object_key)));
  const caseIds = 'SELECT id FROM cases WHERE session_id = ?';
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM evidence WHERE case_id IN (${caseIds})`).bind(sessionId),
    env.DB.prepare(`DELETE FROM case_events WHERE case_id IN (${caseIds})`).bind(sessionId),
    env.DB.prepare(`DELETE FROM information_requests WHERE case_id IN (${caseIds})`).bind(sessionId),
    env.DB.prepare(`DELETE FROM restorations WHERE case_id IN (${caseIds})`).bind(sessionId),
    env.DB.prepare(`DELETE FROM transactions WHERE case_id IN (${caseIds})`).bind(sessionId),
    env.DB.prepare(`DELETE FROM suspects WHERE case_id IN (${caseIds})`).bind(sessionId),
    env.DB.prepare('DELETE FROM cases WHERE session_id = ?').bind(sessionId),
    env.DB.prepare('DELETE FROM demo_sessions WHERE id = ?').bind(sessionId),
  ]);
}

export async function ownedCase(sessionId: string, caseId: string) {
  const row = await env.DB.prepare('SELECT * FROM cases WHERE id = ? AND session_id = ?').bind(caseId, sessionId).first<Record<string, unknown>>();
  if (!row) throw new Response(JSON.stringify({ error: 'Case not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  return row;
}

export async function caseBundle(sessionId: string, caseId: string) {
  const caseRow = await ownedCase(sessionId, caseId);
  const [evidenceRows, events, requests, restoration] = await Promise.all([
    env.DB.prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at').bind(caseId).all(),
    env.DB.prepare('SELECT * FROM case_events WHERE case_id = ? ORDER BY created_at').bind(caseId).all(),
    env.DB.prepare('SELECT * FROM information_requests WHERE case_id = ? ORDER BY created_at').bind(caseId).all(),
    env.DB.prepare('SELECT * FROM restorations WHERE case_id = ?').bind(caseId).first(),
  ]);
  return { case: caseRow, evidence: evidenceRows.results, events: events.results, requests: requests.results, restoration };
}

export async function addEvent(caseId: string, type: string, titleEn: string, titleHi: string, detailEn: string, detailHi: string, createdAt = Date.now()) {
  await env.DB.prepare('INSERT INTO case_events (id, case_id, type, title_en, title_hi, detail_en, detail_hi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), caseId, type, titleEn, titleHi, detailEn, detailHi, createdAt).run();
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
