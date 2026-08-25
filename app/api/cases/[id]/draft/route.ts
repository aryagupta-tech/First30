import { env } from 'cloudflare:workers';
import { buildComplaint } from '@/lib/response-file';
import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const caseRow = await ownedCase(sessionId, id);
    if (caseRow.submitted_at) return json({ error: 'The submitted snapshot is immutable. Start a new synthetic report to change complaint details.' }, { status: 409 });
    const body = await request.json() as { narrative?: string };
    if (!body.narrative || body.narrative.trim().length < 30) return json({ error: 'Describe what happened in at least 30 characters.' }, { status: 400 });
    const result = buildComplaint({ amount: caseRow.amount, occurredAt: caseRow.occurred_at, reference: caseRow.reference, channel: caseRow.channel, bank: caseRow.bank, recipient: caseRow.recipient, narrative: body.narrative.trim() });
    await env.DB.prepare("UPDATE cases SET narrative_input = ?, complaint_en = ?, complaint_hi = ?, step = 3, status = 'ready_to_submit', updated_at = ? WHERE id = ? AND session_id = ?")
      .bind(body.narrative.trim(), result.complaintEn, result.complaintHi, Date.now(), id, sessionId).run();
    return json(result);
  } catch (error) { return errorResponse(error); }
}
