import { ensureSchema, errorResponse, json } from '@/lib/server';
import { env } from 'cloudflare:workers';

export async function GET() {
  try {
    await ensureSchema();
    await env.DB.prepare('SELECT 1 AS ok').first();
    const schema = await env.DB.prepare('SELECT MAX(version) AS version FROM schema_migrations').first<{ version: number }>();
    return json({ status: 'ok', database: 'connected', schemaVersion: Number(schema?.version || 0), service: 'first30-reporting-engine' });
  } catch (error) { return errorResponse(error); }
}
