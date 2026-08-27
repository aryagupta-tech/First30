'use client';

type ApiErrorBody = { error?: string; code?: string; retryable?: boolean; fieldErrors?: Record<string, string> };
type SaveState = 'idle' | 'saving' | 'saved' | 'retrying' | 'offline';

let csrf = '';
const revisions = new Map<string, number>();
const listeners = new Set<(state: SaveState) => void>();

export function setSessionSecurity(token?: string | null) { csrf = token || ''; }
export function onSaveState(listener: (state: SaveState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function emit(state: SaveState) { listeners.forEach((listener) => listener(state)); }

export class ApiFailure extends Error {
  code: string; retryable: boolean; fieldErrors?: Record<string, string>;
  constructor(body: ApiErrorBody) { super(body.error || 'Please try again.'); this.code = body.code || 'REQUEST_FAILED'; this.retryable = Boolean(body.retryable); this.fieldErrors = body.fieldErrors; }
}

export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase(); const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers = new Headers(init.headers); const caseId = url.match(/\/api\/cases\/([^/]+)/)?.[1];
  if (mutating) {
    if (csrf) headers.set('x-f30-csrf', csrf);
    if (!headers.has('idempotency-key')) headers.set('idempotency-key', crypto.randomUUID());
    if (caseId && revisions.has(caseId)) headers.set('if-match', `"rev-${revisions.get(caseId)}"`);
    emit('saving');
  }
  const requestInit = { ...init, headers };
  let response: Response;
  try { response = await fetch(url, requestInit); }
  catch (error) {
    if (!mutating) throw error;
    emit('retrying');
    await new Promise((resolve) => setTimeout(resolve, 450));
    try { response = await fetch(url, requestInit); } catch (retryError) { emit('offline'); throw retryError; }
  }
  const data = await response.json() as T & ApiErrorBody & { meta?: { caseRevision?: number } } & { case?: { id?: string; revision?: number } } & { bundle?: { case?: { id?: string; revision?: number }; meta?: { caseRevision?: number } } };
  const revision = Number(data.meta?.caseRevision || data.case?.revision || 0);
  const responseCaseId = caseId || String(data.case?.id || data.bundle?.case?.id || '');
  const responseRevision = revision || Number(data.bundle?.meta?.caseRevision || data.bundle?.case?.revision || 0);
  if (responseCaseId && responseRevision > 0) revisions.set(responseCaseId, responseRevision);
  if (!response.ok) {
    if (caseId && data.code === 'CASE_CHANGED') {
      try {
        const latestResponse = await fetch(`/api/cases/${caseId}`, { headers: { accept: 'application/json' } });
        const latest = await latestResponse.json() as { meta?: { caseRevision?: number } };
        if (latest.meta?.caseRevision) revisions.set(caseId, latest.meta.caseRevision);
      } catch { /* the next explicit retry will refresh safely */ }
    }
    emit('idle'); throw new ApiFailure(data);
  }
  if (mutating) emit('saved');
  return data;
}
