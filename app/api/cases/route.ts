import { env } from 'cloudflare:workers';
import { ensureSchema, errorResponse, json, requireSession } from '@/lib/server';

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
    const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM cases WHERE session_id = ?').bind(sessionId).first<{ total: number }>();
    if ((count?.total || 0) >= 3) return json({ error: 'This demo session already has three cases.' }, { status: 429 });
    const body = await request.json().catch(() => ({})) as { locale?: string };
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare("INSERT INTO cases (id, session_id, locale, status, step, fraud_type, channel, amount, created_at, updated_at) VALUES (?, ?, ?, 'draft', 1, 'fake_kyc', 'upi', 18499, ?, ?)")
      .bind(id, sessionId, body.locale === 'hi' ? 'hi' : 'en', now, now).run();
    return json({ id }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
