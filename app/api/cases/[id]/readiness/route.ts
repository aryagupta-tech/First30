import { env } from 'cloudflare:workers';
import { caseBundle, ensureSchema, errorResponse, json, requireSession } from '@/lib/server';
import { findContradictions } from '@/lib/response-file';
import { caseStatusFor, evaluateReadiness } from '@/lib/workflow';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params;
    const bundle = await caseBundle(sessionId, id);
    const contradictions = bundle.evidence.flatMap((item) => {
      try { return findContradictions(item.extraction_json ? JSON.parse(String(item.extraction_json)) : null, { amount: bundle.case.amount, reference: bundle.case.reference }); } catch { return []; }
    });
    const readiness = evaluateReadiness({ amount: Number(bundle.case.amount || 0), occurredAt: String(bundle.case.occurred_at || ''), reference: String(bundle.case.reference || ''), bank: String(bundle.case.bank || ''), recipient: String(bundle.case.recipient || ''), narrative: String(bundle.case.narrative_input || ''), evidence: bundle.evidence, contradictions });
    const nextStatus = caseStatusFor(readiness.level, String(bundle.case.status) === 'exported');
    if (nextStatus !== bundle.case.status) await env.DB.prepare('UPDATE cases SET status = ?, updated_at = ? WHERE id = ? AND session_id = ?').bind(nextStatus, Date.now(), id, sessionId).run();
    return json({ ...readiness, status: nextStatus });
  } catch (error) { return errorResponse(error); }
}
