import { env } from 'cloudflare:workers';
import { sha256Hex, stableJson } from './response-file';

const encoder = new TextEncoder();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

export type RequestMeta = { requestId: string; caseRevision?: number; savedAt?: number };

function runtimeSecret() {
  const value = env.SESSION_SECRET || process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production.');
  return value || 'first30-local-development-secret-change-me';
}

async function hmacKey() {
  return crypto.subtle.importKey('raw', encoder.encode(runtimeSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function domainHmac(domain: string, value: string) {
  const bytes = await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(`${domain}:${value}`));
  return Buffer.from(bytes).toString('base64url');
}

export function requestId(request: Request) {
  const supplied = request.headers.get('x-request-id')?.trim();
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export async function csrfToken(sessionId: string) {
  return domainHmac('first30:csrf:v1', sessionId);
}

export async function assertMutationSecurity(request: Request, sessionId: string) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return;
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw problem('CROSS_ORIGIN_BLOCKED', 'This request did not come from FIRST30.', 403, false);
  const supplied = request.headers.get('x-f30-csrf') || '';
  if (!supplied || supplied !== await csrfToken(sessionId)) throw problem('CSRF_REQUIRED', 'Refresh FIRST30 and try again safely.', 403, true);
}

export function problem(code: string, message: string, status: number, retryable = false, fieldErrors?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message, code, requestId: crypto.randomUUID(), retryable, ...(fieldErrors ? { fieldErrors } : {}) }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

export function assertCaseRevision(request: Request, caseRow: Record<string, unknown>) {
  const raw = request.headers.get('if-match');
  if (!raw) throw problem('REVISION_REQUIRED', 'Refresh this report before saving.', 428, true);
  const expected = Number(raw.replace(/^W\//, '').replaceAll('"', '').replace(/^rev-/, ''));
  const actual = Number(caseRow.revision || 1);
  if (!Number.isInteger(expected) || expected !== actual) throw problem('CASE_CHANGED', 'This report was saved somewhere else. The newest version has been loaded.', 409, true);
  return actual;
}

export async function enforceRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const raw = `${request.headers.get('cf-connecting-ip') || 'local'}|${request.headers.get('user-agent') || 'unknown'}`;
  const bucketKey = await domainHmac('first30:rate-limit:v1', raw);
  const now = Date.now();
  const row = await env.DB.prepare(`
    INSERT INTO rate_limit_buckets (bucket_key, scope, window_start, count, expires_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(bucket_key, scope) DO UPDATE SET
      count = CASE WHEN ? - window_start >= ? THEN 1 ELSE count + 1 END,
      window_start = CASE WHEN ? - window_start >= ? THEN ? ELSE window_start END,
      expires_at = ?
    RETURNING count
  `).bind(bucketKey, scope, now, now + windowMs, now, windowMs, now, windowMs, now, now + windowMs).first<{ count: number }>();
  if (Number(row?.count || 0) > limit) throw problem('RATE_LIMITED', 'Please wait a moment before trying again.', 429, true);
}

export async function beginIdempotency(request: Request, sessionId: string, scope: string, input: unknown) {
  const key = request.headers.get('idempotency-key')?.trim();
  if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key)) throw problem('IDEMPOTENCY_REQUIRED', 'Refresh FIRST30 before safely retrying this action.', 428, true);
  const requestHash = await sha256Hex(stableJson(input));
  const existing = await env.DB.prepare('SELECT request_hash, status, response_json FROM idempotency_records WHERE session_id = ? AND scope = ? AND idempotency_key = ?').bind(sessionId, scope, key).first<{ request_hash: string; status: string; response_json: string | null }>();
  if (existing) {
    if (existing.request_hash !== requestHash) throw problem('IDEMPOTENCY_CONFLICT', 'This retry key was already used for a different action.', 409, false);
    return { key, requestHash, replay: existing.status === 'complete', existing: true, response: existing.response_json ? JSON.parse(existing.response_json) as Record<string, unknown> : null };
  }
  const now = Date.now();
  await env.DB.prepare('INSERT INTO idempotency_records (id, session_id, scope, idempotency_key, request_hash, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), sessionId, scope, key, requestHash, 'pending', now, now + IDEMPOTENCY_TTL).run();
  return { key, requestHash, replay: false, existing: false, response: null };
}

export async function finishIdempotency(sessionId: string, scope: string, key: string, response: Record<string, unknown> = { completed: true }) {
  await env.DB.prepare("UPDATE idempotency_records SET status = 'complete', response_json = ? WHERE session_id = ? AND scope = ? AND idempotency_key = ?").bind(JSON.stringify(response), sessionId, scope, key).run();
}

async function encryptionKey() {
  const material = await crypto.subtle.importKey('raw', encoder.encode(runtimeSecret()), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('first30:data:v1'), info: encoder.encode('citizen-records') }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptPrivateJson(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode('FIRST30/private-json/v1') }, await encryptionKey(), encoder.encode(stableJson(value)));
  return { ciphertext: Buffer.from(encrypted).toString('base64url'), iv: Buffer.from(iv).toString('base64url'), keyVersion: 1 };
}

export async function decryptPrivateJson<T>(ciphertext: string, iv: string): Promise<T> {
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64url'), additionalData: encoder.encode('FIRST30/private-json/v1') }, await encryptionKey(), Buffer.from(ciphertext, 'base64url'));
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export async function appendAudit(caseId: string, actor: 'citizen' | 'first30' | 'mock_ncrp', action: string, requestIdValue: string, metadata: Record<string, unknown> = {}) {
  const previous = await env.DB.prepare('SELECT sequence, event_hash FROM audit_events WHERE case_id = ? ORDER BY sequence DESC LIMIT 1').bind(caseId).first<{ sequence: number; event_hash: string }>();
  const sequence = Number(previous?.sequence || 0) + 1;
  const previousHash = previous?.event_hash || 'GENESIS';
  const createdAt = Date.now();
  const canonical = stableJson({ caseId, sequence, actor, action, requestId: requestIdValue, metadata, previousHash, createdAt });
  const eventHash = await domainHmac('first30:audit:v1', canonical);
  await env.DB.prepare('INSERT INTO audit_events (id, case_id, sequence, actor, action, request_id, metadata_json, previous_hash, event_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), caseId, sequence, actor, action, requestIdValue, stableJson(metadata), previousHash, eventHash, createdAt).run();
  return { sequence, eventHash, createdAt };
}

export async function auditStatus(caseId: string) {
  const rows = await env.DB.prepare('SELECT sequence, actor, action, request_id, metadata_json, previous_hash, event_hash, created_at FROM audit_events WHERE case_id = ? ORDER BY sequence').bind(caseId).all<Record<string, unknown>>();
  let previousHash = 'GENESIS';
  for (const row of rows.results || []) {
    if (String(row.previous_hash) !== previousHash) return { valid: false, events: rows.results?.length || 0 };
    const canonical = stableJson({ caseId, sequence: Number(row.sequence), actor: row.actor, action: row.action, requestId: row.request_id, metadata: JSON.parse(String(row.metadata_json || '{}')), previousHash, createdAt: Number(row.created_at) });
    const expected = await domainHmac('first30:audit:v1', canonical);
    if (expected !== row.event_hash) return { valid: false, events: rows.results?.length || 0 };
    previousHash = String(row.event_hash);
  }
  return { valid: true, events: rows.results?.length || 0 };
}

export function safeOperationalLog(request: Request, result: { status: number; code: string; startedAt: number }) {
  console.info(JSON.stringify({ service: 'first30', requestId: requestId(request), method: request.method, route: new URL(request.url).pathname.replace(/[0-9a-f-]{24,}/gi, ':id'), status: result.status, code: result.code, durationMs: Date.now() - result.startedAt }));
}
