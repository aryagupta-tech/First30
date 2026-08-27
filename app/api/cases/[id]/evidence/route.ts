import { env } from 'cloudflare:workers';
import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';
import { detectImageMime, sha256Hex } from '@/lib/response-file';
import { evidenceDataUseSchema, evidenceKindSchema } from '@/lib/contracts';
import { appendAudit, assertCaseRevision, beginIdempotency, enforceRateLimit, finishIdempotency, requestId } from '@/lib/reliability';

const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const sessionId = await requireSession(request); const { id } = await context.params; const caseRow = await ownedCase(sessionId, id);
    await enforceRateLimit(request, 'evidence_upload', 20, 60 * 60 * 1000);
    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > 6 * 1024 * 1024) return json({ error: 'This upload is too large. Choose an image under 5 MB.', code: 'UPLOAD_TOO_LARGE', requestId: requestId(request), retryable: false }, { status: 413 });
    const form = await request.formData(); const dataUse = evidenceDataUseSchema.safeParse({ sample: form.get('sample') === 'true', safeDataConfirmed: form.get('safeDataConfirmed') === 'true' });
    if (!dataUse.success) return json({ error: 'Confirm that this is fictional or fully redacted test data before adding it.', code: 'SAFE_DATA_CONFIRMATION_REQUIRED', requestId: requestId(request), retryable: false }, { status: 400 });
    const { sample } = dataUse.data;
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Choose a test screenshot.' }, { status: 400 });
    if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) return json({ error: 'Upload a PNG, JPEG or WebP image under 5 MB.' }, { status: 400 });
    const kind = evidenceKindSchema.parse(String(form.get('kind') || 'receipt'));
    const evidenceCount = await env.DB.prepare('SELECT COUNT(*) AS total FROM evidence WHERE case_id = ?').bind(id).first<{ total: number }>();
    if (Number(evidenceCount?.total || 0) >= 12) return json({ error: 'This report already has the maximum 12 evidence images.', code: 'EVIDENCE_LIMIT', requestId: requestId(request), retryable: false }, { status: 429 });
    if (caseRow.submitted_at && kind !== 'bank_statement') return json({ error: 'This demo report is already finished. You can only add the bank statement requested on the progress page.' }, { status: 409 });
    const bytes = await file.arrayBuffer();
    if (detectImageMime(bytes) !== file.type) return json({ error: 'The selected file does not contain a valid PNG, JPEG or WebP image.' }, { status: 400 });
    const digest = await sha256Hex(bytes);
    const operation = await beginIdempotency(request, sessionId, `evidence:${id}`, { digest, kind, size: file.size });
    if (operation.replay && operation.response?.id) {
      const latest = await ownedCase(sessionId, id);
      return json({ ...operation.response, meta: { caseRevision: Number(latest.revision || 1), savedAt: Number(latest.updated_at || Date.now()) } });
    }
    const revision = assertCaseRevision(request, caseRow);
    const duplicate = await env.DB.prepare('SELECT e.id, e.filename, e.object_key, s.status FROM evidence e JOIN evidence_integrity i ON i.evidence_id = e.id LEFT JOIN evidence_storage s ON s.evidence_id = e.id WHERE e.case_id = ? AND i.sha256 = ? LIMIT 1').bind(id, digest).first<{ id: string; filename: string; object_key: string; status: string | null }>();
    if (duplicate && operation.existing && duplicate.status === 'failed') {
      const retriedAt = Date.now();
      await env.FILES.put(duplicate.object_key, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { dataClassification: sample ? 'bundled_sample' : 'user_confirmed_safe_test', sha256: digest } });
      await env.DB.batch([
        env.DB.prepare("UPDATE evidence_storage SET status = 'stored', attempt_count = attempt_count + 1, last_error_code = NULL, updated_at = ? WHERE evidence_id = ?").bind(retriedAt, duplicate.id),
        env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, duplicate.id, 'storage_retried', 'Evidence storage recovered after a safe retry.', retriedAt),
        env.DB.prepare("UPDATE cases SET status = CASE WHEN submitted_at IS NULL THEN 'evidence_review' ELSE status END, revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(retriedAt, id, sessionId),
      ]);
      const recovered = { id: duplicate.id, sha256: digest, filename: duplicate.filename, size: file.size, mimeType: file.type };
      await finishIdempotency(sessionId, `evidence:${id}`, operation.key, recovered);
      await appendAudit(id, 'first30', 'evidence_storage_recovered', requestId(request), { evidenceId: duplicate.id, sha256: digest });
      return json({ ...recovered, meta: { caseRevision: revision + 1, savedAt: retriedAt } }, { status: 201 });
    }
    if (duplicate) return json({ error: `This is the same image as ${duplicate.filename}, so it was not added again.` }, { status: 409 });
    const evidenceId = crypto.randomUUID(); const now = Date.now(); const objectKey = `${sessionId}/${id}/${evidenceId}`;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO evidence (id, case_id, kind, object_key, filename, mime_type, size, is_sample, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(evidenceId, id, kind, objectKey, file.name.slice(0, 180), file.type, file.size, sample ? 1 : 0, now),
      env.DB.prepare('INSERT INTO evidence_integrity (evidence_id, sha256) VALUES (?, ?)').bind(evidenceId, digest),
      env.DB.prepare("INSERT INTO evidence_analysis (evidence_id, client_sha256, ocr_method, analysis_status) VALUES (?, ?, 'manual', 'pending')").bind(evidenceId, digest),
      env.DB.prepare("INSERT INTO evidence_storage (evidence_id, status, attempt_count, updated_at) VALUES (?, 'pending', 1, ?)").bind(evidenceId, now),
    ]);
    try { await env.FILES.put(objectKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { dataClassification: sample ? 'bundled_sample' : 'user_confirmed_safe_test', sha256: digest } }); }
    catch (error) { await env.DB.prepare("UPDATE evidence_storage SET status = 'failed', last_error_code = 'R2_WRITE_FAILED', updated_at = ? WHERE evidence_id = ?").bind(Date.now(), evidenceId).run(); throw error; }
    await env.DB.batch([
      env.DB.prepare("UPDATE evidence_storage SET status = 'stored', last_error_code = NULL, updated_at = ? WHERE evidence_id = ?").bind(now, evidenceId),
      env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, evidenceId, 'added', `${kind} evidence added with SHA-256 ${digest}`, now),
      env.DB.prepare("UPDATE cases SET status = CASE WHEN submitted_at IS NULL THEN 'evidence_review' ELSE status END, step = CASE WHEN submitted_at IS NULL THEN 2 ELSE step END, revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    await finishIdempotency(sessionId, `evidence:${id}`, operation.key, { id: evidenceId, sha256: digest, filename: file.name, size: file.size, mimeType: file.type });
    await appendAudit(id, 'citizen', 'evidence_stored', requestId(request), { evidenceId, kind, sha256: digest, size: file.size });
    return json({ id: evidenceId, sha256: digest, filename: file.name, size: file.size, mimeType: file.type, meta: { caseRevision: revision + 1, savedAt: now } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
