import { env } from 'cloudflare:workers';
import { ZodError } from 'zod';
import { verificationRequestSchema } from '@/lib/contracts';
import { ensureSchema, errorResponse, json, verifyBundleSignature } from '@/lib/server';

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { verificationCode, manifestHash, signature } = verificationRequestSchema.parse(await request.json());
    const row = await env.DB.prepare('SELECT version, file_count, created_at, manifest_hash, signature FROM case_exports WHERE verification_code = ?').bind(verificationCode).first<{ version: number; file_count: number; created_at: number; manifest_hash: string; signature: string }>();
    if (!row) return json({ status: 'unknown' });
    if (manifestHash !== row.manifest_hash || signature !== row.signature || !await verifyBundleSignature(manifestHash, signature)) return json({ status: 'altered' });
    return json({ status: 'valid', createdAt: row.created_at, version: row.version, fileCount: row.file_count });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) return json({ status: 'altered' });
    return errorResponse(error);
  }
}
