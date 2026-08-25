import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { chronologySchema } from '@/lib/contracts';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

const bodySchema = z.object({ events: z.array(chronologySchema).max(30) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    const body = bodySchema.parse(await request.json()); const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM incident_events WHERE case_id = ?').bind(id),
      ...body.events.map((event, index) => env.DB.prepare('INSERT INTO incident_events (id, case_id, occurred_at, event_type, description_en, description_hi, source, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), id, event.occurredAt, event.eventType, event.descriptionEn, event.descriptionHi || '', event.source, index)),
      env.DB.prepare("UPDATE cases SET status = 'review_needed', updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
