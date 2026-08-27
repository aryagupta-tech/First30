import { env } from 'cloudflare:workers';
import { addEvent, caseBundle, ownedCase } from './server';
import { appendAudit, auditStatus, decryptPrivateJson, encryptPrivateJson } from './reliability';
import { canTransition, type EngineState } from './workflow';

export function assertTransition(from: string, to: EngineState) {
  if (!canTransition(from, to)) throw new Response(JSON.stringify({ error: 'This report cannot move to that step yet.', code: 'INVALID_TRANSITION', requestId: crypto.randomUUID(), retryable: false }), { status: 409, headers: { 'content-type': 'application/json' } });
}

export type MockGatewayResult = { accepted: true; acknowledgement: string; responseCode: 'MOCK_ACCEPTED' };

export interface SubmissionGateway {
  submit(payload: Record<string, unknown>): Promise<MockGatewayResult>;
}

export class MockNcrpGateway implements SubmissionGateway {
  async submit(payload: Record<string, unknown>): Promise<MockGatewayResult> {
    const acknowledgement = String(payload.acknowledgement || 'F30-DEMO-UNKNOWN');
    return { accepted: true, acknowledgement, responseCode: 'MOCK_ACCEPTED' };
  }
}

export async function createSubmissionWorkflow(input: { sessionId: string; caseId: string; acknowledgement: string; payload: Record<string, unknown>; requestId: string }) {
  const startedAt = Date.now();
  const row = await ownedCase(input.sessionId, input.caseId);
  assertTransition(String(row.status), 'submitted');
  const existing = await env.DB.prepare('SELECT id FROM complaint_submissions WHERE case_id = ?').bind(input.caseId).first<{ id: string }>();
  if (existing) return { submissionId: existing.id, replay: true };
  const now = Date.now(); const submissionId = crypto.randomUUID(); const runId = crypto.randomUUID();
  const encrypted = await encryptPrivateJson(input.payload);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO complaint_submissions (id, case_id, acknowledgement, status, payload_json, submitted_at, updated_at) VALUES (?, ?, ?, 'submitted', ?, ?, ?)").bind(submissionId, input.caseId, input.acknowledgement, JSON.stringify({ encrypted: true, version: 1 }), now, now),
    env.DB.prepare('INSERT INTO secure_submission_payloads (submission_id, ciphertext, iv, key_version, created_at) VALUES (?, ?, ?, ?, ?)').bind(submissionId, encrypted.ciphertext, encrypted.iv, encrypted.keyVersion, now),
    env.DB.prepare("INSERT INTO workflow_runs (id, case_id, status, current_step, request_id, attempt_count, created_at, updated_at) VALUES (?, ?, 'pending', 'mock_dispatch', ?, 0, ?, ?)").bind(runId, input.caseId, input.requestId, now, now),
    env.DB.prepare("INSERT INTO workflow_steps (id, run_id, step_code, status, attempt_count, started_at, completed_at) VALUES (?, ?, 'validate_snapshot', 'complete', 1, ?, ?)").bind(crypto.randomUUID(), runId, now, now),
    env.DB.prepare("INSERT INTO workflow_steps (id, run_id, step_code, status, attempt_count) VALUES (?, ?, 'mock_dispatch', 'pending', 0)").bind(crypto.randomUUID(), runId),
    env.DB.prepare("INSERT INTO workflow_steps (id, run_id, step_code, status, attempt_count) VALUES (?, ?, 'acknowledgement', 'pending', 0)").bind(crypto.randomUUID(), runId),
    env.DB.prepare("INSERT INTO outbox_jobs (id, case_id, run_id, kind, payload_json, status, attempt_count, available_at, created_at) VALUES (?, ?, ?, 'mock_ncrp_submit', ?, 'pending', 0, ?, ?)").bind(crypto.randomUUID(), input.caseId, runId, JSON.stringify({ submissionId }), now, now),
    env.DB.prepare("UPDATE cases SET status = 'submitted', acknowledgement = ?, submitted_at = ?, step = 5, revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(input.acknowledgement, now, now, input.caseId, input.sessionId),
  ]);
  await appendAudit(input.caseId, 'citizen', 'submission_snapshot_frozen', input.requestId, { evidenceCount: Array.isArray(input.payload.evidence) ? input.payload.evidence.length : 0, encrypted: true });
  console.info(JSON.stringify({ service: 'first30', requestId: input.requestId, operation: 'submission_snapshot', result: 'queued', durationMs: Date.now() - startedAt }));
  return { submissionId, runId, replay: false };
}

export async function processSubmissionWorkflow(input: { sessionId: string; caseId: string; requestId: string; gateway?: SubmissionGateway }) {
  const startedAt = Date.now();
  await ownedCase(input.sessionId, input.caseId);
  const job = await env.DB.prepare("SELECT o.*, w.status AS run_status FROM outbox_jobs o JOIN workflow_runs w ON w.id = o.run_id WHERE o.case_id = ? AND o.kind = 'mock_ncrp_submit' LIMIT 1").bind(input.caseId).first<Record<string, unknown>>();
  if (!job || job.status === 'delivered') return caseBundle(input.sessionId, input.caseId);
  const now = Date.now();
  const claim = await env.DB.prepare("UPDATE outbox_jobs SET status = 'processing', lease_until = ?, attempt_count = attempt_count + 1 WHERE id = ? AND (status = 'pending' OR (status = 'processing' AND lease_until < ?))").bind(now + 30_000, job.id, now).run();
  if (!claim.meta.changes) return caseBundle(input.sessionId, input.caseId);
  await env.DB.batch([
    env.DB.prepare("UPDATE workflow_runs SET status = 'processing', current_step = 'mock_dispatch', attempt_count = attempt_count + 1, updated_at = ? WHERE id = ?").bind(now, job.run_id),
    env.DB.prepare("UPDATE workflow_steps SET status = 'processing', attempt_count = attempt_count + 1, started_at = COALESCE(started_at, ?) WHERE run_id = ? AND step_code = 'mock_dispatch'").bind(now, job.run_id),
  ]);
  try {
    const secure = await env.DB.prepare('SELECT s.ciphertext, s.iv FROM secure_submission_payloads s JOIN complaint_submissions c ON c.id = s.submission_id WHERE c.case_id = ?').bind(input.caseId).first<{ ciphertext: string; iv: string }>();
    const legacy = await env.DB.prepare('SELECT payload_json FROM complaint_submissions WHERE case_id = ?').bind(input.caseId).first<{ payload_json: string }>();
    const payload = secure ? await decryptPrivateJson<Record<string, unknown>>(secure.ciphertext, secure.iv) : JSON.parse(legacy?.payload_json || '{}') as Record<string, unknown>;
    const result = await (input.gateway || new MockNcrpGateway()).submit(payload);
    const requestRow = await env.DB.prepare('SELECT id FROM information_requests WHERE case_id = ? LIMIT 1').bind(input.caseId).first<{ id: string }>();
    const requestIdValue = requestRow?.id || crypto.randomUUID(); const completed = Date.now();
    const statements = [
      env.DB.prepare("UPDATE outbox_jobs SET status = 'delivered', lease_until = NULL, completed_at = ?, last_error_code = NULL WHERE id = ?").bind(completed, job.id),
      env.DB.prepare("UPDATE workflow_steps SET status = 'complete', completed_at = ? WHERE run_id = ? AND step_code = 'mock_dispatch'").bind(completed, job.run_id),
      env.DB.prepare("UPDATE workflow_steps SET status = 'complete', attempt_count = attempt_count + 1, started_at = ?, completed_at = ? WHERE run_id = ? AND step_code = 'acknowledgement'").bind(completed, completed, job.run_id),
      env.DB.prepare("UPDATE workflow_runs SET status = 'complete', current_step = 'complete', updated_at = ?, completed_at = ? WHERE id = ?").bind(completed, completed, job.run_id),
      env.DB.prepare("UPDATE complaint_submissions SET status = 'action_required', updated_at = ? WHERE case_id = ?").bind(completed, input.caseId),
      env.DB.prepare("UPDATE cases SET status = 'action_required', revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(completed, input.caseId, input.sessionId),
    ];
    if (!requestRow) statements.push(env.DB.prepare("INSERT INTO information_requests (id, case_id, status, prompt_en, prompt_hi, created_at) VALUES (?, ?, 'open', ?, ?, ?)").bind(requestIdValue, input.caseId, 'Mock review: upload a synthetic bank statement that shows the reported debit.', 'मॉक समीक्षा: रिपोर्ट किए गए डेबिट को दिखाने वाला काल्पनिक बैंक स्टेटमेंट अपलोड करें।', completed));
    await env.DB.batch(statements);
    const submission = await env.DB.prepare('SELECT acknowledgement FROM complaint_submissions WHERE case_id = ?').bind(input.caseId).first<{ acknowledgement: string }>();
    await addEvent(input.caseId, 'submitted', 'Demo report completed', 'डेमो रिपोर्ट पूरी हुई', `${submission?.acknowledgement || result.acknowledgement} was created inside FIRST30. Nothing was sent to an outside system.`, `${submission?.acknowledgement || result.acknowledgement} FIRST30 के भीतर बनाया गया। बाहर किसी सिस्टम को कुछ नहीं भेजा गया।`, completed);
    await addEvent(input.caseId, 'action_required', 'One more document is needed · Demo', 'एक और दस्तावेज़ चाहिए · डेमो', 'This demonstration asks you to add the sample bank statement.', 'यह डेमो आपसे नमूना बैंक स्टेटमेंट जोड़ने को कहता है।', completed + 1);
    await appendAudit(input.caseId, 'mock_ncrp', 'mock_submission_accepted', input.requestId, { responseCode: result.responseCode, attempts: Number(job.attempt_count || 0) + 1 });
    console.info(JSON.stringify({ service: 'first30', requestId: input.requestId, operation: 'mock_submission_process', result: 'complete', retryCount: Math.max(0, Number(job.attempt_count || 0)), durationMs: Date.now() - startedAt }));
  } catch (error) {
    const retryAt = Date.now() + 2_000;
    await env.DB.batch([
      env.DB.prepare("UPDATE outbox_jobs SET status = 'pending', available_at = ?, lease_until = NULL, last_error_code = 'MOCK_GATEWAY_TEMPORARY' WHERE id = ?").bind(retryAt, job.id),
      env.DB.prepare("UPDATE workflow_runs SET status = 'retrying', updated_at = ? WHERE id = ?").bind(Date.now(), job.run_id),
      env.DB.prepare("UPDATE workflow_steps SET status = 'retrying', last_error_code = 'MOCK_GATEWAY_TEMPORARY' WHERE run_id = ? AND step_code = 'mock_dispatch'").bind(job.run_id),
    ]);
    console.info(JSON.stringify({ service: 'first30', requestId: input.requestId, operation: 'mock_submission_process', result: 'retrying', errorCode: 'MOCK_GATEWAY_TEMPORARY', durationMs: Date.now() - startedAt }));
    throw error;
  }
  return caseBundle(input.sessionId, input.caseId);
}

export async function processingReceipt(sessionId: string, caseId: string) {
  const caseRow = await ownedCase(sessionId, caseId);
  const [run, steps, job, audit, evidence] = await Promise.all([
    env.DB.prepare('SELECT id, status, current_step, request_id, attempt_count, created_at, updated_at, completed_at FROM workflow_runs WHERE case_id = ?').bind(caseId).first<Record<string, unknown>>(),
    env.DB.prepare('SELECT step_code, status, attempt_count, last_error_code, started_at, completed_at FROM workflow_steps WHERE run_id = (SELECT id FROM workflow_runs WHERE case_id = ?) ORDER BY rowid').bind(caseId).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT status, attempt_count, last_error_code, created_at, completed_at FROM outbox_jobs WHERE case_id = ? LIMIT 1').bind(caseId).first<Record<string, unknown>>(),
    auditStatus(caseId),
    env.DB.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN i.sha256 IS NOT NULL AND i.confirmed_at IS NOT NULL THEN 1 ELSE 0 END) AS verified FROM evidence e LEFT JOIN evidence_integrity i ON i.evidence_id = e.id WHERE e.case_id = ?').bind(caseId).first<{ total: number; verified: number }>(),
  ]);
  return {
    requestId: run?.request_id || null, status: run?.status || (caseRow.submitted_at ? 'legacy_complete' : 'not_started'),
    snapshotFrozen: Boolean(caseRow.submitted_at), evidenceChecks: { verified: Number(evidence?.verified || 0), total: Number(evidence?.total || 0) },
    steps: steps.results || [], retries: Math.max(0, Number(job?.attempt_count || 0) - 1), audit,
    adapter: { name: 'Mock NCRP gateway', mode: 'mock', contactedExternalSystem: false },
    createdAt: run?.created_at || caseRow.submitted_at || null, completedAt: run?.completed_at || null,
  };
}
