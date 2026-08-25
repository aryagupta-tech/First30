'use client';

import type { Worker as TesseractWorker } from 'tesseract.js';
import { SAMPLE_BANK_STATEMENT_TEXT, SAMPLE_CALL_LOG_TEXT, SAMPLE_CHAT_TEXT, SAMPLE_OCR_TEXT, type EvidenceKind } from './contracts';
import { observationsFromText } from './evidence-passport';
import { sha256Hex } from './response-file';

export type OcrMethod = 'tesseract_local' | 'bundled_sample' | 'manual';
export type OcrProgress = { progress: number; status: string };
export type LocalAnalysisOptions = { sample?: boolean; signal?: AbortSignal; onProgress?: (value: OcrProgress) => void };

export const SAMPLE_TEXT: Record<EvidenceKind, string> = {
  receipt: SAMPLE_OCR_TEXT,
  chat: SAMPLE_CHAT_TEXT,
  call_log: SAMPLE_CALL_LOG_TEXT,
  bank_statement: SAMPLE_BANK_STATEMENT_TEXT,
};

let workerPromise: Promise<TesseractWorker> | null = null;
let progressSink: ((value: OcrProgress) => void) | null = null;

async function localWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker, OEM }) => createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr/lang',
      logger: (message) => progressSink?.({ progress: Math.max(0, Math.min(1, message.progress || 0)), status: message.status || 'Reading image' }),
    })).catch((error) => { workerPromise = null; throw error; });
  }
  return workerPromise;
}

export async function stopLocalOcr() {
  const current = workerPromise; workerPromise = null; progressSink = null;
  if (current) { try { await (await current).terminate(); } catch { /* Worker may already be closed. */ } }
}

export async function analyseEvidenceLocally(file: File, kind: EvidenceKind, options: LocalAnalysisOptions = {}) {
  const digestPromise = sha256Hex(await file.arrayBuffer());
  const abort = () => { void stopLocalOcr(); };
  if (options.signal?.aborted) throw abortError();
  options.signal?.addEventListener('abort', abort, { once: true });
  progressSink = options.onProgress || null;

  let text = ''; let ocrMethod: OcrMethod = 'manual'; let notice = '';
  try {
    const worker = await localWorker();
    if (options.signal?.aborted) throw abortError();
    const result = await worker.recognize(file, { rotateAuto: true });
    if (options.signal?.aborted) throw abortError();
    text = result.data.text.trim();
    ocrMethod = text ? 'tesseract_local' : 'manual';
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw abortError();
    notice = 'The local reader could not read this image. Type the visible text manually.';
  } finally {
    options.signal?.removeEventListener('abort', abort); progressSink = null;
  }

  let observations = observationsFromText(kind, text);
  if (options.sample && !sampleIsComplete(kind, observations.map((item) => item.field))) {
    text = SAMPLE_TEXT[kind]; observations = observationsFromText(kind, text); ocrMethod = 'bundled_sample';
    notice = 'The deterministic demo text was used because local OCR missed a required sample fact.';
  }
  if (!text) ocrMethod = 'manual';
  return { text, observations, ocrMethod, clientSha256: await digestPromise, notice };
}

export function analyseManualText(kind: EvidenceKind, text: string) {
  return { text, observations: observationsFromText(kind, text), ocrMethod: 'manual' as const, notice: 'Source text was entered manually by the citizen.' };
}

export async function createSampleEvidenceSet() {
  return Promise.all((['receipt', 'chat', 'call_log'] as EvidenceKind[]).map(async (kind) => ({ kind, file: await createSampleImage(kind) })));
}

export async function createSampleBankStatement() {
  return createSampleImage('bank_statement');
}

function sampleIsComplete(kind: EvidenceKind, fields: string[]) {
  const required: Record<EvidenceKind, string[]> = {
    receipt: ['amount', 'reference', 'recipient', 'institution', 'occurred_at'],
    chat: ['amount', 'recipient', 'phone', 'occurred_at'],
    call_log: ['phone', 'occurred_at'],
    bank_statement: ['amount', 'reference', 'recipient', 'institution', 'occurred_at'],
  };
  return required[kind].every((field) => fields.includes(field));
}

function abortError() { return new DOMException('Local evidence reading was cancelled.', 'AbortError'); }

async function createSampleImage(kind: EvidenceKind) {
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1180;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not prepare synthetic evidence.');
  ctx.fillStyle = kind === 'chat' ? '#e9f4ee' : '#fffefa'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const headings: Record<EvidenceKind, string> = { receipt: 'Bharat Cooperative Bank', chat: 'Scam conversation', call_log: 'Recent calls', bank_statement: 'Synthetic bank statement' };
  ctx.fillStyle = '#14273d'; ctx.font = '800 38px system-ui'; ctx.fillText(headings[kind], 72, 100);
  ctx.fillStyle = kind === 'receipt' || kind === 'bank_statement' ? '#15735b' : '#df5b34'; ctx.font = '800 25px system-ui';
  ctx.fillText(kind === 'receipt' ? 'PAYMENT SUCCESSFUL' : kind === 'chat' ? 'WHATSAPP · SYNTHETIC' : kind === 'call_log' ? 'CALL LOG · SYNTHETIC' : 'BANK RECORD · SYNTHETIC', 72, 160);
  ctx.strokeStyle = '#dce1df'; ctx.beginPath(); ctx.moveTo(72, 205); ctx.lineTo(828, 205); ctx.stroke();
  const lines = SAMPLE_TEXT[kind].split('\n').slice(kind === 'receipt' ? 1 : 0); let y = 280;
  for (const line of lines) {
    const wrapped = wrapCanvas(ctx, line, 740); ctx.fillStyle = '#14273d'; ctx.font = '650 26px system-ui';
    for (const part of wrapped) { ctx.fillText(part, 80, y); y += 43; }
    y += kind === 'chat' ? 28 : 19;
  }
  ctx.fillStyle = '#e4eaed'; ctx.fillRect(72, 1030, 756, 74); ctx.fillStyle = '#536474'; ctx.font = '650 21px system-ui'; ctx.fillText('Synthetic FIRST30 demonstration evidence', 105, 1076);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not create sample evidence.')), 'image/png'));
  return new File([blob], `sample-${kind.replace('_', '-')}.png`, { type: 'image/png' });
}

function wrapCanvas(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let line = '';
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next; }
  if (line) lines.push(line); return lines;
}
