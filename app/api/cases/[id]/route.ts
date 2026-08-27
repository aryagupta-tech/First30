import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

const patchSchema = z.object({
  step: z.number().int().min(1).max(5).optional(),
  fraudType: z.string().max(60).optional(), channel: z.enum(['upi','card','bank_transfer','wallet']).optional(),
  amount: z.number().int().min(0).max(10_000_000).optional(), occurredAt: z.string().max(80).optional(),
  reference: z.string().max(100).optional(), bank: z.string().max(100).optional(), recipient: z.string().max(160).optional(),
  narrativeInput: z.string().max(2000).optional(), complaintEn: z.string().max(2000).optional(),
}).strict();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; return json(await caseBundle(sessionId, id)); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params;
    await ownedCase(sessionId, id); const body = patchSchema.parse(await request.json());
    const columns: Record<string,string> = { step:'step',fraudType:'fraud_type',channel:'channel',amount:'amount',occurredAt:'occurred_at',reference:'reference',bank:'bank',recipient:'recipient',narrativeInput:'narrative_input',complaintEn:'complaint_en' };
    const pairs = Object.entries(body).filter(([,value]) => value !== undefined);
    if (pairs.length) {
      const sql = `UPDATE cases SET ${pairs.map(([key]) => `${columns[key]} = ?`).join(', ')}, status = 'review_needed', updated_at = ? WHERE id = ? AND session_id = ?`;
      await env.DB.prepare(sql).bind(...pairs.map(([,value]) => value), Date.now(), id, sessionId).run();
    }
    return json(await caseBundle(sessionId, id));
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: 'Please check the entered details.', issues: error.issues }, { status: 400 });
    return errorResponse(error);
  }
}
