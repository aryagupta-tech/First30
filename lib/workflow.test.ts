import { describe, expect, it } from 'vitest';
import { COPY, SAMPLE_OCR_TEXT, extractionSchema, manifestCoreSchema } from './contracts';
import { detectImageMime, findContradictions, parseReceiptText, sha256Hex, stableJson } from './response-file';
import { caseStatusFor, evaluateReadiness, isExportable } from './workflow';

describe('local receipt processing', () => {
  it('extracts the judged sample without an external service', () => {
    const parsed = extractionSchema.parse(parseReceiptText(SAMPLE_OCR_TEXT));
    expect(parsed.amount.value).toBe(18_499);
    expect(parsed.reference.value).toBe('UTR826194730521');
    expect(parsed.channel.value).toBe('upi');
    expect(parsed.recipient.value).toBe('verify.kyc@fakeupi');
    expect(parsed.occurredAt.value).toBe('2026-08-21T18:42');
  });

  it('surfaces differences instead of silently overwriting confirmed facts', () => {
    const parsed = parseReceiptText(SAMPLE_OCR_TEXT);
    expect(findContradictions(parsed, { amount: 18_000, reference: 'OTHER123456' })).toHaveLength(2);
  });

  it('checks image bytes instead of trusting an upload MIME label', () => {
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageMime(new TextEncoder().encode('not an image'))).toBeNull();
  });
});

describe('response-file readiness', () => {
  const ready = { amount: 18_499, occurredAt: '2026-08-21T18:42', reference: 'UTR826194730521', bank: 'Bharat Cooperative Bank', recipient: 'verify.kyc@fakeupi', narrative: 'A sufficiently detailed citizen statement about the reported fraud.', evidence: [{ sha256: 'a'.repeat(64), confirmed_at: 1 }] };

  it('requires evidence and citizen confirmation', () => {
    expect(evaluateReadiness({ ...ready, evidence: [] }).level).toBe('incomplete');
    expect(evaluateReadiness({ ...ready, evidence: [{ sha256: 'a'.repeat(64), confirmed_at: null }] }).blockers).toBe(1);
  });

  it('allows explicit unknown values with visible warnings', () => {
    const result = evaluateReadiness({ ...ready, bank: 'Unknown', recipient: 'Unknown' });
    expect(result.level).toBe('review_needed');
    expect(result.warnings).toBe(2);
    expect(isExportable(result.level)).toBe(true);
    expect(caseStatusFor(result.level)).toBe('review_needed');
  });
});

describe('verifiable package contracts', () => {
  it('uses deterministic canonical JSON and SHA-256', async () => {
    expect(stableJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(await sha256Hex('FIRST30')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects incomplete or malformed manifests', () => {
    expect(() => manifestCoreSchema.parse({ format: 'FIRST30-response-file', formatVersion: 1, caseId: crypto.randomUUID(), createdAt: Date.now(), caseFingerprint: 'a'.repeat(64), files: [] })).toThrow();
  });

  it('keeps essential interface strings bilingual', () => {
    expect(Object.keys(COPY.en)).toEqual(Object.keys(COPY.hi));
    expect(COPY.hi.brandLine).toMatch(/[\u0900-\u097F]/);
  });
});
