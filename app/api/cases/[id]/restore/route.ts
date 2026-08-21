import { env } from 'cloudflare:workers';
import { addEvent, caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const row = await ownedCase(sessionId, id);
    if (row.status === 'partially_restored') return json(await caseBundle(sessionId, id));
    if (row.status !== 'funds_held') return json({ error: 'Restoration is not available yet.' }, { status: 409 });
    const body = await request.json().catch(() => ({})) as { consent?: boolean };
    if (!body.consent) return json({ error: 'Confirm the mock restoration.' }, { status: 400 });
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("UPDATE cases SET status = 'partially_restored', restored_amount = 12000, updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
      env.DB.prepare("UPDATE restorations SET status = 'complete', confirmed_at = ?, completed_at = ? WHERE case_id = ?").bind(now, now + 1, id),
    ]);
    await addEvent(id, 'restoration_confirmed', 'Restoration confirmed', 'वापसी की पुष्टि', 'Sunita confirmed the masked demo account ending in 4210.', 'सुनीता ने 4210 पर समाप्त होने वाले काल्पनिक खाते की पुष्टि की।', now);
    await addEvent(id, 'partially_restored', '₹12,000 partially restored', '₹12,000 आंशिक रूप से वापस', 'The simulated restoration is complete. ₹6,499 remains under review.', 'काल्पनिक वापसी पूरी हुई। ₹6,499 अभी समीक्षा में है।', now + 1);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
