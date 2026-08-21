import { env } from 'cloudflare:workers';
import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

const allowed = new Set(['image/png','image/jpeg','image/webp']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    const form = await request.formData(); const sample = form.get('sample') === 'true'; const synthetic = form.get('synthetic') === 'true';
    if (!synthetic) return json({ error: 'Confirm that the evidence is synthetic demo data.' }, { status: 400 });
    const kind = String(form.get('kind') || 'transaction_receipt'); const evidenceId = crypto.randomUUID(); const now = Date.now();
    if (sample) {
      await env.DB.prepare('INSERT INTO evidence (id, case_id, kind, filename, mime_type, size, is_sample, created_at) VALUES (?, ?, ?, ?, ?, 0, 1, ?)')
        .bind(evidenceId, id, kind, kind === 'bank_statement' ? 'sample-bank-statement.png' : 'sample-upi-receipt.png', 'image/png', now).run();
    } else {
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'Choose a synthetic image.' }, { status: 400 });
      if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) return json({ error: 'Upload a PNG, JPEG or WebP image under 5 MB.' }, { status: 400 });
      const objectKey = `${sessionId}/${id}/${evidenceId}`;
      await env.FILES.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { synthetic: 'true' } });
      await env.DB.prepare('INSERT INTO evidence (id, case_id, kind, object_key, filename, mime_type, size, is_sample, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)')
        .bind(evidenceId, id, kind, objectKey, file.name, file.type, file.size, now).run();
    }
    return json({ id: evidenceId, sample }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
