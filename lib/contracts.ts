import { z } from 'zod';

export type Locale = 'en' | 'hi';
export type FraudChannel = 'upi' | 'card' | 'bank_transfer' | 'wallet';
export type CaseStatus = 'draft' | 'evidence_review' | 'ready_to_submit' | 'submitted' | 'action_required' | 'evidence_received' | 'review_needed' | 'ready' | 'exported';
export type MilestoneKind = 'bank_contacted' | 'helpline_called' | 'cyber_report_submitted' | 'follow_up';
export type EvidenceKind = 'receipt' | 'chat' | 'call_log' | 'bank_statement';
export type FactKey = 'amount' | 'reference' | 'recipient' | 'institution' | 'phone' | 'occurred_at';
export type Observation = { field: FactKey; value: string; normalizedValue: string; sourceText: string; confidence: number };

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

export const evidenceKindSchema = z.enum(['receipt', 'chat', 'call_log', 'bank_statement']);
export const evidenceDataUseSchema = z.object({
  sample: z.boolean(),
  safeDataConfirmed: z.boolean(),
}).refine((value) => value.sample || value.safeDataConfirmed, { message: 'Confirm fictional or fully redacted test data.' });
export const factKeySchema = z.enum(['amount', 'reference', 'recipient', 'institution', 'phone', 'occurred_at']);
export const observationSchema = z.object({
  field: factKeySchema,
  value: z.string().min(1).max(240),
  normalizedValue: z.string().min(1).max(240),
  sourceText: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});
export const evidenceAnalysisSchema = z.object({
  ocrText: z.string().max(12_000),
  ocrMethod: z.enum(['tesseract_local', 'bundled_sample', 'manual']),
  clientSha256: z.string().regex(/^[a-f0-9]{64}$/),
  observations: z.array(observationSchema).max(30),
});
export const factResolutionSchema = z.object({
  field: factKeySchema,
  value: z.string().min(1).max(240),
  resolutionType: z.enum(['evidence', 'manual', 'unknown']),
  sourceEvidenceId: z.string().uuid().nullable().optional(),
});
export const findingAcknowledgementSchema = z.object({ note: z.string().min(3).max(500) });

export const demoLoginSchema = z.object({
  locale: z.enum(['en', 'hi']).default('en'),
  mobile: z.string().transform((value) => value.replace(/\D/g, '')).pipe(z.literal('9000000000')),
  otp: z.literal('123456'),
});

export const intakeSchema = z.object({
  fraudType: z.enum(['fake_kyc', 'vishing', 'marketplace', 'job_scam', 'investment', 'other']),
  channel: z.enum(['upi', 'card', 'bank_transfer', 'wallet']),
  lossTiming: z.enum(['under_30_minutes', 'today', 'earlier']),
  helplineContacted: z.boolean(),
  bankContacted: z.boolean(),
  delayReason: z.string().max(500).default(''),
  amount: z.number().int().min(1).max(10_000_000),
  occurredAt: z.string().min(8).max(80),
});

export const complainantProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
  mobile: z.string().min(10).max(20),
  gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']),
  dateOfBirth: z.string().min(8).max(20),
  relationName: z.string().min(2).max(100),
  address: z.string().min(8).max(300),
  state: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  policeStation: z.string().min(2).max(120),
  pincode: z.string().regex(/^\d{6}$/),
});

export const mockSubmissionSchema = z.object({
  consent: z.literal(true),
  syntheticConfirmation: z.literal(true),
});

export const requestResponseSchema = z.object({
  evidenceId: z.string().uuid(),
  note: z.string().min(3).max(500),
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
  format: z.enum(['FIRST30-response-file', 'FIRST30-evidence-passport']),
  formatVersion: z.union([z.literal(1), z.literal(2)]),
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

export const SAMPLE_CHAT_TEXT = `WhatsApp chat with +91 98765 43210
21/08/2026 18:34 We are calling from Bharat Cooperative Bank KYC desk.
21/08/2026 18:36 Send ₹18,400 to verify.kyc@fakeupi immediately.
21/08/2026 18:37 Your KYC will be blocked today.`;

export const SAMPLE_CALL_LOG_TEXT = `Recent calls
+91 98765 43210
Incoming call
21/08/2026 18:28
Duration 06:12`;

export const SAMPLE_BANK_STATEMENT_TEXT = `Bharat Cooperative Bank
Synthetic mini statement
21/08/2026 18:42 UPI debit ₹18,499.00
UTR UTR826194730521
To verify.kyc@fakeupi`;

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
