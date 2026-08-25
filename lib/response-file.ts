import type { EvidenceExtraction, FraudChannel } from './contracts';

const emptyField = (): { value: null; confidence: number } => ({ value: null, confidence: 0 });

export function parseReceiptText(text: string): EvidenceExtraction {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  const amountMatch = normalized.match(/(?:₹|INR|Rs\.?)[ \t]*([0-9][0-9,]*(?:\.\d{1,2})?)/i)
    || normalized.match(/(?:amount|paid|debited)[^0-9]{0,16}([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  const referenceMatch = normalized.match(/\b(?:UTR|transaction(?:\s+id)?|reference|ref(?:erence)?\s*no)\s*[:#-]?\s*([A-Z0-9-]{8,})\b/i);
  const upiMatch = normalized.match(/\b[a-z0-9._-]{2,}@[a-z][a-z0-9.-]{1,}\b/i);
  const dateMatch = normalized.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})[ ,T]+(\d{1,2}):(\d{2})\b/)
    || normalized.match(/\b(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})\b/);
  const bankMatch = normalized.match(/^([^\n]{3,80}\b(?:Bank|Wallet))\b/im);
  const lower = normalized.toLowerCase();
  const channel: FraudChannel | null = lower.includes('upi') || upiMatch ? 'upi'
    : lower.includes('wallet') ? 'wallet'
      : lower.includes('card') ? 'card'
        : lower.includes('bank transfer') || lower.includes('neft') || lower.includes('imps') || lower.includes('rtgs') ? 'bank_transfer' : null;

  let occurredAt: string | null = null;
  if (dateMatch) {
    if (dateMatch[1].length === 4) occurredAt = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${dateMatch[4].padStart(2, '0')}:${dateMatch[5]}`;
    else occurredAt = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}T${dateMatch[4].padStart(2, '0')}:${dateMatch[5]}`;
  }

  return {
    amount: amountMatch ? { value: Math.round(Number(amountMatch[1].replace(/,/g, ''))), confidence: 0.94 } : emptyField(),
    occurredAt: occurredAt ? { value: occurredAt, confidence: 0.88 } : emptyField(),
    reference: referenceMatch ? { value: referenceMatch[1].toUpperCase(), confidence: 0.93 } : emptyField(),
    channel: channel ? { value: channel, confidence: 0.9 } : emptyField(),
    bank: bankMatch ? { value: bankMatch[1].trim(), confidence: 0.82 } : emptyField(),
    recipient: upiMatch ? { value: upiMatch[0], confidence: 0.92 } : emptyField(),
  };
}

export function findContradictions(extraction: EvidenceExtraction | null, fields: Record<string, unknown>) {
  if (!extraction) return [];
  const contradictions: string[] = [];
  if (extraction.amount.value && Number(fields.amount) > 0 && Number(extraction.amount.value) !== Number(fields.amount)) contradictions.push(`Evidence shows ₹${Number(extraction.amount.value).toLocaleString('en-IN')}, but the confirmed amount is ₹${Number(fields.amount).toLocaleString('en-IN')}.`);
  if (extraction.reference.value && fields.reference && String(fields.reference).toLowerCase() !== 'unknown' && String(extraction.reference.value).toUpperCase() !== String(fields.reference).toUpperCase()) contradictions.push('The evidence reference differs from the confirmed transaction reference.');
  return contradictions;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}

export async function sha256Hex(input: ArrayBuffer | Uint8Array | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input);
  const owned = new Uint8Array(bytes.byteLength); owned.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', owned.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function detectImageMime(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && new TextDecoder('ascii').decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder('ascii').decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export function buildComplaint(fields: Record<string, unknown>) {
  const value = (key: string, fallback: string) => String(fields[key] || fallback);
  const amount = Number(fields.amount || 0);
  const confirmed = `amount ₹${amount.toLocaleString('en-IN')}; channel ${value('channel', 'unknown')}; reference ${value('reference', 'unknown')}; bank or wallet ${value('bank', 'unknown')}; recipient ${value('recipient', 'unknown')}; transaction time ${value('occurredAt', 'unknown')}`;
  return {
    complaintEn: `Citizen statement: ${value('narrative', 'Not provided')}\n\nConfirmed transaction details: ${confirmed}. I am preserving the available evidence and request review of this reported transaction. Details marked “unknown” were not available to the citizen.`,
    complaintHi: `नागरिक का मूल विवरण (अंग्रेज़ी में): ${value('narrative', 'उपलब्ध नहीं')}\n\nपुष्टि किए गए लेन-देन विवरण: राशि ₹${amount.toLocaleString('en-IN')}; माध्यम ${value('channel', 'अज्ञात')}; संदर्भ ${value('reference', 'अज्ञात')}; बैंक या वॉलेट ${value('bank', 'अज्ञात')}; प्राप्तकर्ता ${value('recipient', 'अज्ञात')}; समय ${value('occurredAt', 'अज्ञात')}। मैं उपलब्ध प्रमाण सुरक्षित कर रही हूँ और इस रिपोर्ट किए गए लेन-देन की समीक्षा का अनुरोध करती हूँ। “अज्ञात” विवरण उपलब्ध नहीं थे।`,
  };
}

export function channelDisputeCopy(channel: string, bank: string) {
  const channelLabel: Record<string, string> = { upi: 'UPI transaction', card: 'card transaction', bank_transfer: 'bank transfer', wallet: 'wallet transaction' };
  return `To the Fraud and Disputes Team at ${bank || 'the relevant institution'}: I dispute the reported ${channelLabel[channel] || 'financial transaction'} described in this response file. Please record the notification, preserve relevant transaction records and provide an acknowledgement number. FIRST30 has prepared this document but has not submitted it on my behalf.`;
}

export function callScript(fields: Record<string, unknown>) {
  return `I am reporting a suspected financial cyber-fraud loss of ₹${Number(fields.amount || 0).toLocaleString('en-IN')} through ${String(fields.channel || 'an unknown channel').replace('_', ' ')}. The transaction reference is ${String(fields.reference || 'unknown')}. It happened at ${String(fields.occurredAt || 'an unknown time')}. I have preserved the receipt and a structured incident chronology. Please provide an acknowledgement or reference number.`;
}
