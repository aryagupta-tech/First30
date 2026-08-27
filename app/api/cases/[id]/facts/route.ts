import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { factResolutionSchema } from '@/lib/contracts';
import { materializeCaseFacts, normalizeFact } from '@/lib/evidence-passport';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession, syncPassportFindings } from '@/lib/server';
import { appendAudit, assertCaseRevision, requestId } from '@/lib/reliability';

const bodySchema = z.object({ facts: z.array(factResolutionSchema).max(6) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const caseRow = await ownedCase(sessionId, id); assertCaseRevision(request, caseRow);
    if (caseRow.submitted_at) return json({ error: 'This demo report is already finished and cannot be edited. Check the details before you finish next time.' }, { status: 409 });
    const { facts } = bodySchema.parse(await request.json());
    if (new Set(facts.map((item) => item.field)).size !== facts.length) return json({ error: 'Choose only one answer for each detail.' }, { status: 400 });
    const evidenceFacts = facts.filter((fact) => fact.resolutionType === 'evidence');
    const supportedRows = evidenceFacts.length
      ? await env.DB.prepare('SELECT evidence_id, field, normalized_value FROM evidence_observations WHERE case_id = ?').bind(id).all<{ evidence_id: string; field: string; normalized_value: string }>()
      : { results: [] as Array<{ evidence_id: string; field: string; normalized_value: string }> };
    const supported = new Set((supportedRows.results || []).map((item) => `${item.evidence_id}|${item.field}|${item.normalized_value}`));
    for (const fact of evidenceFacts) {
      if (fact.resolutionType === 'evidence') {
        if (!fact.sourceEvidenceId) return json({ error: `Choose the screenshot that shows ${fact.field}.` }, { status: 400 });
        if (!supported.has(`${fact.sourceEvidenceId}|${fact.field}|${normalizeFact(fact.field, fact.value)}`)) return json({ error: `The selected screenshot does not show the chosen ${fact.field}. Please choose another value or type it yourself.` }, { status: 409 });
      }
    }
    const now = Date.now();
    const inserts = facts.map((fact) => env.DB.prepare('INSERT INTO fact_resolutions (id, case_id, field, value, normalized_value, resolution_type, source_evidence_id, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, fact.field, fact.resolutionType === 'unknown' ? 'Unknown' : fact.value, normalizeFact(fact.field, fact.resolutionType === 'unknown' ? 'Unknown' : fact.value), fact.resolutionType, fact.sourceEvidenceId || null, now));
    const resolvedFields = materializeCaseFacts(facts.map((item) => {
      const value = item.resolutionType === 'unknown' ? 'Unknown' : item.value;
      return { field: item.field, value, normalizedValue: normalizeFact(item.field, value) };
    }));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM fact_resolutions WHERE case_id = ?').bind(id), ...inserts,
      env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, NULL, ?, ?, ?)').bind(crypto.randomUUID(), id, 'facts_resolved', `${facts.length} canonical facts confirmed`, now),
      env.DB.prepare("UPDATE cases SET amount = ?, reference = ?, recipient = ?, bank = ?, occurred_at = ?, status = 'evidence_review', step = 3, revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?")
        .bind(resolvedFields.amount ?? Number(caseRow.amount || 0), resolvedFields.reference ?? String(caseRow.reference || 'Unknown'), resolvedFields.recipient ?? String(caseRow.recipient || 'Unknown'), resolvedFields.bank ?? String(caseRow.bank || 'Unknown'), resolvedFields.occurred_at ?? String(caseRow.occurred_at || ''), now, id, sessionId),
    ]);
    await syncPassportFindings(id);
    await appendAudit(id, 'citizen', 'evidence_facts_confirmed', requestId(request), { factCount: facts.length, unknownCount: facts.filter((fact) => fact.resolutionType === 'unknown').length });
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
