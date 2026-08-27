import { env } from 'cloudflare:workers';
import { ensureSchema, errorResponse, json, requireSession } from '@/lib/server';
import { beginIdempotency, enforceRateLimit, finishIdempotency, requestId } from '@/lib/reliability';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const sessionId = await requireSession(request);
    const rows = await env.DB.prepare('SELECT * FROM cases WHERE session_id = ? ORDER BY updated_at DESC').bind(sessionId).all();
    return json({ cases: rows.results });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const sessionId = await requireSession(request);
    await enforceRateLimit(request, 'case_create', 6, 10 * 60 * 1000);
    const body = await request.json().catch(() => ({})) as { locale?: string };
    const operation = await beginIdempotency(request, sessionId, 'case:create', body);
    if (operation.replay && operation.response?.id) return json(operation.response);
    const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM cases WHERE session_id = ?').bind(sessionId).first<{ total: number }>();
    if ((count?.total || 0) >= 3) return json({ error: 'You already have three demo reports. Open an existing report to continue.' }, { status: 429 });
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare("INSERT INTO cases (id, session_id, locale, status, step, fraud_type, channel, amount, created_at, updated_at) VALUES (?, ?, ?, 'draft', 1, 'fake_kyc', 'upi', 0, ?, ?)")
      .bind(id, sessionId, body.locale === 'hi' ? 'hi' : 'en', now, now).run();
    const response = { id, meta: { requestId: requestId(request), caseRevision: 1, savedAt: now } };
    await finishIdempotency(sessionId, 'case:create', operation.key, response);
    return json(response, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
