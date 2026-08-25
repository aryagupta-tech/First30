import { env } from 'cloudflare:workers';
import { complainantProfileSchema } from '@/lib/contracts';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const caseRow = await ownedCase(sessionId, id);
    if (caseRow.submitted_at) return json({ error: 'The submitted snapshot is immutable. Start a new synthetic report to change the profile.' }, { status: 409 });
    const value = complainantProfileSchema.parse(await request.json()); const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO complainant_profiles (case_id, full_name, mobile, gender, date_of_birth, relation_name, address, state, district, police_station, pincode, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET full_name = excluded.full_name, mobile = excluded.mobile, gender = excluded.gender, date_of_birth = excluded.date_of_birth, relation_name = excluded.relation_name, address = excluded.address, state = excluded.state, district = excluded.district, police_station = excluded.police_station, pincode = excluded.pincode, updated_at = excluded.updated_at")
        .bind(id, value.fullName, value.mobile, value.gender, value.dateOfBirth, value.relationName, value.address, value.state, value.district, value.policeStation, value.pincode, now),
      env.DB.prepare("UPDATE cases SET step = 4, status = 'ready_to_submit', updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
