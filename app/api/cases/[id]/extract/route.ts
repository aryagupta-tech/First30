import { env } from 'cloudflare:workers';
import { extractEvidence, SAMPLE_EXTRACTION } from '@/lib/ai';
import { ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; await ownedCase(sessionId, id);
    const evidence = await env.DB.prepare("SELECT * FROM evidence WHERE case_id = ? AND kind = 'transaction_receipt' ORDER BY created_at DESC LIMIT 1").bind(id).first<Record<string, unknown>>();
    if (!evidence) return json({ error: 'Add transaction evidence first.' }, { status: 400 });
    const usage = await env.DB.prepare('SELECT ai_calls FROM demo_sessions WHERE id = ?').bind(sessionId).first<{ ai_calls: number }>();
    if ((usage?.ai_calls || 0) >= 10) return json({ error: 'AI demo limit reached. Continue with manual entry.' }, { status: 429 });
    let extraction = SAMPLE_EXTRACTION; let source = 'sample';
    if (!evidence.is_sample && evidence.object_key) {
      await env.DB.prepare('UPDATE demo_sessions SET ai_calls = ai_calls + 1 WHERE id = ?').bind(sessionId).run();
      const object = await env.FILES.get(String(evidence.object_key));
      const parsed = object ? await extractEvidence(await object.arrayBuffer(), String(evidence.mime_type)) : null;
      if (parsed) { extraction = parsed; source = 'openai'; } else source = 'manual_required';
    }
    if (source !== 'manual_required') {
      await env.DB.prepare('UPDATE evidence SET extracted_json = ? WHERE id = ?').bind(JSON.stringify(extraction), evidence.id).run();
      await env.DB.prepare('UPDATE cases SET amount = ?, occurred_at = ?, reference = ?, channel = ?, bank = ?, recipient = ?, step = 3, updated_at = ? WHERE id = ?')
        .bind(extraction.amount.value, extraction.occurredAt.value, extraction.reference.value, extraction.channel.value, extraction.bank.value, extraction.recipient.value, Date.now(), id).run();
    }
    return json({ extraction: source === 'manual_required' ? null : extraction, source });
  } catch (error) { return errorResponse(error); }
}
