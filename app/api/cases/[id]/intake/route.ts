import { env } from 'cloudflare:workers';
import { intakeSchema } from '@/lib/contracts';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const caseRow = await ownedCase(sessionId, id);
    if (caseRow.submitted_at) return json({ error: 'The submitted snapshot is immutable. Start a new synthetic report to change triage.' }, { status: 409 });
    const value = intakeSchema.parse(await request.json()); const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO case_intake (case_id, loss_timing, helpline_contacted, bank_contacted, delay_reason, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET loss_timing = excluded.loss_timing, helpline_contacted = excluded.helpline_contacted, bank_contacted = excluded.bank_contacted, delay_reason = excluded.delay_reason, updated_at = excluded.updated_at")
        .bind(id, value.lossTiming, value.helplineContacted ? 1 : 0, value.bankContacted ? 1 : 0, value.delayReason, now),
      env.DB.prepare("UPDATE cases SET fraud_type = ?, channel = ?, amount = ?, occurred_at = ?, status = 'evidence_review', step = 2, updated_at = ? WHERE id = ? AND session_id = ?")
        .bind(value.fraudType, value.channel, value.amount, value.occurredAt, now, id, sessionId),
    ]);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
