import { ensureSchema, errorResponse, json } from '@/lib/server';
import { env } from 'cloudflare:workers';

export async function GET() {
  try {
    await ensureSchema();
    await env.DB.prepare('SELECT 1 AS ok').first();
    return json({ status: 'ok', database: 'connected' });
  } catch (error) { return errorResponse(error); }
}
