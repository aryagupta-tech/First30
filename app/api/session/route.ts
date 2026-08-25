import { createSession, deleteSession, ensureSchema, errorResponse, getSessionId, json, sessionCookie } from '@/lib/server';

export async function GET(request: Request) {
  try { await ensureSchema(); return json({ active: Boolean(await getSessionId(request)) }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { locale?: string };
    const id = await createSession(body.locale);
    return json({ active: true, persona: { id: 'sunita', name: 'Sunita Rao', mobile: '•••••• 4210' } }, { headers: { 'set-cookie': await sessionCookie(id, new URL(request.url).protocol === 'https:') } });
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
