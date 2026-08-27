import { env } from 'cloudflare:workers';
import { complainantProfileSchema } from '@/lib/contracts';
import { caseBundle, ensureSchema, errorResponse, json, ownedCase, requireSession } from '@/lib/server';
import { appendAudit, assertCaseRevision, encryptPrivateJson, requestId } from '@/lib/reliability';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params; const caseRow = await ownedCase(sessionId, id); assertCaseRevision(request, caseRow);
    if (caseRow.submitted_at) return json({ error: 'This demo report is already finished and cannot be edited. Start a new report to change personal details.' }, { status: 409 });
    const value = complainantProfileSchema.parse(await request.json()); const now = Date.now(); const encrypted = await encryptPrivateJson({ full_name: value.fullName, mobile: value.mobile, gender: value.gender, date_of_birth: value.dateOfBirth, relation_name: value.relationName, address: value.address, state: value.state, district: value.district, police_station: value.policeStation, pincode: value.pincode, updated_at: now });
    await env.DB.batch([
      env.DB.prepare("INSERT INTO complainant_profiles (case_id, full_name, mobile, gender, date_of_birth, relation_name, address, state, district, police_station, pincode, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET full_name = excluded.full_name, mobile = excluded.mobile, gender = excluded.gender, date_of_birth = excluded.date_of_birth, relation_name = excluded.relation_name, address = excluded.address, state = excluded.state, district = excluded.district, police_station = excluded.police_station, pincode = excluded.pincode, updated_at = excluded.updated_at")
        .bind(id, '[encrypted]', '[encrypted]', 'encrypted', '[encrypted]', '[encrypted]', '[encrypted]', '[encrypted]', '[encrypted]', '[encrypted]', '000000', now),
      env.DB.prepare('INSERT INTO secure_profiles (case_id, ciphertext, iv, key_version, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET ciphertext = excluded.ciphertext, iv = excluded.iv, key_version = excluded.key_version, updated_at = excluded.updated_at').bind(id, encrypted.ciphertext, encrypted.iv, encrypted.keyVersion, now),
      env.DB.prepare("UPDATE cases SET step = 4, status = 'ready_to_submit', revision = revision + 1, updated_at = ? WHERE id = ? AND session_id = ?").bind(now, id, sessionId),
    ]);
    await appendAudit(id, 'citizen', 'profile_saved_encrypted', requestId(request), { encrypted: true });
    return json(await caseBundle(sessionId, id));
  } catch (error) { return errorResponse(error); }
}
