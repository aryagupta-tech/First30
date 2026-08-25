import { env } from 'cloudflare:workers';
import { requestResponseSchema } from '@/lib/contracts';
import { addEvent, caseBundle, ensureSchema, errorResponse, json, ownedCase, ownedEvidence, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string; requestId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, requestId } = await context.params;
    await ownedCase(sessionId, id);
    const value = requestResponseSchema.parse(await request.json());
    const infoRequest = await env.DB.prepare("SELECT * FROM information_requests WHERE id = ? AND case_id = ? AND status = 'open'").bind(requestId, id).first<Record<string, unknown>>();
    if (!infoRequest) return json({ error: 'This evidence request is not open.' }, { status: 404 });
    const evidence = await ownedEvidence(sessionId, id, value.evidenceId);
    if (evidence.kind !== 'bank_statement' || evidence.analysis_status !== 'confirmed') return json({ error: 'Confirm a synthetic bank statement before responding.' }, { status: 409 });
    const existing = await env.DB.prepare('SELECT id FROM information_request_responses WHERE request_id = ?').bind(requestId).first();
    if (existing) return json(await caseBundle(sessionId, id));
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO information_request_responses (id, request_id, case_id, evidence_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), requestId, id, value.evidenceId, value.note, now),
      env.DB.prepare("UPDATE information_requests SET status = 'completed', evidence_id = ?, completed_at = ? WHERE id = ? AND case_id = ?").bind(value.evidenceId, now, requestId, id),
      env.DB.prepare("UPDATE complaint_submissions SET status = 'evidence_received', updated_at = ? WHERE case_id = ?").bind(now, id),
      env.DB.prepare("UPDATE cases SET status = 'evidence_received', updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    await addEvent(id, 'evidence_received', 'Additional evidence received · Mock', 'अतिरिक्त प्रमाण प्राप्त · मॉक', 'The synthetic bank statement was attached to the mock complaint.', 'काल्पनिक बैंक स्टेटमेंट मॉक शिकायत से जोड़ा गया।', now);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
