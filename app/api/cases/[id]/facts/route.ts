import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { factResolutionSchema } from '@/lib/contracts';
import { normalizeFact } from '@/lib/evidence-passport';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession, syncPassportFindings } from '@/lib/server';

const bodySchema = z.object({ facts: z.array(factResolutionSchema).max(6) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    const { facts } = bodySchema.parse(await request.json());
    if (new Set(facts.map((item) => item.field)).size !== facts.length) return json({ error: 'Each fact can be resolved only once.' }, { status: 400 });
    for (const fact of facts) {
      if (fact.resolutionType === 'evidence') {
        if (!fact.sourceEvidenceId) return json({ error: `Choose supporting evidence for ${fact.field}.` }, { status: 400 });
        const support = await env.DB.prepare('SELECT 1 AS ok FROM evidence_observations WHERE case_id = ? AND evidence_id = ? AND field = ? AND normalized_value = ?').bind(id, fact.sourceEvidenceId, fact.field, normalizeFact(fact.field, fact.value)).first();
        if (!support) return json({ error: `${fact.field} is not supported by the selected evidence.` }, { status: 409 });
      }
    }
    const now = Date.now();
    const inserts = facts.map((fact) => env.DB.prepare('INSERT INTO fact_resolutions (id, case_id, field, value, normalized_value, resolution_type, source_evidence_id, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, fact.field, fact.resolutionType === 'unknown' ? 'Unknown' : fact.value, normalizeFact(fact.field, fact.resolutionType === 'unknown' ? 'Unknown' : fact.value), fact.resolutionType, fact.sourceEvidenceId || null, now));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM fact_resolutions WHERE case_id = ?').bind(id), ...inserts,
      env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, NULL, ?, ?, ?)').bind(crypto.randomUUID(), id, 'facts_resolved', `${facts.length} canonical facts confirmed`, now),
      env.DB.prepare("UPDATE cases SET status = 'review_needed', updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    const values = new Map(facts.map((item) => [item.field, item.resolutionType === 'unknown' ? 'Unknown' : item.value]));
    const numericAmount = Number(values.get('amount') || 0);
    await env.DB.prepare('UPDATE cases SET amount = ?, reference = ?, recipient = ?, bank = ?, occurred_at = ?, updated_at = ? WHERE id = ? AND session_id = ?')
      .bind(Number.isFinite(numericAmount) ? Math.round(numericAmount) : 0, values.get('reference') || 'Unknown', values.get('recipient') || 'Unknown', values.get('institution') || 'Unknown', values.get('occurred_at') || '', now, id, sessionId).run();
    await syncPassportFindings(id);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
