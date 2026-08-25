import { env } from 'cloudflare:workers';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function DELETE(request: Request, context: { params: Promise<{ id: string; milestoneId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, milestoneId } = await context.params; await ownedCase(sessionId, id);
    await env.DB.prepare('DELETE FROM milestones WHERE id = ? AND case_id = ?').bind(milestoneId, id).run();
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
