import { env } from 'cloudflare:workers';
import { addEvent, caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const row = await ownedCase(sessionId, id);
    if (row.status !== 'draft') return json(await caseBundle(sessionId, id));
    const body = await request.json().catch(() => ({})) as { consent?: boolean };
    if (!body.consent || !row.complaint_en) return json({ error: 'Review the complaint and confirm synthetic submission.' }, { status: 400 });
    const now = Date.now(); const acknowledgement = `F30-${new Date().getFullYear()}-${id.slice(0,8).toUpperCase()}`;
    await env.DB.batch([
      env.DB.prepare("UPDATE cases SET status = 'action_required', acknowledgement = ?, submitted_at = ?, updated_at = ? WHERE id = ? AND session_id = ?").bind(acknowledgement, now, now, id, sessionId),
      env.DB.prepare('INSERT OR IGNORE INTO transactions (id, case_id, amount, reference, bank, recipient, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(`txn-${id}`, id, row.amount, row.reference || 'Not provided', row.bank, row.recipient, row.occurred_at),
      env.DB.prepare('INSERT OR IGNORE INTO suspects (id, case_id, type, value) VALUES (?, ?, ?, ?)').bind(`suspect-${id}`, id, 'upi_id', row.recipient || 'Not provided'),
      env.DB.prepare("INSERT INTO information_requests (id, case_id, status, prompt_en, prompt_hi, created_at) VALUES (?, ?, 'open', ?, ?, ?)").bind(`request-${id}`, id, 'Add a synthetic bank statement showing the debit so the mock bank can confirm the transaction.', 'लेन-देन की पुष्टि के लिए राशि कटने वाला काल्पनिक बैंक स्टेटमेंट जोड़ें।', now + 2),
    ]);
    await addEvent(id, 'submitted', 'Report submitted', 'रिपोर्ट जमा हुई', `Acknowledgement ${acknowledgement} was created.`, `पावती ${acknowledgement} बनाई गई।`, now);
    await addEvent(id, 'bank_notified', 'Mock bank notified', 'काल्पनिक बैंक को सूचना', 'The transaction details were sent to the simulated coordination service.', 'लेन-देन का विवरण काल्पनिक समन्वय सेवा को भेजा गया।', now + 1);
    await addEvent(id, 'action_required', 'More evidence required', 'अधिक प्रमाण आवश्यक', 'Add the requested synthetic bank statement to continue.', 'आगे बढ़ने के लिए माँगा गया काल्पनिक बैंक स्टेटमेंट जोड़ें।', now + 2);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
