import { env } from 'cloudflare:workers';
import { addEvent, caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const row = await ownedCase(sessionId, id);
    if (row.status === 'funds_held' || row.status === 'partially_restored') return json(await caseBundle(sessionId, id));
    if (row.status !== 'action_required') return json({ error: 'This case has no open evidence request.' }, { status: 409 });
    const now = Date.now(); const evidenceId = `statement-${id}`;
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO evidence (id, case_id, kind, filename, mime_type, size, is_sample, created_at) VALUES (?, ?, ?, ?, ?, 0, 1, ?)').bind(evidenceId, id, 'bank_statement', 'sample-bank-statement.png', 'image/png', now),
      env.DB.prepare("UPDATE information_requests SET status = 'complete', evidence_id = ?, completed_at = ? WHERE case_id = ? AND status = 'open'").bind(evidenceId, now, id),
      env.DB.prepare("UPDATE cases SET status = 'funds_held', held_amount = 12000, updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
      env.DB.prepare("INSERT OR IGNORE INTO restorations (id, case_id, amount, status) VALUES (?, ?, 12000, 'available')").bind(`restore-${id}`, id),
    ]);
    await addEvent(id, 'evidence_received', 'Evidence received', 'प्रमाण प्राप्त हुआ', 'The synthetic bank statement was added to the case.', 'काल्पनिक बैंक स्टेटमेंट केस में जोड़ दिया गया।', now);
    await addEvent(id, 'funds_held', '₹12,000 marked as held', '₹12,000 होल्ड के रूप में दर्ज', 'The mock coordination service located part of the reported amount.', 'काल्पनिक समन्वय सेवा ने रिपोर्ट की गई राशि का कुछ हिस्सा खोज लिया।', now + 1);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
