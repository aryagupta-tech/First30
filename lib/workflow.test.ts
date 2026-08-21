import { describe, expect, it } from 'vitest';
import { complaintSchema, COPY, extractionSchema, SAMPLE_EXTRACTION } from './contracts';
import { isCompleted, transition } from './workflow';

describe('FIRST30 workflow', () => {
  it('follows the deterministic judged journey', () => {
    expect(transition('draft', 'submit')).toBe('action_required');
    expect(transition('action_required', 'provide_evidence')).toBe('funds_held');
    expect(transition('funds_held', 'confirm_restoration')).toBe('partially_restored');
    expect(isCompleted('partially_restored')).toBe(true);
  });

  it('rejects invalid transitions and makes terminal actions idempotent', () => {
    expect(transition('draft', 'confirm_restoration')).toBeNull();
    expect(transition('partially_restored', 'confirm_restoration')).toBeNull();
  });
});

describe('structured data contracts', () => {
  it('accepts the bundled extraction with bounded confidence', () => {
    expect(extractionSchema.parse(SAMPLE_EXTRACTION)).toEqual(SAMPLE_EXTRACTION);
  });

  it('rejects fabricated confidence and incomplete complaints', () => {
    expect(() => extractionSchema.parse({ ...SAMPLE_EXTRACTION, amount: { value: 18499, confidence: 2 } })).toThrow();
    expect(() => complaintSchema.parse({ complaintEn: 'short', complaintHi: 'छोटा' })).toThrow();
  });

  it('keeps essential interface strings in both languages', () => {
    expect(Object.keys(COPY.en)).toEqual(Object.keys(COPY.hi));
    expect(COPY.hi.brandLine).toMatch(/[\u0900-\u097F]/);
  });
});
