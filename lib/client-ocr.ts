'use client';

import { SAMPLE_CALL_LOG_TEXT, SAMPLE_CHAT_TEXT, SAMPLE_OCR_TEXT, type EvidenceKind } from './contracts';
import { observationsFromText } from './evidence-passport';
import { sha256Hex } from './response-file';

type TextDetectorResult = { rawValue?: string };
type TextDetectorConstructor = new () => { detect(source: ImageBitmapSource): Promise<TextDetectorResult[]> };

export const SAMPLE_TEXT: Record<EvidenceKind, string> = { receipt: SAMPLE_OCR_TEXT, chat: SAMPLE_CHAT_TEXT, call_log: SAMPLE_CALL_LOG_TEXT };

export async function analyseEvidenceLocally(file: File, kind: EvidenceKind, sample = false) {
  let text = ''; let ocrMethod: 'browser_ocr' | 'bundled_sample' | 'manual' = 'manual';
  const TextDetector = (globalThis as typeof globalThis & { TextDetector?: TextDetectorConstructor }).TextDetector;
  if (TextDetector) {
    try {
      const bitmap = await createImageBitmap(file); const results = await new TextDetector().detect(bitmap); bitmap.close();
      text = results.map((item) => item.rawValue || '').filter(Boolean).join('\n');
      if (text.trim()) ocrMethod = 'browser_ocr';
    } catch { text = ''; }
  }
  if (!text && sample) { text = SAMPLE_TEXT[kind]; ocrMethod = 'bundled_sample'; }
  return { text, observations: observationsFromText(kind, text), ocrMethod, clientSha256: await sha256Hex(await file.arrayBuffer()) };
}

export function analyseManualText(kind: EvidenceKind, text: string) {
  return { text, observations: observationsFromText(kind, text), ocrMethod: 'manual' as const };
}

export async function createSampleEvidenceSet() {
  return Promise.all((['receipt', 'chat', 'call_log'] as EvidenceKind[]).map(async (kind) => ({ kind, file: await createSampleImage(kind) })));
}

async function createSampleImage(kind: EvidenceKind) {
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1180;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not prepare synthetic evidence.');
  ctx.fillStyle = kind === 'chat' ? '#e9f4ee' : '#fffefa'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#14273d'; ctx.font = '800 38px system-ui'; ctx.fillText(kind === 'receipt' ? 'Bharat Cooperative Bank' : kind === 'chat' ? 'Scam conversation' : 'Recent calls', 72, 100);
  ctx.fillStyle = kind === 'receipt' ? '#15735b' : '#df5b34'; ctx.font = '800 25px system-ui'; ctx.fillText(kind === 'receipt' ? 'PAYMENT SUCCESSFUL' : kind === 'chat' ? 'WHATSAPP · SYNTHETIC' : 'CALL LOG · SYNTHETIC', 72, 160);
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
