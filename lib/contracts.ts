export type Locale = 'en' | 'hi';
export type FraudChannel = 'upi' | 'card' | 'bank_transfer' | 'wallet';
export type CaseStatus =
  | 'draft'
  | 'submitted'
  | 'action_required'
  | 'funds_held'
  | 'restoration_processing'
  | 'partially_restored';

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

export const complaintSchema = z.object({ complaintEn: z.string().min(40).max(1600), complaintHi: z.string().min(40).max(1800) });

export const SAMPLE_EXTRACTION: EvidenceExtraction = {
  amount: { value: 18499, confidence: 0.99 },
  occurredAt: { value: '2026-08-21T18:42:00+05:30', confidence: 0.96 },
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
import { z } from 'zod';
