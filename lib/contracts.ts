import { z } from 'zod';

export type Locale = 'en' | 'hi';
export type FraudChannel = 'upi' | 'card' | 'bank_transfer' | 'wallet';
export type CaseStatus = 'draft' | 'review_needed' | 'ready' | 'exported';
export type MilestoneKind = 'bank_contacted' | 'helpline_called' | 'cyber_report_submitted' | 'follow_up';

export type ExtractionField = { value: string | number | null; confidence: number };
export type EvidenceExtraction = {
  amount: ExtractionField;
  occurredAt: ExtractionField;
  reference: ExtractionField;
  channel: ExtractionField;
  bank: ExtractionField;
  recipient: ExtractionField;
};

export const extractionSchema = z.object({
  amount: z.object({ value: z.union([z.number(), z.null()]), confidence: z.number().min(0).max(1) }),
  occurredAt: z.object({ value: z.union([z.string(), z.null()]), confidence: z.number().min(0).max(1) }),
  reference: z.object({ value: z.union([z.string(), z.null()]), confidence: z.number().min(0).max(1) }),
  channel: z.object({ value: z.union([z.enum(['upi', 'card', 'bank_transfer', 'wallet']), z.null()]), confidence: z.number().min(0).max(1) }),
  bank: z.object({ value: z.union([z.string(), z.null()]), confidence: z.number().min(0).max(1) }),
  recipient: z.object({ value: z.union([z.string(), z.null()]), confidence: z.number().min(0).max(1) }),
});

export const caseFieldsSchema = z.object({
  fraudType: z.string().min(1).max(60),
  channel: z.enum(['upi', 'card', 'bank_transfer', 'wallet']),
  amount: z.number().int().min(0).max(10_000_000),
  occurredAt: z.string().max(80),
  reference: z.string().max(100),
  bank: z.string().max(100),
  recipient: z.string().max(160),
  narrative: z.string().max(2000),
});

export const chronologySchema = z.object({
  occurredAt: z.string().min(1).max(80),
  eventType: z.enum(['contact', 'transaction', 'discovery', 'action', 'other']),
  descriptionEn: z.string().min(3).max(500),
  descriptionHi: z.string().max(700).optional().default(''),
  source: z.enum(['citizen', 'evidence', 'first30']).default('citizen'),
});

export const milestoneSchema = z.object({
  kind: z.enum(['bank_contacted', 'helpline_called', 'cyber_report_submitted', 'follow_up']),
  reference: z.string().max(120).default(''),
  notes: z.string().max(500).default(''),
  occurredAt: z.string().min(1).max(80),
});

export const manifestFileSchema = z.object({
  path: z.string().min(1).max(240),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().min(0),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  evidenceId: z.string().max(80).optional(),
});

export const manifestCoreSchema = z.object({
  format: z.literal('FIRST30-response-file'),
  formatVersion: z.literal(1),
  caseId: z.string().uuid(),
  createdAt: z.number().int().positive(),
  caseFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  files: z.array(manifestFileSchema).min(3).max(30),
});

export const signedManifestSchema = manifestCoreSchema.extend({
  packageVersion: z.number().int().positive(),
  verificationCode: z.string().regex(/^F30-[A-Z0-9-]{8,32}$/),
  manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  signature: z.string().min(32).max(180),
});

export const verificationRequestSchema = z.object({
  verificationCode: z.string().regex(/^F30-[A-Z0-9-]{8,32}$/),
  manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  signature: z.string().min(32).max(180),
});

export const complaintSchema = z.object({ complaintEn: z.string().min(40).max(2400), complaintHi: z.string().min(40).max(2800) });

export const SAMPLE_OCR_TEXT = `Bharat Cooperative Bank
Payment successful
Amount ₹18,499.00
UPI transaction
UTR UTR826194730521
To verify.kyc@fakeupi
21/08/2026 18:42`;

export const SAMPLE_EXTRACTION: EvidenceExtraction = {
  amount: { value: 18499, confidence: 0.99 },
  occurredAt: { value: '2026-08-21T18:42', confidence: 0.96 },
  reference: { value: 'UTR826194730521', confidence: 0.98 },
  channel: { value: 'upi', confidence: 0.99 },
  bank: { value: 'Bharat Cooperative Bank', confidence: 0.95 },
  recipient: { value: 'verify.kyc@fakeupi', confidence: 0.97 },
};

export const DEMO_NARRATIVE =
  'I received a call from someone claiming to be from my bank. They said my KYC would expire and asked me to approve a UPI request. ₹18,499 left my account before I realised it was a scam.';

export const COPY = {
  en: {
    brandLine: 'The first 30 minutes matter',
    back: 'Back', continue: 'Continue', save: 'Save and continue',
    synthetic: 'Independent prototype · synthetic data only',
  },
  hi: {
    brandLine: 'पहले 30 मिनट महत्वपूर्ण हैं',
    back: 'वापस', continue: 'आगे बढ़ें', save: 'सहेजें और आगे बढ़ें',
    synthetic: 'स्वतंत्र प्रोटोटाइप · केवल काल्पनिक डेटा',
  },
} as const;
