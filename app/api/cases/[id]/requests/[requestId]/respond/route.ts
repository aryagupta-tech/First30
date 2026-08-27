import { env } from 'cloudflare:workers';
import { requestResponseSchema } from '@/lib/contracts';
import { addEvent, caseBundle, ensureSchema, errorResponse, json, ownedCase, ownedEvidence, requireSession } from '@/lib/server';
import { appendAudit, assertCaseRevision, beginIdempotency, finishIdempotency, requestId as correlationId } from '@/lib/reliability';
import { assertTransition } from '@/lib/reporting-engine';

export async function POST(request: Request, context: { params: Promise<{ id: string; requestId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, requestId } = await context.params;
    const value = requestResponseSchema.parse(await request.json());
    const operation = await beginIdempotency(request, sessionId, `request-response:${requestId}`, value);
    if (operation.replay) return json(await caseBundle(sessionId, id));
    const caseRow = await ownedCase(sessionId, id); assertCaseRevision(request, caseRow);
    assertTransition(String(caseRow.status), 'evidence_received');
    const infoRequest = await env.DB.prepare("SELECT * FROM information_requests WHERE id = ? AND case_id = ? AND status = 'open'").bind(requestId, id).first<Record<string, unknown>>();
    if (!infoRequest) return json({ error: 'This request is already complete or is no longer available.' }, { status: 404 });
    const evidence = await ownedEvidence(sessionId, id, value.evidenceId);
    if (evidence.kind !== 'bank_statement' || evidence.analysis_status !== 'confirmed') return json({ error: 'Add and check the sample bank statement before continuing.' }, { status: 409 });
    const existing = await env.DB.prepare('SELECT id FROM information_request_responses WHERE request_id = ?').bind(requestId).first();
    if (existing) return json(await caseBundle(sessionId, id));
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO information_request_responses (id, request_id, case_id, evidence_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), requestId, id, value.evidenceId, value.note, now),
      env.DB.prepare("UPDATE information_requests SET status = 'completed', evidence_id = ?, completed_at = ? WHERE id = ? AND case_id = ?").bind(value.evidenceId, now, requestId, id),
      env.DB.prepare("UPDATE complaint_submissions SET status = 'evidence_received', updated_at = ? WHERE case_id = ?").bind(now, id),
      env.DB.prepare("UPDATE cases SET status = 'evidence_received', revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    await addEvent(id, 'evidence_received', 'Extra document added · Demo', 'अतिरिक्त दस्तावेज़ जोड़ा गया · डेमो', 'The sample bank statement was added to this FIRST30 demo report.', 'नमूना बैंक स्टेटमेंट इस FIRST30 डेमो रिपोर्ट में जोड़ा गया।', now);
    await finishIdempotency(sessionId, `request-response:${requestId}`, operation.key, { caseId: id, completed: true });
    await appendAudit(id, 'citizen', 'follow_up_evidence_supplied', correlationId(request), { requestId, evidenceId: value.evidenceId });
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
