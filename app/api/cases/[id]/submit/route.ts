import { mockSubmissionSchema } from '@/lib/contracts';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';
import { createSubmissionWorkflow } from '@/lib/reporting-engine';
import { assertCaseRevision, beginIdempotency, finishIdempotency, requestId } from '@/lib/reliability';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params;
    const command = mockSubmissionSchema.parse(await request.json());
    const operation = await beginIdempotency(request, sessionId, `submit:${id}`, command);
    if (operation.replay) return json(await caseBundle(sessionId, id));
    const caseRow = await ownedCase(sessionId, id); assertCaseRevision(request, caseRow);
    const bundle = await caseBundle(sessionId, id);
    if (!bundle.intake) return json({ error: 'Complete urgent triage before submitting.' }, { status: 409 });
    if (!bundle.profile) return json({ error: 'Complete the fictional complainant profile before submitting.' }, { status: 409 });
    if (bundle.readiness.blockers) return json({ error: 'Review the remaining required information before submitting.', issues: bundle.readiness.issues }, { status: 409 });
    if (bundle.resolutions.length < 6) return json({ error: 'Confirm each source-linked fact or mark it Unknown.' }, { status: 409 });

    const now = Date.now(); const acknowledgement = `F30-DEMO-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const correlationId = requestId(request);
    const payload = {
      prototype: 'FIRST30 independent mock NCRP journey', acknowledgement, submittedAt: now,
      incident: { fraudType: bundle.case.fraud_type, channel: bundle.case.channel, amount: bundle.case.amount, occurredAt: bundle.case.occurred_at, reference: bundle.case.reference, institution: bundle.case.bank, recipient: bundle.case.recipient, narrative: bundle.case.narrative_input },
      intake: bundle.intake, complainant: bundle.profile,
      facts: bundle.resolutions, findings: bundle.findings.map((item) => ({ ruleCode: item.rule_code, status: item.status, detail: item.detail_en, explanation: item.acknowledgement_note })),
      evidence: bundle.evidence.map((item) => ({ id: item.id, kind: item.kind, filename: item.filename, sha256: item.sha256, confirmedAt: item.confirmed_at })),
    };
    await createSubmissionWorkflow({ sessionId, caseId: id, acknowledgement, payload, requestId: correlationId });
    await finishIdempotency(sessionId, `submit:${id}`, operation.key, { caseId: id, acknowledgement });
    return json(await caseBundle(sessionId, id), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
