import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { evidenceAnalysisSchema, evidenceKindSchema } from '@/lib/contracts';
import { detectImageMime, sha256Hex } from '@/lib/response-file';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';
import { appendAudit, assertCaseRevision, beginIdempotency, finishIdempotency, requestId } from '@/lib/reliability';

const demoItemSchema = evidenceAnalysisSchema.extend({
  kind: evidenceKindSchema,
  filename: z.string().min(1).max(180),
});

const requiredKinds = new Set(['receipt', 'chat', 'call_log']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const sessionId = await requireSession(request);
    const { id } = await context.params;
    const caseRow = await ownedCase(sessionId, id);
    const revision = assertCaseRevision(request, caseRow);
    if (caseRow.submitted_at) return json({ error: 'This demo report is already finished and cannot be changed.' }, { status: 409 });

    const form = await request.formData();
    if (form.get('safeDataConfirmed') !== 'true') return json({ error: 'Confirm that the prepared files contain fictional test information.' }, { status: 400 });
    const parsed = z.array(demoItemSchema).length(3).parse(JSON.parse(String(form.get('analyses') || '[]')));
    const files = form.getAll('file');
    if (files.length !== 3 || files.some((item) => !(item instanceof File))) return json({ error: 'The prepared evidence set is incomplete. Please try again.' }, { status: 400 });
    if (new Set(parsed.map((item) => item.kind)).size !== 3 || parsed.some((item) => !requiredKinds.has(item.kind))) return json({ error: 'The prepared evidence set must contain one receipt, one conversation and one call log.' }, { status: 400 });

    const prepared = await Promise.all(parsed.map(async (analysis, index) => {
      const file = files[index] as File;
      if (file.size > 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('A prepared evidence image is invalid. Please reload FIRST30 and try again.');
      const bytes = await file.arrayBuffer();
      const digest = await sha256Hex(bytes);
      if (detectImageMime(bytes) !== file.type || digest !== analysis.clientSha256) throw new Error('A prepared evidence image changed before it could be saved. Please try again.');
      return { analysis, file, bytes, digest, evidenceId: crypto.randomUUID() };
    }));

    const operation = await beginIdempotency(request, sessionId, `demo-evidence:${id}`, prepared.map((item) => ({ kind: item.analysis.kind, digest: item.digest })));
    if (operation.replay) return json(await caseBundle(sessionId, id));
    if (operation.existing) return json({ error: 'The prepared evidence is already being added. Please wait a moment and try again.', code: 'DEMO_EVIDENCE_PENDING', retryable: true }, { status: 409 });

    const existing = await env.DB.prepare("SELECT COUNT(*) AS total FROM evidence WHERE case_id = ? AND kind IN ('receipt','chat','call_log')").bind(id).first<{ total: number }>();
    if (Number(existing?.total || 0) > 0) return json({ error: 'Remove the existing receipt, conversation and call-log screenshots before loading the prepared case.' }, { status: 409 });

    const now = Date.now();
    const objectKey = (evidenceId: string) => `${sessionId}/${id}/${evidenceId}`;
    const reserveStatements = prepared.flatMap(({ analysis, file, digest, evidenceId }) => [
      env.DB.prepare('INSERT INTO evidence (id, case_id, kind, object_key, filename, mime_type, size, is_sample, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)')
        .bind(evidenceId, id, analysis.kind, objectKey(evidenceId), file.name.slice(0, 180), file.type, file.size, now),
      env.DB.prepare('INSERT INTO evidence_integrity (evidence_id, sha256, ocr_text, extraction_json, confirmed_at) VALUES (?, ?, ?, ?, ?)')
        .bind(evidenceId, digest, analysis.ocrText, JSON.stringify(analysis.observations), now),
      env.DB.prepare("INSERT INTO evidence_analysis (evidence_id, client_sha256, ocr_method, analysis_status, analysed_at) VALUES (?, ?, ?, 'confirmed', ?)")
        .bind(evidenceId, digest, analysis.ocrMethod, now),
      env.DB.prepare("INSERT INTO evidence_storage (evidence_id, status, attempt_count, updated_at) VALUES (?, 'pending', 1, ?)").bind(evidenceId, now),
      ...analysis.observations.map((item) => env.DB.prepare('INSERT INTO evidence_observations (id, case_id, evidence_id, field, value, normalized_value, source_text, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), id, evidenceId, item.field, item.value, item.normalizedValue, item.sourceText, Math.round(item.confidence * 1000), now)),
      env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), id, evidenceId, 'analysed', `Prepared ${analysis.kind} evidence added and checked locally`, now),
    ]);
    await env.DB.batch(reserveStatements);

    try {
      await Promise.all(prepared.map(({ analysis, file, bytes, digest, evidenceId }) => env.FILES.put(objectKey(evidenceId), bytes, {
        httpMetadata: { contentType: file.type },
        customMetadata: { dataClassification: 'bundled_sample', sha256: digest, evidenceKind: analysis.kind },
      })));
    } catch (error) {
      await env.DB.batch(prepared.map(({ evidenceId }) => env.DB.prepare("UPDATE evidence_storage SET status = 'failed', last_error_code = 'R2_WRITE_FAILED', updated_at = ? WHERE evidence_id = ?").bind(Date.now(), evidenceId)));
      throw error;
    }

    await env.DB.batch([
      ...prepared.map(({ evidenceId }) => env.DB.prepare("UPDATE evidence_storage SET status = 'stored', last_error_code = NULL, updated_at = ? WHERE evidence_id = ?").bind(now, evidenceId)),
      env.DB.prepare("UPDATE cases SET status = 'evidence_review', step = 2, revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    await finishIdempotency(sessionId, `demo-evidence:${id}`, operation.key, { evidenceIds: prepared.map((item) => item.evidenceId) });
    await appendAudit(id, 'citizen', 'prepared_evidence_set_added', requestId(request), { evidenceCount: prepared.length });
    const bundle = await caseBundle(sessionId, id);
    return json({ ...bundle, meta: { ...bundle.meta, caseRevision: revision + 1, savedAt: now } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
