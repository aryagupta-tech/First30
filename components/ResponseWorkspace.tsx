'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';
import { DEMO_NARRATIVE, type EvidenceExtraction } from '@/lib/contracts';
import { createSampleReceiptFile, readReceiptLocally } from '@/lib/client-ocr';
import { buildResponsePackage } from '@/lib/client-export';
import { buildComplaint, findContradictions } from '@/lib/response-file';

type Row = Record<string, string | number | null>;
type Readiness = { level: 'incomplete' | 'review_needed' | 'ready'; blockers: number; warnings: number; issues: Array<{ code: string; severity: string; field?: string; messageEn: string; messageHi: string }> };
type Bundle = { case: Row; evidence: Row[]; chronology: Row[]; milestones: Row[]; exports: Row[]; readiness: Readiness };
type ChronologyDraft = { occurredAt: string; eventType: 'contact' | 'transaction' | 'discovery' | 'action' | 'other'; descriptionEn: string; descriptionHi: string; source: 'citizen' | 'evidence' | 'first30' };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init); const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Please try again.'); return data;
}

const emptyExtraction: EvidenceExtraction = {
  amount: { value: null, confidence: 0 }, occurredAt: { value: null, confidence: 0 }, reference: { value: null, confidence: 0 },
  channel: { value: null, confidence: 0 }, bank: { value: null, confidence: 0 }, recipient: { value: null, confidence: 0 },
};

export function ResponseWorkspace({ caseId: suppliedCaseId }: { caseId?: string }) {
  const { locale, pick } = useLocale(); const started = useRef(false);
  const [caseId, setCaseId] = useState(suppliedCaseId || ''); const [bundle, setBundle] = useState<Bundle | null>(null);
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<{ id: string; filename: string; ocrText: string; extraction: EvidenceExtraction; engine: string } | null>(null);
  const [form, setForm] = useState({ fraudType: 'fake_kyc', channel: 'upi', amount: '', occurredAt: '', reference: '', bank: '', recipient: '', narrative: DEMO_NARRATIVE });
  const [chronology, setChronology] = useState<ChronologyDraft[]>([]);
  const [milestone, setMilestone] = useState({ kind: 'bank_contacted', reference: '', notes: '', occurredAt: new Date().toISOString().slice(0, 16) });

  const applyBundle = useCallback((next: Bundle) => {
    setBundle(next); const row = next.case;
    setForm({ fraudType: String(row.fraud_type || 'fake_kyc'), channel: String(row.channel || 'upi'), amount: Number(row.amount || 0) > 0 ? String(row.amount) : '', occurredAt: String(row.occurred_at || '').slice(0, 16), reference: String(row.reference || ''), bank: String(row.bank || ''), recipient: String(row.recipient || ''), narrative: String(row.narrative_input || DEMO_NARRATIVE) });
    setChronology(next.chronology.map((event) => ({ occurredAt: String(event.occurred_at), eventType: String(event.event_type) as ChronologyDraft['eventType'], descriptionEn: String(event.description_en), descriptionHi: String(event.description_hi || ''), source: String(event.source) as ChronologyDraft['source'] })));
  }, []);

  const refresh = useCallback(async (id: string) => { const next = await api<Bundle>(`/api/cases/${id}`); applyBundle(next); return next; }, [applyBundle]);

  useEffect(() => {
    if (started.current) return; started.current = true;
    void (async () => {
      try {
        const session = await api<{ active: boolean }>('/api/session');
        if (!session.active) await api('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale }) });
        if (suppliedCaseId) { await refresh(suppliedCaseId); return; }
        const stored = window.localStorage.getItem('f30_active_case');
        if (stored) { try { setCaseId(stored); await refresh(stored); return; } catch { window.localStorage.removeItem('f30_active_case'); } }
        const created = await api<{ id: string }>('/api/cases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale }) });
        setCaseId(created.id); window.localStorage.setItem('f30_active_case', created.id); await refresh(created.id);
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not open the workspace.'); }
    })();
  }, [locale, refresh, suppliedCaseId]);

  const setUnknown = (field: 'reference' | 'bank' | 'recipient') => setForm((current) => ({ ...current, [field]: 'Unknown' }));
  const currentExtraction = pending?.extraction || (() => { try { return bundle?.evidence[0]?.extraction_json ? JSON.parse(String(bundle.evidence[0].extraction_json)) as EvidenceExtraction : null; } catch { return null; } })();
  const contradictions = useMemo(() => findContradictions(currentExtraction, { amount: Number(form.amount), reference: form.reference }), [currentExtraction, form.amount, form.reference]);
  const complaints = useMemo(() => buildComplaint({ ...form, amount: Number(form.amount) }), [form]);

  function mergeExtraction(extraction: EvidenceExtraction) {
    setForm((current) => ({
      ...current,
      amount: extraction.amount.value ? String(extraction.amount.value) : current.amount,
      occurredAt: extraction.occurredAt.value ? String(extraction.occurredAt.value).slice(0, 16) : current.occurredAt,
      reference: extraction.reference.value ? String(extraction.reference.value) : current.reference,
      channel: extraction.channel.value ? String(extraction.channel.value) : current.channel,
      bank: extraction.bank.value ? String(extraction.bank.value) : current.bank,
      recipient: extraction.recipient.value ? String(extraction.recipient.value) : current.recipient,
    }));
  }

  async function addEvidence(file: File, sample = false) {
    if (!caseId) return; setBusy('evidence'); setError('');
    try {
      const local = await readReceiptLocally(file, sample); const data = new FormData();
      data.set('synthetic', 'true'); data.set('kind', 'transaction_receipt'); data.set('file', file); if (sample) data.set('sample', 'true');
      const uploaded = await api<{ id: string; filename: string }>(`/api/cases/${caseId}/evidence`, { method: 'POST', body: data });
      await refresh(caseId); mergeExtraction(local.extraction); setPending({ id: uploaded.id, filename: uploaded.filename, ocrText: local.text, extraction: local.extraction || emptyExtraction, engine: local.engine });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not add evidence.'); } finally { setBusy(''); }
  }

  function defaultChronology() {
    if (chronology.length) return chronology;
    if (!form.occurredAt) return [];
    return [{ occurredAt: form.occurredAt, eventType: 'transaction' as const, descriptionEn: `${form.channel.toUpperCase()} transaction of ₹${Number(form.amount || 0).toLocaleString('en-IN')} was reported by the citizen.`, descriptionHi: `नागरिक ने ₹${Number(form.amount || 0).toLocaleString('en-IN')} के ${form.channel.toUpperCase()} लेन-देन की जानकारी दी।`, source: 'citizen' as const }];
  }

  async function saveWorkspace(confirmEvidence = false) {
    if (!caseId) throw new Error('Workspace is not ready.'); setSaved(false);
    await api(`/api/cases/${caseId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fraudType: form.fraudType, channel: form.channel, amount: Number(form.amount || 0), occurredAt: form.occurredAt, reference: form.reference || 'Unknown', bank: form.bank || 'Unknown', recipient: form.recipient || 'Unknown' }) });
    await api(`/api/cases/${caseId}/draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ narrative: form.narrative }) });
    const nextChronology = defaultChronology();
    await api(`/api/cases/${caseId}/chronology`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: nextChronology }) });
    if (confirmEvidence && pending) {
      await api(`/api/cases/${caseId}/evidence/${pending.id}/confirm`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ocrText: pending.ocrText, extraction: pending.extraction }) });
      setPending(null);
    }
    await api(`/api/cases/${caseId}/readiness`); const next = await refresh(caseId); setSaved(true); setTimeout(() => setSaved(false), 1800); return next;
  }

  async function handleSave(confirmEvidence = false) {
    setBusy('save'); setError(''); try { await saveWorkspace(confirmEvidence); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the workspace.'); } finally { setBusy(''); }
  }

  async function removeEvidence(evidenceId: string) {
    setBusy('remove'); setError(''); try { await api(`/api/cases/${caseId}/evidence/${evidenceId}`, { method: 'DELETE' }); if (pending?.id === evidenceId) setPending(null); await refresh(caseId); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not remove evidence.'); } finally { setBusy(''); }
  }

  async function exportFile() {
    setBusy('export'); setError('');
    try {
      await saveWorkspace(Boolean(pending));
      const readiness = await api<Readiness & { status: string }>(`/api/cases/${caseId}/readiness`);
      if (readiness.blockers) throw new Error(pick('Resolve the required checks before building the response file.', 'रिस्पॉन्स फ़ाइल बनाने से पहले आवश्यक जाँच पूरी करें।'));
      const latest = await refresh(caseId); await buildResponsePackage(caseId, latest); window.localStorage.removeItem('f30_active_case'); await refresh(caseId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not build the response file.'); } finally { setBusy(''); }
  }

  async function addMilestone() {
    setBusy('milestone'); setError(''); try {
      const next = await api<Bundle>(`/api/cases/${caseId}/milestones`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(milestone) }); applyBundle(next);
      setMilestone((current) => ({ ...current, reference: '', notes: '' }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the milestone.'); } finally { setBusy(''); }
  }

  if (!bundle) return <main className="site-shell"><Header compact /><div className="loading-state" role="status">{error || pick('Opening the response workspace…', 'रिस्पॉन्स कार्यक्षेत्र खुल रहा है…')}</div></main>;
  const readiness = bundle.readiness; const latestExport = bundle.exports[0];

  return <main className="site-shell"><Header compact /><section className="response-workspace">
    <div className="workspace-titlebar"><div>{suppliedCaseId && <Link href="/cases" className="back-link">← {pick('All response files', 'सभी रिस्पॉन्स फ़ाइलें')}</Link>}<p className="eyebrow">{pick('Private response workspace', 'निजी रिस्पॉन्स कार्यक्षेत्र')}</p><h1>{pick('Build one verified fraud response file', 'एक सत्यापित फ्रॉड रिस्पॉन्स फ़ाइल बनाएँ')}</h1><p>{pick('Evidence, confirmed facts, chronology and documents update together. Nothing is submitted outside FIRST30.', 'प्रमाण, पुष्ट तथ्य, समयरेखा और दस्तावेज़ एक साथ अपडेट होते हैं। FIRST30 के बाहर कुछ जमा नहीं होता।')}</p></div><div className={`readiness-card readiness-${readiness.level}`}><span>{pick('File readiness', 'फ़ाइल तैयारी')}</span><strong>{pick(readiness.level === 'ready' ? 'Ready' : readiness.level === 'review_needed' ? 'Review needed' : 'Incomplete', readiness.level === 'ready' ? 'तैयार' : readiness.level === 'review_needed' ? 'समीक्षा आवश्यक' : 'अपूर्ण')}</strong><small>{readiness.blockers} {pick('required', 'आवश्यक')} · {readiness.warnings} {pick('warnings', 'चेतावनी')}</small></div></div>

    <div className="workspace-grid"><div className="workspace-primary">
      <section className="work-card evidence-work"><div className="work-heading"><div><span className="section-number">01</span><div><h2>{pick('Evidence integrity', 'प्रमाण अखंडता')}</h2><p>{pick('Read locally, checksum every file, and reject exact duplicates.', 'स्थानीय रूप से पढ़ें, हर फ़ाइल का चेकसम बनाएँ और डुप्लिकेट रोकें।')}</p></div></div><span className="local-only">{pick('Local reader', 'स्थानीय रीडर')}</span></div>
        <div className="evidence-actions"><button type="button" className="sample-evidence-button" disabled={Boolean(busy)} onClick={() => void createSampleReceiptFile().then((file) => addEvidence(file, true))}><span>{pick('Recommended demo', 'सुझाया गया डेमो')}</span><strong>{pick('Use synthetic UPI receipt', 'काल्पनिक UPI रसीद उपयोग करें')}</strong><small>₹18,499 · UTR826194730521</small></button><label className="evidence-drop"><strong>{pick('Choose a synthetic receipt', 'काल्पनिक रसीद चुनें')}</strong><span>{pick('PNG, JPEG or WebP · max 5 MB', 'PNG, JPEG या WebP · अधिकतम 5 MB')}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void addEvidence(file); event.target.value = ''; }} /></label></div>
        {pending && <div className="pending-review"><div><span className="integrity-icon">✓</span><div><strong>{pick('Review the locally read facts', 'स्थानीय रूप से पढ़े तथ्य जाँचें')}</strong><p>{pending.filename} · {pending.engine === 'browser_ocr' ? pick('browser OCR', 'ब्राउज़र OCR') : pending.engine === 'bundled_sample' ? pick('bundled sample parser', 'बंडल नमूना पार्सर') : pick('manual entry required', 'मैनुअल एंट्री आवश्यक')}</p></div></div><button className="secondary-button" onClick={() => void handleSave(true)} disabled={Boolean(busy)}>{pick('Confirm evidence facts', 'प्रमाण तथ्यों की पुष्टि करें')}</button></div>}
        <div className="evidence-list">{bundle.evidence.map((item) => <div key={String(item.id)}><span className={item.confirmed_at ? 'file-state confirmed' : 'file-state'}>{item.confirmed_at ? '✓' : '!'}</span><div><strong>{String(item.filename)}</strong><small>SHA-256 {String(item.sha256 || '').slice(0, 16)}… · {(Number(item.size) / 1024).toFixed(1)} KB</small></div><span className="evidence-status">{pick(item.confirmed_at ? 'Confirmed' : 'Review needed', item.confirmed_at ? 'पुष्ट' : 'समीक्षा आवश्यक')}</span><button className="text-button danger" onClick={() => void removeEvidence(String(item.id))}>{pick('Remove', 'हटाएँ')}</button></div>)}</div>
      </section>

      <section className="work-card"><div className="work-heading"><div><span className="section-number">02</span><div><h2>{pick('Confirmed transaction facts', 'पुष्ट लेन-देन तथ्य')}</h2><p>{pick('Correct the local reader. Use Unknown when a fact is unavailable.', 'स्थानीय रीडर को सुधारें। जानकारी न हो तो अज्ञात चुनें।')}</p></div></div>{saved && <span className="saved-chip">{pick('Saved', 'सहेजा गया')}</span>}</div>
        <div className="fact-grid"><label>{pick('Amount lost', 'गई हुई राशि')}<input inputMode="numeric" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/\D/g, '') })} placeholder="18499" /></label><label>{pick('Payment channel', 'भुगतान माध्यम')}<select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="wallet">Wallet</option></select></label><label>{pick('Incident time', 'घटना समय')}<input type="datetime-local" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></label><FieldWithUnknown label={pick('Transaction reference', 'लेन-देन संदर्भ')} value={form.reference} onChange={(value) => setForm({ ...form, reference: value })} onUnknown={() => setUnknown('reference')} pick={pick} /><FieldWithUnknown label={pick('Bank or wallet', 'बैंक या वॉलेट')} value={form.bank} onChange={(value) => setForm({ ...form, bank: value })} onUnknown={() => setUnknown('bank')} pick={pick} /><FieldWithUnknown label={pick('Recipient identifier', 'प्राप्तकर्ता पहचान')} value={form.recipient} onChange={(value) => setForm({ ...form, recipient: value })} onUnknown={() => setUnknown('recipient')} pick={pick} /></div>
        {contradictions.length > 0 && <div className="contradiction-box"><strong>{pick('Check these differences', 'इन अंतरों की जाँच करें')}</strong>{contradictions.map((item) => <p key={item}>• {item}</p>)}</div>}
        <label className="narrative-field">{pick('What happened, in the citizen’s own words', 'नागरिक के अपने शब्दों में क्या हुआ')}<textarea rows={6} maxLength={2000} value={form.narrative} onChange={(event) => setForm({ ...form, narrative: event.target.value })} /><span>{form.narrative.length}/2000</span></label>
        <button className="secondary-button save-workspace" onClick={() => void handleSave(Boolean(pending))} disabled={Boolean(busy)}>{busy === 'save' ? pick('Checking file…', 'फ़ाइल जाँची जा रही है…') : pick('Save and check readiness', 'सहेजें और तैयारी जाँचें')}</button>
      </section>

      <section className="work-card"><div className="work-heading"><div><span className="section-number">03</span><div><h2>{pick('Incident chronology', 'घटना समयरेखा')}</h2><p>{pick('Only citizen-confirmed events appear in the response file.', 'केवल नागरिक-पुष्ट घटनाएँ रिस्पॉन्स फ़ाइल में आती हैं।')}</p></div></div><button className="text-button" onClick={() => setChronology([...(chronology.length ? chronology : defaultChronology()), { occurredAt: form.occurredAt || new Date().toISOString().slice(0, 16), eventType: 'action', descriptionEn: '', descriptionHi: '', source: 'citizen' }])}>+ {pick('Add event', 'घटना जोड़ें')}</button></div>
        <div className="chronology-editor">{(chronology.length ? chronology : defaultChronology()).map((event, index) => <div key={index}><input type="datetime-local" value={event.occurredAt.slice(0, 16)} onChange={(e) => setChronology(updateChronology(chronology.length ? chronology : defaultChronology(), index, { occurredAt: e.target.value }))} /><select value={event.eventType} onChange={(e) => setChronology(updateChronology(chronology.length ? chronology : defaultChronology(), index, { eventType: e.target.value as ChronologyDraft['eventType'] }))}><option value="contact">Contact</option><option value="transaction">Transaction</option><option value="discovery">Discovery</option><option value="action">Citizen action</option><option value="other">Other</option></select><input value={event.descriptionEn} aria-label="Event description" onChange={(e) => setChronology(updateChronology(chronology.length ? chronology : defaultChronology(), index, { descriptionEn: e.target.value }))} /><button className="text-button danger" onClick={() => setChronology((chronology.length ? chronology : defaultChronology()).filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div>
      </section>
    </div>

    <aside className="workspace-sidebar"><section className="readiness-panel"><p className="eyebrow">{pick('Readiness checks', 'तैयारी जाँच')}</p><h2>{pick('What the file still needs', 'फ़ाइल को अभी क्या चाहिए')}</h2>{readiness.issues.length ? <ul>{readiness.issues.map((issue) => <li key={issue.code} className={issue.severity}><span>{issue.severity === 'blocker' ? '!' : 'i'}</span><p>{locale === 'hi' ? issue.messageHi : issue.messageEn}</p></li>)}</ul> : <div className="all-clear"><span>✓</span>{pick('All checks passed.', 'सभी जाँच पूरी।')}</div>}</section>
      <section className="document-preview"><div className="preview-top"><span>FIRST30</span><small>{pick('LIVE PREVIEW', 'लाइव प्रीव्यू')}</small></div><h3>{pick('Fraud response file', 'फ्रॉड रिस्पॉन्स फ़ाइल')}</h3><dl><div><dt>{pick('Amount', 'राशि')}</dt><dd>₹{Number(form.amount || 0).toLocaleString('en-IN')}</dd></div><div><dt>{pick('Reference', 'संदर्भ')}</dt><dd>{form.reference || 'Unknown'}</dd></div><div><dt>{pick('Evidence', 'प्रमाण')}</dt><dd>{bundle.evidence.length} {pick('files', 'फ़ाइलें')}</dd></div></dl><div className="preview-complaint"><strong>{pick('Citizen complaint', 'नागरिक शिकायत')}</strong><p>{locale === 'hi' ? complaints.complaintHi : complaints.complaintEn}</p></div><div className="preview-includes">PDF · JSON · {pick('Original evidence', 'मूल प्रमाण')} · SHA-256</div></section>
      <button className="build-file-button" disabled={Boolean(busy) || readiness.blockers > 0} onClick={() => void exportFile()}><span>{busy === 'export' ? pick('Building verified package…', 'सत्यापित पैकेज बन रहा है…') : pick('Build response file', 'रिस्पॉन्स फ़ाइल बनाएँ')}</span><small>{pick('Download signed ZIP + bilingual PDF', 'हस्ताक्षरित ZIP + द्विभाषी PDF डाउनलोड करें')}</small></button>
      <p className="export-boundary">{pick('FIRST30 prepares and verifies the file. It does not submit it or claim that money was recovered.', 'FIRST30 फ़ाइल तैयार और सत्यापित करता है। यह उसे जमा नहीं करता और राशि वापसी का दावा नहीं करता।')}</p>
      {latestExport && <section className="export-record"><span>{pick('Latest verified package', 'नवीनतम सत्यापित पैकेज')}</span><strong>{String(latestExport.verification_code)}</strong><small>Version {String(latestExport.version)} · {new Date(Number(latestExport.created_at)).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN')}</small><Link href="/verify">{pick('Verify a manifest', 'मैनिफेस्ट सत्यापित करें')} →</Link></section>}
    </aside></div>

    {latestExport && <section className="milestone-section"><div><p className="eyebrow">{pick('Citizen-owned follow-up', 'नागरिक द्वारा दर्ज फॉलो-अप')}</p><h2>{pick('Record what actually happened next', 'वास्तव में आगे क्या हुआ, दर्ज करें')}</h2><p>{pick('FIRST30 shows an external action only after the citizen enters its real acknowledgement or note.', 'FIRST30 बाहरी कार्रवाई तभी दिखाता है जब नागरिक वास्तविक पावती या नोट दर्ज करता है।')}</p></div><div className="milestone-form"><select value={milestone.kind} onChange={(e) => setMilestone({ ...milestone, kind: e.target.value })}><option value="bank_contacted">Bank contacted</option><option value="helpline_called">1930 called</option><option value="cyber_report_submitted">Cybercrime report submitted</option><option value="follow_up">Follow-up recorded</option></select><input placeholder={pick('Acknowledgement or reference', 'पावती या संदर्भ')} value={milestone.reference} onChange={(e) => setMilestone({ ...milestone, reference: e.target.value })} /><input type="datetime-local" value={milestone.occurredAt} onChange={(e) => setMilestone({ ...milestone, occurredAt: e.target.value })} /><input placeholder={pick('Optional note', 'वैकल्पिक नोट')} value={milestone.notes} onChange={(e) => setMilestone({ ...milestone, notes: e.target.value })} /><button className="primary-button" disabled={Boolean(busy)} onClick={() => void addMilestone()}>{pick('Record milestone', 'माइलस्टोन दर्ज करें')}</button></div><div className="milestone-list">{bundle.milestones.map((item) => <div key={String(item.id)}><span>✓</span><div><strong>{milestoneLabel(String(item.kind), locale)}</strong><p>{String(item.reference || item.notes || pick('Citizen recorded this action.', 'नागरिक ने यह कार्रवाई दर्ज की।'))}</p><small>{new Date(String(item.occurred_at)).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN')}</small></div></div>)}</div></section>}
    {error && <div className="error-banner workspace-error" role="alert">{error}</div>}
  </section><SafetyFooter /></main>;
}

function FieldWithUnknown({ label, value, onChange, onUnknown, pick }: { label: string; value: string; onChange: (value: string) => void; onUnknown: () => void; pick: (en: string, hi: string) => string }) {
  return <label>{label}<span className="field-with-action"><input value={value} onChange={(event) => onChange(event.target.value)} /><button type="button" onClick={onUnknown}>{pick('Unknown', 'अज्ञात')}</button></span></label>;
}

function updateChronology(items: ChronologyDraft[], index: number, patch: Partial<ChronologyDraft>) { return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item); }

function milestoneLabel(kind: string, locale: string) {
  const labels: Record<string, [string, string]> = { bank_contacted: ['Bank contacted', 'बैंक से संपर्क'], helpline_called: ['1930 called', '1930 पर कॉल'], cyber_report_submitted: ['Cybercrime report submitted', 'साइबर क्राइम रिपोर्ट जमा'], follow_up: ['Follow-up recorded', 'फॉलो-अप दर्ज'] };
  const value = labels[kind] || [kind, kind]; return locale === 'hi' ? value[1] : value[0];
}
