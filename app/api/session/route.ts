import { createSession, deleteSession, ensureSchema, errorResponse, getSessionId, json, sessionCookie } from '@/lib/server';
import { demoLoginSchema } from '@/lib/contracts';
import { csrfToken, enforceRateLimit } from '@/lib/reliability';
import { env } from 'cloudflare:workers';

export async function GET(request: Request) {
  try { await ensureSchema(); const id = await getSessionId(request); const session = id ? await env.DB.prepare('SELECT expires_at FROM demo_sessions WHERE id = ?').bind(id).first<{ expires_at: number }>() : null; return json({ active: Boolean(id), persona: id ? { id: 'sunita', name: 'Sunita Sharma', mobile: '90000 00000' } : null, csrfToken: id ? await csrfToken(id) : null, expiresAt: session?.expires_at || null }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema(); await enforceRateLimit(request, 'demo_login', 12, 10 * 60 * 1000);
    const body = demoLoginSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) return json({ error: 'Use the sample mobile number and demo OTP shown on this page.' }, { status: 400 });
    const id = await createSession(body.data.locale);
    return json({ active: true, persona: { id: 'sunita', name: 'Sunita Sharma', mobile: '90000 00000' }, csrfToken: await csrfToken(id), expiresAt: Date.now() + 24 * 60 * 60 * 1000 }, { headers: { 'set-cookie': await sessionCookie(id, new URL(request.url).protocol === 'https:') } });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    await ensureSchema();
    const id = await getSessionId(request);
    if (id) await deleteSession(id);
    return json({ active: false }, { headers: { 'set-cookie': 'f30_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' } });
  } catch (error) { return errorResponse(error); }
}
