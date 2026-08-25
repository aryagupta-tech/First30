import { env } from 'cloudflare:workers';
import { milestoneSchema } from '@/lib/contracts';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    const body = milestoneSchema.parse(await request.json()); const now = Date.now();
    await env.DB.prepare('INSERT INTO milestones (id, case_id, kind, reference, notes, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, body.kind, body.reference, body.notes, body.occurredAt, now).run();
    return json(await caseBundle(sessionId, id), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
