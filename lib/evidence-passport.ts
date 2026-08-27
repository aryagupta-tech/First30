import type { FactKey, Observation } from './contracts';

export type ObservationRecord = Observation & { id?: string; evidenceId: string; evidenceKind: string; filename: string };
export type ResolutionRecord = { field: FactKey; value: string; normalizedValue: string; resolutionType: 'evidence' | 'manual' | 'unknown'; sourceEvidenceId?: string | null };
export type PassportCheck = { code: string; status: 'pass' | 'conflict' | 'missing'; titleEn: string; titleHi: string; detailEn: string; detailHi: string; evidenceIds: string[] };

const REQUIRED_KINDS = ['receipt', 'chat', 'call_log'];
const FACTS: FactKey[] = ['amount', 'reference', 'recipient', 'institution', 'phone', 'occurred_at'];

export function normalizeFact(field: FactKey, value: string | number) {
  const raw = String(value).trim();
  if (field === 'amount') return raw.replace(/[^0-9.]/g, '').replace(/\.00$/, '');
  if (field === 'phone') return raw.replace(/\D/g, '').slice(-10);
  if (field === 'reference') return raw.replace(/\s/g, '').toUpperCase();
  if (field === 'recipient') return raw.toLowerCase();
  if (field === 'occurred_at') return raw.slice(0, 16);
  return raw.toLowerCase().replace(/\s+/g, ' ');
}

export function observationsFromText(kind: string, text: string): Observation[] {
  const observations: Observation[] = [];
  const add = (field: FactKey, value: string, sourceText: string, confidence = 0.9) => observations.push({ field, value, normalizedValue: normalizeFact(field, value), sourceText, confidence });
  const amountMatches = [...text.matchAll(/(?:₹|INR|Rs\.?)[ \t]*([0-9][0-9,]*(?:\.\d{1,2})?)/gi)];
  amountMatches.forEach((match) => add('amount', String(Math.round(Number(match[1].replace(/,/g, '')))), match[0], 0.94));
  const refs = [...text.matchAll(/\b(?:UTR|transaction(?:\s+id)?|reference|ref\s*no)\s*[:#-]?\s*([A-Z0-9-]{8,})\b/gi)];
  refs.forEach((match) => add('reference', match[1], match[0], 0.93));
  const recipients = [...text.matchAll(/\b[a-z0-9._-]{2,}@[a-z][a-z0-9.-]{1,}\b/gi)];
  recipients.forEach((match) => add('recipient', match[0], match[0], 0.92));
  const phones = [...text.matchAll(/(?<!\d)(?:\+91[ -]?)?[6-9](?:[ -]?\d){9}(?!\d)/g)];
  phones.forEach((match) => add('phone', match[0], match[0], 0.91));
  const dates = [...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})[ ,T]+(\d{1,2}):(\d{2})\b/g)];
  dates.forEach((match) => add('occurred_at', `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}T${match[4].padStart(2, '0')}:${match[5]}`, match[0], 0.88));
  const institution = (kind === 'receipt' || kind === 'bank_statement' ? text.match(/^([^\n]{3,90}\b(?:Bank|Wallet))\b/im) : null)
    || text.match(/\bfrom\s+([A-Z][A-Za-z&.' -]{2,80}\bBank)\b/);
  if (institution) add('institution', institution[1].trim(), institution[0], kind === 'receipt' ? 0.9 : 0.76);
  return dedupeObservations(observations);
}

export function dedupeObservations(items: Observation[]) {
  const seen = new Set<string>();
  return items.filter((item) => { const key = `${item.field}:${item.normalizedValue}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

export function derivePassport(evidence: Array<{ id: string; kind: string; filename: string }>, observations: ObservationRecord[], resolutions: ResolutionRecord[], now = Date.now()) {
  const checks: PassportCheck[] = [];
  const byField = new Map<FactKey, ObservationRecord[]>();
  for (const field of FACTS) byField.set(field, observations.filter((item) => item.field === field));
  const presentKinds = new Set(evidence.map((item) => item.kind));
  for (const kind of REQUIRED_KINDS) checks.push({
    code: `evidence_${kind}`, status: presentKinds.has(kind) ? 'pass' : 'missing',
    titleEn: `${kind.replace('_', ' ')} evidence`, titleHi: `${kind.replace('_', ' ')} प्रमाण`,
    detailEn: presentKinds.has(kind) ? 'Evidence type is present.' : 'This evidence type has not been added.',
    detailHi: presentKinds.has(kind) ? 'यह प्रमाण प्रकार मौजूद है।' : 'यह प्रमाण प्रकार अभी नहीं जोड़ा गया।',
    evidenceIds: evidence.filter((item) => item.kind === kind).map((item) => item.id),
  });
  for (const field of ['amount', 'recipient', 'phone', 'reference'] as FactKey[]) {
    const values = new Map<string, ObservationRecord[]>();
    for (const observation of byField.get(field) || []) values.set(observation.normalizedValue, [...(values.get(observation.normalizedValue) || []), observation]);
    const all = [...values.values()].flat();
    if (!all.length) checks.push(check(field, 'missing', [], `No ${field.replace('_', ' ')} was found in the evidence.`));
    else if (values.size > 1) checks.push(check(field, 'conflict', all, `Evidence contains ${values.size} different ${field.replace('_', ' ')} values.`));
    else if (all.length > 1) checks.push(check(field, 'pass', all, `${field.replace('_', ' ')} agrees across ${all.length} observations.`));
    else checks.push(check(field, 'pass', all, `${field.replace('_', ' ')} is supported by one evidence source.`));
  }
  const times = observations.filter((item) => item.field === 'occurred_at');
  const future = times.filter((item) => Number.isNaN(Date.parse(item.value)) || Date.parse(item.value) > now + 60_000);
  const firstTime = (kind: string) => times.filter((item) => item.evidenceKind === kind).map((item) => Date.parse(item.value)).filter(Number.isFinite).sort((a,b) => a-b)[0];
  const sequence = [firstTime('call_log'), firstTime('chat'), firstTime('receipt')];
  const outOfOrder = sequence.every(Number.isFinite) && !(sequence[0] <= sequence[1] && sequence[1] <= sequence[2]);
  if (future.length) checks.push(check('timeline', 'conflict', future, 'Evidence contains an invalid or future timestamp.'));
  else if (outOfOrder) checks.push(check('timeline', 'conflict', times, 'Call, chat and transaction timestamps do not form the expected sequence.'));
  else checks.push(check('timeline', times.length ? 'pass' : 'missing', times, 'Evidence timestamps form a usable chronology.'));
  const duplicateNames = evidence.filter((item, index) => evidence.findIndex((other) => other.filename.toLowerCase() === item.filename.toLowerCase()) !== index);
  if (duplicateNames.length) checks.push({ code: 'duplicate_filenames', status: 'conflict', titleEn: 'duplicate filenames', titleHi: 'डुप्लिकेट फ़ाइल नाम', detailEn: 'Different evidence files use the same filename.', detailHi: 'अलग प्रमाण फ़ाइलों का नाम समान है।', evidenceIds: duplicateNames.map((item) => item.id) });
  for (const resolution of resolutions) {
    if (resolution.resolutionType === 'manual' && !(byField.get(resolution.field) || []).some((item) => item.normalizedValue === resolution.normalizedValue)) {
      checks.push(check(`unsupported_${resolution.field}`, 'conflict', [], `${resolution.field.replace('_', ' ')} was entered manually and is not supported by uploaded evidence.`));
    }
  }
  const unknownFacts = resolutions.filter((item) => item.resolutionType === 'unknown').length + FACTS.filter((field) => !resolutions.some((item) => item.field === field)).length;
  return {
    coverage: { present: REQUIRED_KINDS.filter((kind) => presentKinds.has(kind)).length, total: REQUIRED_KINDS.length, requiredKinds: REQUIRED_KINDS },
    counts: { passed: checks.filter((item) => item.status === 'pass').length, conflicts: checks.filter((item) => item.status === 'conflict').length, missing: checks.filter((item) => item.status === 'missing').length, unknownFacts },
    checks, facts: FACTS.map((field) => ({ field, resolution: resolutions.find((item) => item.field === field) || null, observations: byField.get(field) || [] })),
  };
}

function check(code: string, status: PassportCheck['status'], observations: ObservationRecord[], detailEn: string): PassportCheck {
  const label = code.replace(/^unsupported_/, '').replace('_', ' ');
  const labels: Record<string,string> = { amount:'राशि',recipient:'प्राप्तकर्ता',phone:'फ़ोन',reference:'लेन-देन संदर्भ',timeline:'समयरेखा',institution:'संस्था',occurred_at:'घटना समय' };
  const detailHi = status === 'conflict' ? 'प्रमाण में इस तथ्य के विरोधी या असमर्थित मान मिले।' : status === 'missing' ? 'यह तथ्य उपलब्ध प्रमाण में नहीं मिला।' : 'यह तथ्य उपलब्ध प्रमाण से समर्थित है।';
  return { code, status, titleEn: label, titleHi: labels[label] || label, detailEn, detailHi, evidenceIds: [...new Set(observations.map((item) => item.evidenceId))] };
}
