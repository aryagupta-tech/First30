import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { COPY, SAMPLE_CALL_LOG_TEXT, SAMPLE_CHAT_TEXT, SAMPLE_OCR_TEXT, extractionSchema, manifestCoreSchema } from './contracts';
import { derivePassport, normalizeFact, observationsFromText } from './evidence-passport';
import { detectImageMime, findContradictions, parseReceiptText, sha256Hex, stableJson } from './response-file';
import { caseStatusFor, evaluateReadiness, isExportable } from './workflow';
import { verifyArchiveLocally } from './package-verification';

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

describe('Evidence Passport analysis', () => {
  it('extracts source-linked observations from all three evidence types', () => {
    expect(observationsFromText('receipt', SAMPLE_OCR_TEXT).some((item) => item.field === 'reference' && item.value === 'UTR826194730521')).toBe(true);
    expect(observationsFromText('chat', SAMPLE_CHAT_TEXT).some((item) => item.field === 'phone' && item.normalizedValue === '9876543210')).toBe(true);
    expect(observationsFromText('call_log', SAMPLE_CALL_LOG_TEXT).some((item) => item.field === 'occurred_at')).toBe(true);
  });

  it('normalizes phone, recipient and reference values deterministically', () => {
    expect(normalizeFact('phone', '+91 98765 43210')).toBe('9876543210');
    expect(normalizeFact('recipient', 'Verify.KYC@FakeUPI')).toBe('verify.kyc@fakeupi');
    expect(normalizeFact('reference', 'utr 826194730521')).toBe('UTR826194730521');
  });

  it('exposes the deliberate amount conflict while passing phone and recipient checks', () => {
    const evidence = [{ id: 'receipt', kind: 'receipt', filename: 'receipt.png' }, { id: 'chat', kind: 'chat', filename: 'chat.png' }, { id: 'call', kind: 'call_log', filename: 'call.png' }];
    const source = [
      ...observationsFromText('receipt', SAMPLE_OCR_TEXT).map((item) => ({ ...item, evidenceId: 'receipt', evidenceKind: 'receipt', filename: 'receipt.png' })),
      ...observationsFromText('chat', SAMPLE_CHAT_TEXT).map((item) => ({ ...item, evidenceId: 'chat', evidenceKind: 'chat', filename: 'chat.png' })),
      ...observationsFromText('call_log', SAMPLE_CALL_LOG_TEXT).map((item) => ({ ...item, evidenceId: 'call', evidenceKind: 'call_log', filename: 'call.png' })),
    ];
    const result = derivePassport(evidence, source, [], Date.parse('2026-08-25T00:00:00Z'));
    expect(result.coverage.present).toBe(3);
    expect(result.checks.find((item) => item.code === 'amount')?.status).toBe('conflict');
    expect(result.checks.find((item) => item.code === 'phone')?.status).toBe('pass');
    expect(result.checks.find((item) => item.code === 'recipient')?.status).toBe('pass');
  });

  it('keeps unsupported manual facts as exportable conflicts', () => {
    const result = derivePassport([], [], [{ field: 'reference', value: 'MANUAL123', normalizedValue: 'MANUAL123', resolutionType: 'manual' }]);
    expect(result.checks.some((item) => item.code === 'unsupported_reference' && item.status === 'conflict')).toBe(true);
  });
});

describe('verifiable package contracts', () => {
  it('uses deterministic canonical JSON and SHA-256', async () => {
    expect(stableJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(await sha256Hex('FIRST30')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects incomplete or malformed manifests', () => {
    expect(() => manifestCoreSchema.parse({ format: 'FIRST30-evidence-passport', formatVersion: 2, caseId: crypto.randomUUID(), createdAt: Date.now(), caseFingerprint: 'a'.repeat(64), files: [] })).toThrow();
  });

  it('keeps essential interface strings bilingual', () => {
    expect(Object.keys(COPY.en)).toEqual(Object.keys(COPY.hi));
    expect(COPY.hi.brandLine).toMatch(/[\u0900-\u097F]/);
  });

  it('checks every ZIP file locally and identifies tampering', async () => {
    const archiveFiles = { 'FIRST30-evidence-passport.pdf': strToU8('pdf'), 'passport.json': strToU8('{}'), 'evidence/receipt.png': new Uint8Array([1,2,3]) };
    const files = await Promise.all(Object.entries(archiveFiles).map(async ([path, bytes]) => ({ path, mimeType: path.endsWith('.pdf') ? 'application/pdf' : path.endsWith('.json') ? 'application/json' : 'image/png', size: bytes.length, sha256: await sha256Hex(bytes) })));
    const unsigned = { format: 'FIRST30-evidence-passport' as const, formatVersion: 2 as const, caseId: crypto.randomUUID(), createdAt: Date.now(), caseFingerprint: 'a'.repeat(64), files, packageVersion: 1, verificationCode: 'F30-ABC123-DEF456' };
    const manifestHash = await sha256Hex(stableJson(unsigned)); const manifest = { ...unsigned, manifestHash, signature: 's'.repeat(40) };
    const valid = zipSync({ ...archiveFiles, 'manifest.json': strToU8(JSON.stringify(manifest)) });
    expect((await verifyArchiveLocally(valid)).intact).toBe(true);
    const altered = zipSync({ ...archiveFiles, 'passport.json': strToU8('{"changed":true}'), 'manifest.json': strToU8(JSON.stringify(manifest)) });
    const alteredResult = await verifyArchiveLocally(altered);
    expect(alteredResult.intact).toBe(false);
    expect(alteredResult.failedFiles).toContain('passport.json');
  });
});
