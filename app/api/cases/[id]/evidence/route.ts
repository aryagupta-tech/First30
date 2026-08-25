import { env } from 'cloudflare:workers';
import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';
import { detectImageMime, sha256Hex } from '@/lib/response-file';

const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    const form = await request.formData(); const synthetic = form.get('synthetic') === 'true';
    if (!synthetic) return json({ error: 'Confirm that the evidence is synthetic demo data.' }, { status: 400 });
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Choose a synthetic evidence image.' }, { status: 400 });
    if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) return json({ error: 'Upload a PNG, JPEG or WebP image under 5 MB.' }, { status: 400 });
    const bytes = await file.arrayBuffer();
    if (detectImageMime(bytes) !== file.type) return json({ error: 'The selected file does not contain a valid PNG, JPEG or WebP image.' }, { status: 400 });
    const digest = await sha256Hex(bytes);
    const duplicate = await env.DB.prepare('SELECT e.filename FROM evidence e JOIN evidence_integrity i ON i.evidence_id = e.id WHERE e.case_id = ? AND i.sha256 = ? LIMIT 1').bind(id, digest).first<{ filename: string }>();
    if (duplicate) return json({ error: `This file matches ${duplicate.filename}. Duplicate evidence was not added.` }, { status: 409 });
    const evidenceId = crypto.randomUUID(); const now = Date.now(); const objectKey = `${sessionId}/${id}/${evidenceId}`;
    await env.FILES.put(objectKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { synthetic: 'true', sha256: digest } });
    await env.DB.batch([
      env.DB.prepare('INSERT INTO evidence (id, case_id, kind, object_key, filename, mime_type, size, is_sample, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(evidenceId, id, String(form.get('kind') || 'transaction_receipt'), objectKey, file.name.slice(0, 180), file.type, file.size, form.get('sample') === 'true' ? 1 : 0, now),
      env.DB.prepare('INSERT INTO evidence_integrity (evidence_id, sha256) VALUES (?, ?)').bind(evidenceId, digest),
      env.DB.prepare("UPDATE cases SET status = 'review_needed', updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    return json({ id: evidenceId, sha256: digest, filename: file.name, size: file.size, mimeType: file.type }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
