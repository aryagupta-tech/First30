import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';
import { processSubmissionWorkflow } from '@/lib/reporting-engine';
import { assertCaseRevision, beginIdempotency, finishIdempotency, requestId } from '@/lib/reliability';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params;
    const operation = await beginIdempotency(request, sessionId, `process:${id}`, { workflow: 'mock_ncrp_submit' });
    if (operation.replay) return json(await processSubmissionWorkflow({ sessionId, caseId: id, requestId: requestId(request) }));
    const row = await ownedCase(sessionId, id); assertCaseRevision(request, row);
    const bundle = await processSubmissionWorkflow({ sessionId, caseId: id, requestId: requestId(request) });
    await finishIdempotency(sessionId, `process:${id}`, operation.key, { caseId: id, completed: true });
    return json(bundle);
  } catch (error) { return errorResponse(error); }
}
