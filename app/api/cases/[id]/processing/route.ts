import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';
import { requestId } from '@/lib/reliability';
import { processingReceipt } from '@/lib/reporting-engine';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params;
    const row = await ownedCase(sessionId, id);
    return json({ processing: await processingReceipt(sessionId, id), meta: { requestId: requestId(request), caseRevision: Number(row.revision || 1), savedAt: Number(row.updated_at || Date.now()) } });
  } catch (error) { return errorResponse(error); }
}
