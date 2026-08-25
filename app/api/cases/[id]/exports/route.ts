import { env } from 'cloudflare:workers';
import { manifestCoreSchema } from '@/lib/contracts';
import { caseBundle, caseFingerprint, ensureSchema, errorResponse, json, requireSession, signBundle } from '@/lib/server';
import { sha256Hex, stableJson } from '@/lib/response-file';
import { isExportable } from '@/lib/workflow';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema(); const sessionId = await requireSession(request); const { id } = await context.params;
    const core = manifestCoreSchema.parse(await request.json());
    if (core.caseId !== id) return json({ error: 'Manifest case does not match.' }, { status: 400 });
    const bundle = await caseBundle(sessionId, id);
    if (core.format === 'FIRST30-evidence-passport') {
      if (!bundle.evidence.length || bundle.evidence.some((item) => !item.confirmed_at)) return json({ error: 'Confirm at least one evidence item before exporting the passport.' }, { status: 409 });
    } else if (!isExportable(bundle.readiness.level)) return json({ error: 'Resolve the required response-file checks before exporting.', readiness: bundle.readiness }, { status: 409 });
    const fingerprint = await caseFingerprint(sessionId, id);
    if (core.caseFingerprint !== fingerprint) return json({ error: 'The case changed while the package was being built. Refresh and try again.' }, { status: 409 });
    const requiredPdf = core.format === 'FIRST30-evidence-passport' ? 'FIRST30-evidence-passport.pdf' : 'FIRST30-response-file.pdf';
    const requiredJson = core.format === 'FIRST30-evidence-passport' ? 'passport.json' : 'case.json';
    if (!core.files.some((file) => file.path === requiredPdf) || !core.files.some((file) => file.path === requiredJson)) return json({ error: 'The Evidence Passport PDF and structured JSON are required.' }, { status: 400 });
    if (new Set(core.files.map((file) => file.path)).size !== core.files.length) return json({ error: 'Every package file path must be unique.' }, { status: 400 });
    const evidenceFiles = core.files.filter((file) => file.evidenceId);
    if (evidenceFiles.length !== bundle.evidence.length) return json({ error: 'Every confirmed evidence item must be included.' }, { status: 400 });
    for (const evidence of bundle.evidence) {
      const file = evidenceFiles.find((item) => item.evidenceId === evidence.id);
      if (!file || file.sha256 !== evidence.sha256 || file.size !== Number(evidence.size)) return json({ error: 'An evidence checksum or size does not match the stored original.' }, { status: 409 });
    }
    const existing = await env.DB.prepare('SELECT manifest_json FROM case_exports WHERE case_id = ? AND content_fingerprint = ?').bind(id, fingerprint).first<{ manifest_json: string }>();
    if (existing) {
      const manifest = JSON.parse(existing.manifest_json) as { files?: unknown };
      if (stableJson(manifest.files) !== stableJson(core.files)) {
        return json({ error: 'This unchanged case produced different package bytes. Refresh the page and rebuild the Evidence Passport.' }, { status: 409 });
      }
      return json({ manifest, idempotent: true });
    }
    const latest = await env.DB.prepare('SELECT MAX(version) AS version FROM case_exports WHERE case_id = ?').bind(id).first<{ version: number | null }>();
    const version = Number(latest?.version || 0) + 1;
    const verificationCode = `F30-${id.slice(0, 6).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const unsigned = { ...core, packageVersion: version, verificationCode };
    const manifestHash = await sha256Hex(stableJson(unsigned));
    const signature = await signBundle(manifestHash);
    const manifest = { ...unsigned, manifestHash, signature };
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO case_exports (id, case_id, version, verification_code, content_fingerprint, manifest_hash, signature, manifest_json, file_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), id, version, verificationCode, fingerprint, manifestHash, signature, JSON.stringify(manifest), core.files.length, now),
      env.DB.prepare("UPDATE cases SET status = 'exported', acknowledgement = ?, submitted_at = COALESCE(submitted_at, ?), updated_at = ? WHERE id = ? AND session_id = ?")
        .bind(verificationCode, now, now, id, sessionId),
      env.DB.prepare('INSERT INTO custody_events (id, case_id, evidence_id, action, detail, created_at) VALUES (?, ?, NULL, ?, ?, ?)').bind(crypto.randomUUID(), id, 'exported', `Evidence Passport version ${version} signed as ${verificationCode}`, now),
    ]);
    return json({ manifest, idempotent: false }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
