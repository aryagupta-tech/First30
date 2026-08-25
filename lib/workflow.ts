import type { CaseStatus } from './contracts';

export type ReadinessLevel = 'incomplete' | 'review_needed' | 'ready';
export type ReadinessIssue = {
  code: string;
  severity: 'blocker' | 'warning';
  field?: string;
  messageEn: string;
  messageHi: string;
};

export type ReadinessInput = {
  amount: number;
  occurredAt?: string | null;
  reference?: string | null;
  bank?: string | null;
  recipient?: string | null;
  narrative?: string | null;
  evidence: Array<{ confirmed_at?: number | null; sha256?: string | null }>;
  contradictions?: string[];
};

export function evaluateReadiness(input: ReadinessInput) {
  const issues: ReadinessIssue[] = [];
  const unknown = (value?: string | null) => !value?.trim() || value.trim().toLowerCase() === 'unknown';

  if (!Number.isFinite(input.amount) || input.amount <= 0) issues.push({ code: 'amount', severity: 'blocker', field: 'amount', messageEn: 'Add the amount that left the account.', messageHi: 'खाते से गई राशि जोड़ें।' });
  if (!input.occurredAt) issues.push({ code: 'occurred_at', severity: 'blocker', field: 'occurredAt', messageEn: 'Add when the transaction happened.', messageHi: 'लेन-देन का समय जोड़ें।' });
  else if (Number.isNaN(Date.parse(input.occurredAt)) || Date.parse(input.occurredAt) > Date.now() + 60_000) issues.push({ code: 'invalid_time', severity: 'blocker', field: 'occurredAt', messageEn: 'Use a valid incident time that is not in the future.', messageHi: 'भविष्य का नहीं, सही घटना समय दर्ज करें।' });
  if (!input.narrative || input.narrative.trim().length < 30) issues.push({ code: 'narrative', severity: 'blocker', field: 'narrative', messageEn: 'Describe what happened in at least 30 characters.', messageHi: 'कम से कम 30 अक्षरों में घटना बताएँ।' });
  if (!input.evidence.length) issues.push({ code: 'evidence', severity: 'blocker', messageEn: 'Add at least one synthetic evidence image.', messageHi: 'कम से कम एक काल्पनिक प्रमाण तस्वीर जोड़ें।' });
  if (input.evidence.some((item) => !item.confirmed_at || !item.sha256)) issues.push({ code: 'unconfirmed_evidence', severity: 'blocker', messageEn: 'Confirm every evidence item after reviewing its extracted facts.', messageHi: 'निकाले गए तथ्यों की समीक्षा के बाद हर प्रमाण की पुष्टि करें।' });
  if (unknown(input.reference)) issues.push({ code: 'reference', severity: 'warning', field: 'reference', messageEn: 'Transaction reference is marked unknown.', messageHi: 'लेन-देन संदर्भ अज्ञात है।' });
  if (unknown(input.bank)) issues.push({ code: 'bank', severity: 'warning', field: 'bank', messageEn: 'Bank or wallet is marked unknown.', messageHi: 'बैंक या वॉलेट अज्ञात है।' });
  if (unknown(input.recipient)) issues.push({ code: 'recipient', severity: 'warning', field: 'recipient', messageEn: 'Recipient identifier is marked unknown.', messageHi: 'प्राप्तकर्ता पहचान अज्ञात है।' });
  for (const contradiction of input.contradictions || []) issues.push({ code: `contradiction_${issues.length}`, severity: 'warning', messageEn: contradiction, messageHi: contradiction });

  const blockers = issues.filter((issue) => issue.severity === 'blocker').length;
  const warnings = issues.length - blockers;
  const level: ReadinessLevel = blockers ? 'incomplete' : warnings ? 'review_needed' : 'ready';
  return { level, blockers, warnings, issues };
}

export function caseStatusFor(level: ReadinessLevel, wasExported = false): CaseStatus {
  if (wasExported && level !== 'incomplete') return 'exported';
  if (level === 'ready') return 'ready';
  if (level === 'review_needed') return 'review_needed';
  return 'draft';
}

export function isExportable(level: ReadinessLevel) {
  return level !== 'incomplete';
}
