import { createSession, deleteSession, ensureSchema, errorResponse, getSessionId, json, sessionCookie } from '@/lib/server';
import { demoLoginSchema } from '@/lib/contracts';

export async function GET(request: Request) {
  try { await ensureSchema(); const active = Boolean(await getSessionId(request)); return json({ active, persona: active ? { id: 'sunita', name: 'Sunita Sharma', mobile: '90000 00000' } : null }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = demoLoginSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) return json({ error: 'Use the visible synthetic mobile number and demo OTP.' }, { status: 400 });
    const id = await createSession(body.data.locale);
    return json({ active: true, persona: { id: 'sunita', name: 'Sunita Sharma', mobile: '90000 00000' } }, { headers: { 'set-cookie': await sessionCookie(id, new URL(request.url).protocol === 'https:') } });
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
