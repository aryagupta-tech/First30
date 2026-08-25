import { env } from 'cloudflare:workers';
import { findingAcknowledgementSchema } from '@/lib/contracts';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string; findingId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, findingId } = await context.params; await ownedCase(sessionId, id);
    const { note } = findingAcknowledgementSchema.parse(await request.json()); const now = Date.now();
    const finding = await env.DB.prepare("SELECT id FROM passport_findings WHERE id = ? AND case_id = ? AND status = 'conflict'").bind(findingId, id).first();
    if (!finding) return json({ error: 'Conflict finding not found.' }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare('UPDATE passport_findings SET acknowledgement_note = ?, acknowledged_at = ? WHERE id = ? AND case_id = ?').bind(note, now, findingId, id),
      env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, NULL, ?, ?, ?)').bind(crypto.randomUUID(), id, 'finding_acknowledged', note, now),
      env.DB.prepare("UPDATE cases SET status = 'review_needed', updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
