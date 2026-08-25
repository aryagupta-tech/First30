import { env } from 'cloudflare:workers';
import { mockSubmissionSchema } from '@/lib/contracts';
import { addEvent, caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    mockSubmissionSchema.parse(await request.json());
    const existing = await env.DB.prepare('SELECT * FROM complaint_submissions WHERE case_id = ?').bind(id).first<Record<string, unknown>>();
    if (existing) return json(await caseBundle(sessionId, id));
    const bundle = await caseBundle(sessionId, id);
    if (!bundle.intake) return json({ error: 'Complete urgent triage before submitting.' }, { status: 409 });
    if (!bundle.profile) return json({ error: 'Complete the fictional complainant profile before submitting.' }, { status: 409 });
    if (bundle.readiness.blockers) return json({ error: 'Review the remaining required information before submitting.', issues: bundle.readiness.issues }, { status: 409 });
    if (bundle.resolutions.length < 6) return json({ error: 'Confirm each source-linked fact or mark it Unknown.' }, { status: 409 });

    const now = Date.now(); const acknowledgement = `F30-DEMO-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const requestId = crypto.randomUUID();
    const payload = {
      prototype: 'FIRST30 independent mock NCRP journey', acknowledgement, submittedAt: now,
      incident: { fraudType: bundle.case.fraud_type, channel: bundle.case.channel, amount: bundle.case.amount, occurredAt: bundle.case.occurred_at, reference: bundle.case.reference, institution: bundle.case.bank, recipient: bundle.case.recipient, narrative: bundle.case.narrative_input },
      intake: bundle.intake, complainant: bundle.profile,
      facts: bundle.resolutions, findings: bundle.findings.map((item) => ({ ruleCode: item.rule_code, status: item.status, detail: item.detail_en, explanation: item.acknowledgement_note })),
      evidence: bundle.evidence.map((item) => ({ id: item.id, kind: item.kind, filename: item.filename, sha256: item.sha256, confirmedAt: item.confirmed_at })),
    };
    await env.DB.batch([
      env.DB.prepare("INSERT INTO complaint_submissions (id, case_id, acknowledgement, status, payload_json, submitted_at, updated_at) VALUES (?, ?, ?, 'action_required', ?, ?, ?)")
        .bind(crypto.randomUUID(), id, acknowledgement, JSON.stringify(payload), now, now),
      env.DB.prepare("INSERT INTO information_requests (id, case_id, status, prompt_en, prompt_hi, created_at) VALUES (?, ?, 'open', ?, ?, ?)")
        .bind(requestId, id, 'Mock review: upload a synthetic bank statement that shows the reported debit.', 'मॉक समीक्षा: रिपोर्ट किए गए डेबिट को दिखाने वाला काल्पनिक बैंक स्टेटमेंट अपलोड करें।', now),
      env.DB.prepare("UPDATE cases SET status = 'action_required', acknowledgement = ?, submitted_at = ?, step = 4, updated_at = ? WHERE id = ? AND session_id = ?")
        .bind(acknowledgement, now, now, id, sessionId),
    ]);
    await addEvent(id, 'submitted', 'Mock complaint received', 'मॉक शिकायत प्राप्त', `${acknowledgement} was created inside FIRST30. No external system was contacted.`, `${acknowledgement} FIRST30 के भीतर बनाया गया। किसी बाहरी सिस्टम से संपर्क नहीं हुआ।`, now);
    await addEvent(id, 'action_required', 'Additional evidence requested · Mock', 'अतिरिक्त प्रमाण अनुरोध · मॉक', 'The mock review asks for a synthetic bank statement.', 'मॉक समीक्षा काल्पनिक बैंक स्टेटमेंट माँगती है।', now + 1);
    return json(await caseBundle(sessionId, id), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
