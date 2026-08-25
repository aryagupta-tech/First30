import { env } from 'cloudflare:workers';
import { ensureSchema, errorResponse, json, ownedEvidence, requireSession } from '@/lib/server';

export async function GET(request: Request, context: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, evidenceId } = await context.params;
    const row = await ownedEvidence(sessionId, id, evidenceId);
    if (!row.object_key) return json({ error: 'Evidence bytes are unavailable.' }, { status: 404 });
    const object = await env.FILES.get(String(row.object_key));
    if (!object) return json({ error: 'Evidence bytes are unavailable.' }, { status: 404 });
    return new Response(object.body, { headers: { 'content-type': String(row.mime_type), 'content-length': String(row.size), 'cache-control': 'private, no-store', 'content-disposition': `inline; filename="${String(row.filename).replace(/["\r\n]/g, '')}"` } });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, evidenceId } = await context.params;
    const row = await ownedEvidence(sessionId, id, evidenceId);
    if (row.object_key) await env.FILES.delete(String(row.object_key));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM evidence_integrity WHERE evidence_id = ?').bind(evidenceId),
      env.DB.prepare('DELETE FROM evidence WHERE id = ? AND case_id = ?').bind(evidenceId, id),
      env.DB.prepare("UPDATE cases SET status = 'review_needed', updated_at = ? WHERE id = ? AND session_id = ?").bind(Date.now(), id, sessionId),
    ]);
    return json({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
