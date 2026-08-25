import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession, syncPassportFindings } from '@/lib/server';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    await syncPassportFindings(id);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
