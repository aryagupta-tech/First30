'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { useLocale } from './LocaleProvider';
import { DEMO_NARRATIVE } from '@/lib/contracts';

type CaseRow = Record<string, string | number | null>;
type Bundle = { case: CaseRow; evidence: Record<string, unknown>[]; events: Record<string, unknown>[]; requests: Record<string, unknown>[] };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}

export function ReportWizard() {
  const { locale, pick } = useLocale(); const router = useRouter(); const started = useRef(false);
  const [caseId, setCaseId] = useState(''); const [bundle, setBundle] = useState<Bundle | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [consent, setConsent] = useState(false);
  const [upload, setUpload] = useState<File | null>(null); const [narrative, setNarrative] = useState(DEMO_NARRATIVE);
  const [form, setForm] = useState({ channel: 'upi', amount: '18499', occurredAt: '2026-08-21T18:42', reference: '', bank: '', recipient: '' });

  const refresh = useCallback(async (id: string) => {
    const next = await api<Bundle>(`/api/cases/${id}`); setBundle(next);
    const row = next.case; setForm({
      channel: String(row.channel || 'upi'), amount: String(row.amount || 18499),
      occurredAt: String(row.occurred_at || '2026-08-21T18:42').slice(0,16), reference: String(row.reference || ''),
      bank: String(row.bank || ''), recipient: String(row.recipient || ''),
    });
    if (row.narrative_input) setNarrative(String(row.narrative_input));
  }, []);

  useEffect(() => {
    if (started.current) return; started.current = true;
    (async () => {
      try {
        const session = await api<{ active: boolean }>('/api/session');
        if (!session.active) await api('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale }) });
        const stored = window.localStorage.getItem('f30_active_case');
        if (stored) {
          try { await refresh(stored); setCaseId(stored); return; } catch { window.localStorage.removeItem('f30_active_case'); }
        }
        const created = await api<{ id: string }>('/api/cases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale }) });
        window.localStorage.setItem('f30_active_case', created.id); setCaseId(created.id); await refresh(created.id);
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start the demo.'); }
    })();
  }, [locale, refresh]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Please try again.'); } finally { setBusy(false); }
  }
  async function patchCase(values: Record<string, unknown>) {
    await api(`/api/cases/${caseId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) }); await refresh(caseId);
  }
  async function addEvidence(sample: boolean) {
    const data = new FormData(); data.set('synthetic', 'true'); data.set('kind', 'transaction_receipt');
    if (sample) data.set('sample', 'true'); else if (upload) data.set('file', upload); else throw new Error(pick('Choose an image first.', 'पहले एक तस्वीर चुनें।'));
    await api(`/api/cases/${caseId}/evidence`, { method: 'POST', body: data });
    const extracted = await api<{ source: string; extraction: unknown }>(`/api/cases/${caseId}/extract`, { method: 'POST' });
    if (extracted.source === 'manual_required') setError(pick('AI could not read this image. Enter the details manually.', 'AI इस तस्वीर को नहीं पढ़ सका। विवरण स्वयं भरें।'));
    await refresh(caseId);
  }
  async function draft() {
    const result = await api<{ complaintEn: string; complaintHi: string }>(`/api/cases/${caseId}/draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ narrative }) });
    setBundle((current) => current ? { ...current, case: { ...current.case, complaint_en: result.complaintEn, complaint_hi: result.complaintHi, step: 5 } } : current);
    await refresh(caseId);
  }
  async function submit() {
    await api(`/api/cases/${caseId}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consent }) });
    window.localStorage.removeItem('f30_active_case'); router.push(`/cases/${caseId}`);
  }

  if (!bundle) return <main className="app-shell"><Header compact /><div className="loading-state" role="status">{error || pick('Preparing Sunita’s synthetic case…', 'सुनीता का काल्पनिक केस तैयार हो रहा है…')}</div></main>;
  const row = bundle.case; const step = Number(row.step || 1);
  const steps = [pick('Incident', 'घटना'), pick('Evidence', 'प्रमाण'), pick('Confirm', 'पुष्टि'), pick('Statement', 'विवरण'), pick('Review', 'समीक्षा')];

  return (
    <main className="app-shell">
      <Header compact />
      <div className="wizard-layout">
        <aside className="wizard-aside">
          <p className="eyebrow">{pick('New demo report', 'नई डेमो रिपोर्ट')}</p>
          <h2>{pick('Sunita’s financial fraud report', 'सुनीता की वित्तीय धोखाधड़ी रिपोर्ट')}</h2>
          <p>{pick('One focused question at a time. Your progress is saved automatically.', 'एक समय में एक सरल प्रश्न। आपकी प्रगति अपने-आप सहेजी जाती है।')}</p>
          <ol className="wizard-progress">{steps.map((label,index) => <li className={step === index + 1 ? 'current' : step > index + 1 ? 'done' : ''} key={label}><span>{step > index + 1 ? '✓' : index + 1}</span>{label}</li>)}</ol>
        </aside>
        <section className="wizard-panel" aria-live="polite">
          <div className="panel-kicker">{pick(`Step ${step} of 5`, `चरण ${step} / 5`)}</div>
          {step === 1 && <>
            <h1>{pick('How did the money leave the account?', 'खाते से पैसे कैसे निकले?')}</h1>
            <p className="panel-intro">{pick('Choose the payment method used in this synthetic case.', 'इस काल्पनिक केस में उपयोग किया गया भुगतान तरीका चुनें।')}</p>
            <div className="choice-grid">{[
              ['upi','UPI','यूपीआई'],['card','Card','कार्ड'],['bank_transfer','Bank transfer','बैंक ट्रांसफर'],['wallet','Wallet','वॉलेट'],
            ].map(([value,en,hi]) => <button type="button" className={form.channel === value ? 'choice-card selected' : 'choice-card'} onClick={() => setForm({...form,channel:value})} key={value}><span className="choice-icon">{value === 'upi' ? '₹' : value === 'card' ? '▣' : value === 'bank_transfer' ? '↗' : '◫'}</span><strong>{pick(en,hi)}</strong><small>{pick('Synthetic transaction', 'काल्पनिक लेन-देन')}</small></button>)}</div>
            <div className="fact-box"><strong>{pick('Selected scenario', 'चुना गया परिदृश्य')}</strong><span>{pick('Fake bank KYC call resulting in financial loss', 'फर्जी बैंक केवाईसी कॉल से वित्तीय नुकसान')}</span></div>
            <button className="primary-button panel-action" disabled={busy} onClick={() => run(() => patchCase({ channel: form.channel, fraudType: 'fake_kyc', step: 2 }))}>{pick('Continue to evidence', 'प्रमाण पर जाएँ')} →</button>
          </>}
          {step === 2 && <>
            <h1>{pick('Add transaction evidence', 'लेन-देन का प्रमाण जोड़ें')}</h1>
            <p className="panel-intro">{pick('Use our safe sample for the judged journey, or upload your own synthetic screenshot.', 'जज डेमो के लिए सुरक्षित नमूना उपयोग करें या अपनी काल्पनिक तस्वीर अपलोड करें।')}</p>
            <button className="sample-receipt" type="button" onClick={() => run(() => addEvidence(true))} disabled={busy}>
              <span className="sample-badge">{pick('Recommended demo', 'सुझाया गया डेमो')}</span>
              <span className="receipt-bank">Bharat Cooperative Bank</span><strong>₹18,499.00</strong><small>UPI · UTR826194730521</small>
              <span className="use-sample">{busy ? pick('Reading evidence…', 'प्रमाण पढ़ा जा रहा है…') : pick('Use this sample receipt →', 'यह नमूना उपयोग करें →')}</span>
            </button>
            <div className="upload-row"><label className="upload-button">{pick('Choose synthetic image', 'काल्पनिक तस्वीर चुनें')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setUpload(event.target.files?.[0] || null)} /></label><span>{upload?.name || pick('PNG, JPEG or WebP · max 5 MB', 'PNG, JPEG या WebP · अधिकतम 5 MB')}</span></div>
            {upload && <button className="secondary-button" disabled={busy} onClick={() => run(() => addEvidence(false))}>{pick('Extract details with AI', 'AI से विवरण निकालें')}</button>}
          </>}
          {step === 3 && <>
            <h1>{pick('Confirm the extracted details', 'निकाले गए विवरण की पुष्टि करें')}</h1>
            <p className="panel-intro">{pick('AI suggestions are never submitted until the citizen confirms them.', 'नागरिक की पुष्टि के बिना AI सुझाव जमा नहीं किए जाते।')}</p>
            <div className="form-grid">
              <label>{pick('Amount lost', 'गई हुई राशि')}<input inputMode="numeric" value={form.amount} onChange={(e) => setForm({...form,amount:e.target.value})} /></label>
              <label>{pick('Payment method', 'भुगतान तरीका')}<select value={form.channel} onChange={(e) => setForm({...form,channel:e.target.value})}><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="wallet">Wallet</option></select></label>
              <label>{pick('Transaction reference', 'लेन-देन संदर्भ')}<input value={form.reference} onChange={(e) => setForm({...form,reference:e.target.value})} /></label>
              <label>{pick('Date and time', 'दिनांक और समय')}<input type="datetime-local" value={form.occurredAt} onChange={(e) => setForm({...form,occurredAt:e.target.value})} /></label>
              <label>{pick('Bank or wallet', 'बैंक या वॉलेट')}<input value={form.bank} onChange={(e) => setForm({...form,bank:e.target.value})} /></label>
              <label>{pick('Recipient identifier', 'प्राप्तकर्ता पहचान')}<input value={form.recipient} onChange={(e) => setForm({...form,recipient:e.target.value})} /></label>
            </div>
            <div className="ai-note"><span>AI</span>{pick('Every field remains editable. Confidence is based only on visible sample evidence.', 'हर फ़ील्ड बदला जा सकता है। विश्वास केवल दिखने वाले काल्पनिक प्रमाण पर आधारित है।')}</div>
            <button className="primary-button panel-action" disabled={busy} onClick={() => run(() => patchCase({ ...form, amount: Number(form.amount), step: 4 }))}>{pick('Confirm details', 'विवरण की पुष्टि करें')} →</button>
          </>}
          {step === 4 && <>
            <h1>{pick('Describe what happened', 'बताएँ क्या हुआ')}</h1>
            <p className="panel-intro">{pick('Write naturally. FIRST30 will create a factual complaint without adding new claims.', 'स्वाभाविक रूप से लिखें। FIRST30 बिना नई बातें जोड़े तथ्यात्मक शिकायत बनाएगा।')}</p>
            <label className="textarea-label">{pick('Citizen’s own words', 'नागरिक के अपने शब्द')}<textarea rows={8} value={narrative} onChange={(e) => setNarrative(e.target.value)} maxLength={2000} /><span>{narrative.length}/2000</span></label>
            <button className="primary-button panel-action" disabled={busy || narrative.trim().length < 30} onClick={() => run(draft)}>{busy ? pick('Structuring complaint…', 'शिकायत तैयार हो रही है…') : pick('Create bilingual complaint', 'द्विभाषी शिकायत बनाएँ')} →</button>
          </>}
          {step === 5 && <>
            <h1>{pick('Review and submit', 'समीक्षा करें और जमा करें')}</h1>
            <p className="panel-intro">{pick('This creates a case only inside FIRST30’s simulated backend.', 'यह केस केवल FIRST30 के काल्पनिक बैकएंड में बनेगा।')}</p>
            <div className="review-summary"><div><span>{pick('Amount', 'राशि')}</span><strong>₹{Number(row.amount || 18499).toLocaleString('en-IN')}</strong></div><div><span>{pick('Channel', 'माध्यम')}</span><strong>{String(row.channel || 'upi').toUpperCase()}</strong></div><div><span>{pick('Reference', 'संदर्भ')}</span><strong>{String(row.reference || '—')}</strong></div></div>
            <article className="complaint-preview"><div className="complaint-header"><strong>{pick('Structured complaint', 'व्यवस्थित शिकायत')}</strong><span>{locale === 'hi' ? 'हिंदी' : 'English'}</span></div><p>{String(locale === 'hi' ? row.complaint_hi : row.complaint_en)}</p></article>
            <label className="consent-row"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{pick('I understand this is a synthetic submission and no government, police or bank system will be contacted.', 'मैं समझती हूँ कि यह काल्पनिक सबमिशन है और किसी सरकारी, पुलिस या बैंक सिस्टम से संपर्क नहीं होगा।')}</span></label>
            <button className="primary-button panel-action" disabled={busy || !consent} onClick={() => run(submit)}>{busy ? pick('Submitting…', 'जमा हो रहा है…') : pick('Submit demo report', 'डेमो रिपोर्ट जमा करें')} →</button>
          </>}
          {error && <div className="error-banner" role="alert">{error}</div>}
        </section>
      </div>
    </main>
  );
}
