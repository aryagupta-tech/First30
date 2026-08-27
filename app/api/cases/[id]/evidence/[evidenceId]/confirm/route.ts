import { env } from 'cloudflare:workers';
import { evidenceAnalysisSchema } from '@/lib/contracts';
import { ensureSchema, errorResponse, json, ownedCase, ownedEvidence, requireSession, syncPassportFindings } from '@/lib/server';
import { appendAudit, assertCaseRevision, requestId } from '@/lib/reliability';

export async function POST(request: Request, context: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id, evidenceId } = await context.params;
    const caseRow = await ownedCase(sessionId, id); const revision = assertCaseRevision(request, caseRow);
    const evidence = await ownedEvidence(sessionId, id, evidenceId);
    const analysis = evidenceAnalysisSchema.parse(await request.json());
    if (analysis.clientSha256 !== evidence.sha256) return json({ error: 'The screenshot changed while it was being checked. Please remove it and add it again.' }, { status: 409 });
    const now = Date.now();
    const observationStatements = analysis.observations.map((item) => env.DB.prepare('INSERT INTO evidence_observations (id, case_id, evidence_id, field, value, normalized_value, source_text, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, evidenceId, item.field, item.value, item.normalizedValue, item.sourceText, Math.round(item.confidence * 1000), now));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM evidence_observations WHERE evidence_id = ?').bind(evidenceId),
      env.DB.prepare('UPDATE evidence_integrity SET ocr_text = ?, extraction_json = ?, confirmed_at = ? WHERE evidence_id = ?')
        .bind(analysis.ocrText, JSON.stringify(analysis.observations), now, evidenceId),
      env.DB.prepare("UPDATE evidence_analysis SET client_sha256 = ?, ocr_method = ?, analysis_status = 'confirmed', analysed_at = ? WHERE evidence_id = ?")
        .bind(analysis.clientSha256, analysis.ocrMethod, now, evidenceId),
      ...observationStatements,
      env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, evidenceId, 'analysed', `${analysis.ocrMethod} produced ${analysis.observations.length} confirmed observations`, now),
      env.DB.prepare("UPDATE cases SET status = CASE WHEN submitted_at IS NULL THEN 'evidence_review' ELSE status END, step = CASE WHEN submitted_at IS NULL THEN 2 ELSE step END, revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    const passport = await syncPassportFindings(id);
    await appendAudit(id, 'citizen', 'evidence_analysis_confirmed', requestId(request), { evidenceId, method: analysis.ocrMethod, observationCount: analysis.observations.length });
    return json({ confirmedAt: now, passport, meta: { caseRevision: revision + 1, savedAt: now } });
  } catch (error) { return errorResponse(error); }
}
