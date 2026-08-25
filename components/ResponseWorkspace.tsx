'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';
import { DEMO_NARRATIVE, type EvidenceKind, type FactKey, type Observation } from '@/lib/contracts';
import { analyseEvidenceLocally, analyseManualText, createSampleEvidenceSet, type OcrMethod } from '@/lib/client-ocr';
import { buildResponsePackage } from '@/lib/client-export';
import { api } from '@/lib/client-api';

type Row = Record<string, string | number | null>;
type ObservationRow = Observation & { id?: string; evidenceId: string; evidenceKind: string; filename: string };
type Resolution = { field: FactKey; value: string; normalizedValue: string; resolutionType: 'evidence' | 'manual' | 'unknown'; sourceEvidenceId?: string | null };
type Passport = { coverage: { present: number; total: number }; counts: { passed: number; conflicts: number; missing: number; unknownFacts: number }; checks: Array<{ code: string; status: 'pass' | 'conflict' | 'missing'; titleEn: string; titleHi: string; detailEn: string; detailHi: string; evidenceIds: string[] }>; facts: Array<{ field: FactKey; resolution: Resolution | null; observations: ObservationRow[] }> };
type Bundle = { case: Row; evidence: Row[]; chronology: Row[]; milestones: Row[]; exports: Row[]; readiness: { blockers: number }; observations: ObservationRow[]; resolutions: Resolution[]; passport: Passport; findings: Row[]; custody: Row[] };
type Pending = { id: string; kind: EvidenceKind; filename: string; text: string; observations: Observation[]; ocrMethod: OcrMethod; clientSha256: string };

const FACTS: FactKey[] = ['amount', 'reference', 'recipient', 'institution', 'phone', 'occurred_at'];
const KIND_COPY: Record<EvidenceKind, [string, string]> = { receipt: ['Payment receipt', 'भुगतान रसीद'], chat: ['Scam conversation', 'ठगी बातचीत'], call_log: ['Call log', 'कॉल लॉग'], bank_statement: ['Bank statement', 'बैंक स्टेटमेंट'] };

export function ResponseWorkspace({ caseId: suppliedCaseId }: { caseId?: string }) {
  const { locale, pick } = useLocale(); const started = useRef(false);
  const [caseId, setCaseId] = useState(suppliedCaseId || ''); const [bundle, setBundle] = useState<Bundle | null>(null);
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState<Pending | null>(null);
  const [factDrafts, setFactDrafts] = useState<Record<FactKey, Resolution | null>>({ amount: null, reference: null, recipient: null, institution: null, phone: null, occurred_at: null });
  const [ackNotes, setAckNotes] = useState<Record<string, string>>({});

  const applyBundle = useCallback((next: Bundle) => {
    setBundle(next); const drafts = {} as Record<FactKey, Resolution | null>;
    for (const field of FACTS) {
      const resolved = next.resolutions.find((item) => item.field === field);
      const preferred = next.observations.find((item) => item.field === field && ((field === 'amount' || field === 'reference' || field === 'recipient' || field === 'institution' || field === 'occurred_at') ? item.evidenceKind === 'receipt' : item.evidenceKind === 'call_log')) || next.observations.find((item) => item.field === field);
      drafts[field] = resolved || (preferred ? { field, value: preferred.value, normalizedValue: preferred.normalizedValue, resolutionType: 'evidence', sourceEvidenceId: preferred.evidenceId } : { field, value: 'Unknown', normalizedValue: 'unknown', resolutionType: 'unknown', sourceEvidenceId: null });
    }
    setFactDrafts(drafts);
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

  async function uploadEvidence(file: File, kind: EvidenceKind, sample = false, autoConfirm = false) {
    const local = await analyseEvidenceLocally(file, kind, { sample }); const data = new FormData();
    data.set('synthetic', 'true'); data.set('kind', kind); data.set('file', file); if (sample) data.set('sample', 'true');
    const uploaded = await api<{ id: string; filename: string }>(`/api/cases/${caseId}/evidence`, { method: 'POST', body: data });
    const analysis: Pending = { id: uploaded.id, kind, filename: uploaded.filename, ...local };
    if (autoConfirm) await confirmAnalysis(analysis); else { setPending(analysis); await refresh(caseId); }
    return analysis;
  }

  async function confirmAnalysis(analysis = pending) {
    if (!analysis) return;
    await api(`/api/cases/${caseId}/evidence/${analysis.id}/confirm`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ocrText: analysis.text, ocrMethod: analysis.ocrMethod, clientSha256: analysis.clientSha256, observations: analysis.observations }) });
    if (pending?.id === analysis.id) setPending(null); await refresh(caseId);
  }

  async function loadDemo() {
    setBusy('demo'); setError('');
    try {
      if (bundle?.evidence.length) throw new Error(pick('Remove existing evidence before loading the built-in case.', 'बिल्ट-इन केस लोड करने से पहले मौजूदा प्रमाण हटाएँ।'));
      const samples = await createSampleEvidenceSet();
      for (const sample of samples) await uploadEvidence(sample.file, sample.kind, true, true);
      const latest = await refresh(caseId); await saveFacts(suggestFacts(latest));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load the evidence set.'); } finally { setBusy(''); }
  }

  async function saveFacts(facts = factDrafts) {
    const payload = FACTS.map((field) => facts[field]).filter(Boolean);
    const next = await api<Bundle>(`/api/cases/${caseId}/facts`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ facts: payload }) });
    applyBundle(next); return next;
  }

  async function buildPassport() {
    setBusy('export'); setError('');
    try {
      await saveFacts();
      await api(`/api/cases/${caseId}/draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ narrative: String(bundle?.case.narrative_input || DEMO_NARRATIVE) }) });
      const latest = await api<Bundle>(`/api/cases/${caseId}/passport`); applyBundle(latest);
      await buildResponsePackage(caseId, latest); window.localStorage.removeItem('f30_active_case'); await refresh(caseId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not build the Evidence Passport.'); } finally { setBusy(''); }
  }

  async function removeEvidence(id: string) {
    setBusy('remove'); setError(''); try { await api(`/api/cases/${caseId}/evidence/${id}`, { method: 'DELETE' }); await refresh(caseId); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not remove evidence.'); } finally { setBusy(''); }
  }

  async function acknowledgeFinding(id: string) {
    const note = ackNotes[id]?.trim(); if (!note) return;
    setBusy('finding'); try { const next = await api<Bundle>(`/api/cases/${caseId}/findings/${id}/acknowledge`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note }) }); applyBundle(next); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the explanation.'); } finally { setBusy(''); }
  }

  if (!bundle) return <main className="site-shell"><Header compact /><div className="loading-state" role="status">{error || pick('Opening the Evidence Passport…', 'एविडेंस पासपोर्ट खुल रहा है…')}</div></main>;
  const latestExport = bundle.exports[0];
  return <main className="site-shell"><Header compact /><section className="passport-workspace">
    <header className="passport-titlebar"><div>{suppliedCaseId && <Link href="/cases" className="back-link">← {pick('All passports', 'सभी पासपोर्ट')}</Link>}<p className="eyebrow">{pick('Source-linked evidence workspace', 'स्रोत-संबद्ध प्रमाण कार्यक्षेत्र')}</p><h1>{pick('Know what your evidence proves.', 'जानें कि आपका प्रमाण क्या साबित करता है।')}</h1><p>{pick('AI writes. FIRST30 traces every fact back to evidence, exposes conflicts and packages the result without claiming the report was accepted.', 'AI लिखता है। FIRST30 हर तथ्य को प्रमाण से जोड़ता है, विरोध दिखाता है और रिपोर्ट स्वीकार होने का दावा किए बिना पैकेज बनाता है।')}</p></div><button className="demo-set-button" disabled={Boolean(busy)} onClick={() => void loadDemo()}><span>{pick('3-file judged demo', '3-फ़ाइल जज्ड डेमो')}</span><strong>{busy === 'demo' ? pick('Analysing locally…', 'स्थानीय विश्लेषण…') : pick('Load synthetic evidence set', 'काल्पनिक प्रमाण सेट लोड करें')}</strong><small>{pick('Includes one deliberate mismatch', 'एक जानबूझकर अंतर शामिल है')}</small></button></header>

    <div className="passport-layout"><aside className="evidence-rail"><div className="rail-heading"><p className="eyebrow">{pick('Evidence rail', 'प्रमाण सूची')}</p><h2>{bundle.passport.coverage.present}/{bundle.passport.coverage.total} {pick('types present', 'प्रकार मौजूद')}</h2></div>{(['receipt', 'chat', 'call_log'] as EvidenceKind[]).map((kind) => {
      const item = bundle.evidence.find((evidence) => evidence.kind === kind); return <article key={kind} className={`evidence-source-card ${item ? 'has-evidence' : ''}`}><div><span>{kind === 'receipt' ? '₹' : kind === 'chat' ? '“”' : '☎'}</span><div><strong>{pick(...KIND_COPY[kind])}</strong><small>{item ? `${String(item.filename)} · ${item.analysis_status === 'confirmed' ? pick('Analysed', 'विश्लेषित') : pick('Review needed', 'समीक्षा आवश्यक')}` : pick('Not added', 'नहीं जोड़ा')}</small></div></div>{item ? <><code>{String(item.sha256 || '').slice(0, 12)}…</code><button className="text-button danger" onClick={() => void removeEvidence(String(item.id))}>{pick('Remove', 'हटाएँ')}</button></> : <label className="rail-upload">+ {pick('Choose image', 'चित्र चुनें')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file, kind).catch((caught) => setError(caught instanceof Error ? caught.message : 'Upload failed.')); event.target.value = ''; }} /></label>}</article>;
    })}<section className="custody-mini"><strong>{pick('Chain of custody', 'अभिरक्षा श्रृंखला')}</strong><span>{bundle.custody.length} {pick('recorded events', 'दर्ज घटनाएँ')}</span><small>{pick('Added · analysed · confirmed · exported', 'जोड़ा · विश्लेषित · पुष्ट · निर्यात')}</small></section></aside>

    <section className="fact-board"><div className="board-heading"><div><p className="eyebrow">{pick('Source-linked fact board', 'स्रोत-संबद्ध तथ्य बोर्ड')}</p><h2>{pick('Every claim shows its support', 'हर दावे का प्रमाण दिखता है')}</h2></div><button className="secondary-button" disabled={Boolean(busy)} onClick={() => void saveFacts().catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not save facts.'))}>{pick('Confirm source-linked facts', 'स्रोत-संबद्ध तथ्य पुष्ट करें')}</button></div>
      <div className="source-facts">{FACTS.map((field) => { const draft = factDrafts[field]; const observations = bundle.observations.filter((item) => item.field === field); return <article key={field}><div className="fact-label"><span>{factLabel(field, locale)}</span><small>{draft?.resolutionType === 'evidence' ? pick('Evidence supported', 'प्रमाण समर्थित') : draft?.resolutionType === 'manual' ? pick('Manually entered', 'मैनुअल प्रविष्टि') : pick('Unknown', 'अज्ञात')}</small></div><input value={draft?.value || ''} onChange={(event) => setFactDrafts((current) => ({ ...current, [field]: { field, value: event.target.value, normalizedValue: event.target.value, resolutionType: event.target.value === 'Unknown' ? 'unknown' : 'manual', sourceEvidenceId: null } }))} /><div className="source-chips">{observations.map((observation) => <button key={`${observation.evidenceId}-${observation.normalizedValue}`} className={draft?.sourceEvidenceId === observation.evidenceId && draft?.normalizedValue === observation.normalizedValue ? 'selected' : ''} title={observation.sourceText} onClick={() => setFactDrafts((current) => ({ ...current, [field]: { field, value: observation.value, normalizedValue: observation.normalizedValue, resolutionType: 'evidence', sourceEvidenceId: observation.evidenceId } }))}>{kindShort(observation.evidenceKind)} · {observation.value}</button>)}<button onClick={() => setFactDrafts((current) => ({ ...current, [field]: { field, value: 'Unknown', normalizedValue: 'unknown', resolutionType: 'unknown', sourceEvidenceId: null } }))}>{pick('Unknown', 'अज्ञात')}</button></div></article>; })}</div>
      <section className="chronology-passport"><div><p className="eyebrow">{pick('Evidence chronology', 'प्रमाण समयरेखा')}</p><h3>{pick('Sequence reconstructed from source timestamps', 'स्रोत समय से बनी घटना श्रृंखला')}</h3></div><ol>{bundle.observations.filter((item) => item.field === 'occurred_at').sort((a,b) => a.value.localeCompare(b.value)).map((item) => <li key={`${item.evidenceId}-${item.value}`}><time>{item.value.replace('T',' ')}</time><span>{kindShort(item.evidenceKind)} · {item.sourceText}</span></li>)}</ol></section>
    </section>

    <aside className="sufficiency-panel"><p className="eyebrow">{pick('Evidence sufficiency', 'प्रमाण पर्याप्तता')}</p><h2>{bundle.passport.counts.conflicts ? pick('Conflicts found', 'विरोध मिले') : bundle.passport.counts.missing ? pick('Incomplete evidence', 'अपूर्ण प्रमाण') : pick('Passport ready', 'पासपोर्ट तैयार')}</h2><div className="exact-counts"><div><strong>{bundle.passport.counts.passed}</strong><span>{pick('checks passed', 'जाँच पास')}</span></div><div className="conflict"><strong>{bundle.passport.counts.conflicts}</strong><span>{pick('conflicts', 'विरोध')}</span></div><div><strong>{bundle.passport.counts.unknownFacts}</strong><span>{pick('unknown facts', 'अज्ञात तथ्य')}</span></div></div><div className="check-list">{bundle.passport.checks.map((check) => <div key={check.code} className={`check-${check.status}`}><span>{check.status === 'pass' ? '✓' : check.status === 'conflict' ? '!' : '–'}</span><p><strong>{locale === 'hi' ? check.titleHi : check.titleEn}</strong><small>{locale === 'hi' ? check.detailHi : check.detailEn}</small></p></div>)}</div>{bundle.findings.filter((item) => item.status === 'conflict').map((finding) => <div className="finding-note" key={String(finding.id)}><strong>{pick('Conflict remains in export', 'विरोध निर्यात में रहेगा')}</strong>{finding.acknowledgement_note ? <p>{String(finding.acknowledgement_note)}</p> : <><input placeholder={pick('Add citizen explanation', 'नागरिक स्पष्टीकरण जोड़ें')} value={ackNotes[String(finding.id)] || ''} onChange={(e) => setAckNotes({ ...ackNotes, [String(finding.id)]: e.target.value })} /><button onClick={() => void acknowledgeFinding(String(finding.id))}>{pick('Attach explanation', 'स्पष्टीकरण जोड़ें')}</button></>}</div>)}<button className="build-passport-button" disabled={Boolean(busy) || !bundle.evidence.length} onClick={() => void buildPassport()}><span>{busy === 'export' ? pick('Building passport…', 'पासपोर्ट बन रहा है…') : pick('Build Evidence Passport', 'एविडेंस पासपोर्ट बनाएँ')}</span><small>{pick('Signed ZIP · bilingual PDF · originals', 'हस्ताक्षरित ZIP · द्विभाषी PDF · मूल फ़ाइलें')}</small></button>{latestExport && <div className="passport-export-record"><strong>{String(latestExport.verification_code)}</strong><small>Version {String(latestExport.version)}</small><Link href="/verify">{pick('Verify complete ZIP', 'पूरा ZIP सत्यापित करें')} →</Link></div>}<p className="export-boundary">{pick('Integrity and consistency—not truth, acceptance or recovery.', 'अखंडता और संगति—सत्य, स्वीकृति या राशि वापसी नहीं।')}</p></aside></div>

    {pending && <div className="analysis-drawer" role="dialog" aria-modal="true"><div><p className="eyebrow">{pick('Local evidence analysis', 'स्थानीय प्रमाण विश्लेषण')}</p><h2>{pick('Review the extracted source text', 'निकाला गया स्रोत पाठ जाँचें')}</h2><p>{pending.filename} · {pending.ocrMethod === 'manual' ? pick('Manual fallback', 'मैनुअल विकल्प') : pick('Browser-local reader', 'ब्राउज़र-स्थानीय रीडर')}</p><textarea value={pending.text} onChange={(event) => { const analysed = analyseManualText(pending.kind, event.target.value); setPending({ ...pending, text: analysed.text, observations: analysed.observations, ocrMethod: analysed.ocrMethod }); }} placeholder={pick('Paste or type the visible text from this synthetic image.', 'इस काल्पनिक चित्र का दिखाई देने वाला पाठ लिखें।')} /><div className="observation-preview">{pending.observations.map((item, index) => <span key={`${item.field}-${index}`}>{item.field}: {item.value}</span>)}</div><div className="drawer-actions"><button className="text-button" onClick={() => setPending(null)}>{pick('Close', 'बंद करें')}</button><button className="primary-button" disabled={!pending.observations.length} onClick={() => void confirmAnalysis().catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not confirm analysis.'))}>{pick('Confirm analysis', 'विश्लेषण पुष्ट करें')}</button></div></div></div>}
    {error && <div className="error-banner workspace-error" role="alert">{error}</div>}
  </section><SafetyFooter /></main>;
}

function suggestFacts(bundle: Bundle) {
  const drafts = {} as Record<FactKey, Resolution | null>;
  for (const field of FACTS) { const observation = bundle.observations.find((item) => item.field === field && (field === 'phone' ? item.evidenceKind === 'call_log' : item.evidenceKind === 'receipt')) || bundle.observations.find((item) => item.field === field); drafts[field] = observation ? { field, value: observation.value, normalizedValue: observation.normalizedValue, resolutionType: 'evidence', sourceEvidenceId: observation.evidenceId } : { field, value: 'Unknown', normalizedValue: 'unknown', resolutionType: 'unknown', sourceEvidenceId: null }; }
  return drafts;
}
function kindShort(kind: string) { return kind === 'receipt' ? 'Receipt' : kind === 'chat' ? 'Chat' : 'Call log'; }
function factLabel(field: FactKey, locale: string) { const labels: Record<FactKey,[string,string]> = { amount:['Amount','राशि'],reference:['Transaction reference','लेन-देन संदर्भ'],recipient:['Recipient','प्राप्तकर्ता'],institution:['Institution','संस्था'],phone:['Caller phone','कॉलर फ़ोन'],occurred_at:['Transaction time','लेन-देन समय'] }; return labels[field][locale === 'hi' ? 1 : 0]; }
