import { env } from 'cloudflare:workers';
import { extractionSchema } from '@/lib/contracts';
import { ensureSchema, errorResponse, json, ownedEvidence, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, evidenceId } = await context.params;
    await ownedEvidence(sessionId, id, evidenceId);
    const body = await request.json() as { ocrText?: string; extraction?: unknown };
    const extraction = extractionSchema.parse(body.extraction);
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('UPDATE evidence_integrity SET ocr_text = ?, extraction_json = ?, confirmed_at = ? WHERE evidence_id = ?')
        .bind(String(body.ocrText || '').slice(0, 12_000), JSON.stringify(extraction), now, evidenceId),
      env.DB.prepare("UPDATE cases SET status = 'review_needed', updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    return json({ confirmedAt: now });
  } catch (error) { return errorResponse(error); }
}
