import { env } from 'cloudflare:workers';
import { draftComplaint } from '@/lib/ai';
import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const caseRow = await ownedCase(sessionId, id);
    const body = await request.json() as { narrative?: string };
    if (!body.narrative || body.narrative.trim().length < 30) return json({ error: 'Describe what happened in at least 30 characters.' }, { status: 400 });
    const usage = await env.DB.prepare('SELECT ai_calls FROM demo_sessions WHERE id = ?').bind(sessionId).first<{ ai_calls: number }>();
    if ((usage?.ai_calls || 0) >= 10) return json({ error: 'AI demo limit reached. Continue with the existing confirmed details.' }, { status: 429 });
    await env.DB.prepare('UPDATE demo_sessions SET ai_calls = ai_calls + 1 WHERE id = ?').bind(sessionId).run();
    const result = await draftComplaint({ amount: caseRow.amount, occurredAt: caseRow.occurred_at, reference: caseRow.reference, channel: caseRow.channel, bank: caseRow.bank, recipient: caseRow.recipient }, body.narrative.trim());
    await env.DB.prepare('UPDATE cases SET narrative_input = ?, complaint_en = ?, complaint_hi = ?, step = 5, updated_at = ? WHERE id = ? AND session_id = ?')
      .bind(body.narrative.trim(), result.complaintEn, result.complaintHi, Date.now(), id, sessionId).run();
    return json(result);
  } catch (error) { return errorResponse(error); }
}
