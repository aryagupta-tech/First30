'use client';

import { SAMPLE_OCR_TEXT } from './contracts';
import { parseReceiptText } from './response-file';

type TextDetectorResult = { rawValue?: string };
type TextDetectorConstructor = new () => { detect(source: ImageBitmapSource): Promise<TextDetectorResult[]> };

export async function readReceiptLocally(file: File, sample = false) {
  let text = '';
  let engine: 'browser_ocr' | 'bundled_sample' | 'manual' = 'manual';
  const TextDetector = (globalThis as typeof globalThis & { TextDetector?: TextDetectorConstructor }).TextDetector;
  if (TextDetector) {
    try {
      const bitmap = await createImageBitmap(file);
      const results = await new TextDetector().detect(bitmap);
      bitmap.close();
      text = results.map((item) => item.rawValue || '').filter(Boolean).join('\n');
      if (text.trim()) engine = 'browser_ocr';
    } catch { text = ''; }
  }
  if (!text && sample) { text = SAMPLE_OCR_TEXT; engine = 'bundled_sample'; }
  return { text, extraction: parseReceiptText(text), engine };
}

export async function createSampleReceiptFile() {
  const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1180;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the sample receipt.');
  ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#14273d'; ctx.font = '700 38px system-ui'; ctx.fillText('Bharat Cooperative Bank', 72, 100);
  ctx.fillStyle = '#15735b'; ctx.font = '800 34px system-ui'; ctx.fillText('PAYMENT SUCCESSFUL', 72, 175);
  ctx.strokeStyle = '#dce1df'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(72, 215); ctx.lineTo(828, 215); ctx.stroke();
  const lines = [
    ['Amount', '₹18,499.00'], ['Payment method', 'UPI'], ['UTR', 'UTR826194730521'],
    ['To', 'verify.kyc@fakeupi'], ['Date', '21/08/2026 18:42'], ['Status', 'Debited'],
  ];
  lines.forEach(([label, value], index) => {
    const y = 310 + index * 112;
    ctx.fillStyle = '#667482'; ctx.font = '500 25px system-ui'; ctx.fillText(label, 72, y);
    ctx.fillStyle = '#14273d'; ctx.font = index === 0 ? '800 43px system-ui' : '700 29px system-ui'; ctx.fillText(value, 72, y + 46);
  });
  ctx.fillStyle = '#eaf0f5'; ctx.fillRect(72, 1010, 756, 78);
  ctx.fillStyle = '#536474'; ctx.font = '600 22px system-ui'; ctx.fillText('Synthetic FIRST30 demonstration evidence', 102, 1059);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not create sample evidence.')), 'image/png'));
  return new File([blob], 'sample-upi-receipt.png', { type: 'image/png' });
}
