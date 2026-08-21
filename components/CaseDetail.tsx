'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

type Row = Record<string, string | number | null>;
type Bundle = { case: Row; evidence: Row[]; events: Row[]; requests: Row[]; restoration?: Row | null };

export function CaseDetail({ id }: { id: string }) {
  const { locale, pick } = useLocale(); const [bundle, setBundle] = useState<Bundle | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [consent, setConsent] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/cases/${id}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Case unavailable');
      if (active) setBundle(data);
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Case unavailable'); });
    return () => { active = false; };
  }, [id]);
  async function action(path: string, body?: unknown) { setBusy(true); setError(''); try { const response = await fetch(`/api/cases/${id}/${path}`, { method: 'POST', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Please try again.'); setBundle(data); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Please try again.'); } finally { setBusy(false); } }
  if (!bundle) return <main className="app-shell"><Header compact /><div className="loading-state">{error || pick('Loading case…', 'केस लोड हो रहा है…')}</div></main>;
  const row = bundle.case; const status = String(row.status); const events = [...bundle.events].reverse();
  return <main className="site-shell"><Header compact /><section className="case-page">
    <Link className="back-link" href="/cases">← {pick('All cases', 'सभी केस')}</Link>
    <div className="case-hero"><div><span className={`status-badge status-${status}`}>{pick(status === 'partially_restored' ? 'Partially restored' : status === 'funds_held' ? 'Funds held' : 'Action required', status === 'partially_restored' ? 'आंशिक वापसी' : status === 'funds_held' ? 'राशि होल्ड' : 'कार्रवाई आवश्यक')}</span><h1>{pick('Fake KYC UPI fraud', 'फर्जी केवाईसी यूपीआई धोखाधड़ी')}</h1><p>{String(row.acknowledgement || 'FIRST30 demo case')}</p></div><div className="loss-summary"><span>{pick('Reported loss', 'रिपोर्ट किया नुकसान')}</span><strong>₹{Number(row.amount).toLocaleString('en-IN')}</strong>{Number(row.restored_amount) > 0 && <small>{pick(`₹${Number(row.restored_amount).toLocaleString('en-IN')} restored`, `₹${Number(row.restored_amount).toLocaleString('en-IN')} वापस`)}</small>}</div></div>
    <div className="case-grid"><div className="case-main">
      {status === 'action_required' && <section className="action-card urgent-card"><div className="action-icon">!</div><div><p className="eyebrow">{pick('Action needed', 'कार्रवाई आवश्यक')}</p><h2>{pick('Add a synthetic bank statement', 'काल्पनिक बैंक स्टेटमेंट जोड़ें')}</h2><p>{pick('The mock bank needs one more document to confirm the debit and continue tracing the transaction.', 'काल्पनिक बैंक को लेन-देन की पुष्टि और जाँच जारी रखने के लिए एक और दस्तावेज़ चाहिए।')}</p><button className="primary-button" disabled={busy} onClick={() => action('respond')}>{busy ? pick('Adding evidence…', 'प्रमाण जोड़ा जा रहा है…') : pick('Use sample bank statement', 'नमूना बैंक स्टेटमेंट उपयोग करें')} →</button></div></section>}
      {status === 'funds_held' && <section className="action-card success-card"><div className="action-icon">₹</div><div><p className="eyebrow">{pick('Restoration available', 'राशि वापसी उपलब्ध')}</p><h2>{pick('₹12,000 has been marked as held', '₹12,000 होल्ड के रूप में दर्ज है')}</h2><p>{pick('Confirm Sunita’s masked demo account ending in 4210 to complete the simulated restoration.', 'काल्पनिक वापसी पूरी करने के लिए 4210 पर समाप्त होने वाले सुनीता के डेमो खाते की पुष्टि करें।')}</p><label className="consent-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{pick('Restore to the masked synthetic account •••• 4210', 'काल्पनिक खाते •••• 4210 में वापस करें')}</span></label><button className="primary-button" disabled={busy || !consent} onClick={() => action('restore', { consent: true })}>{busy ? pick('Restoring…', 'वापसी जारी…') : pick('Confirm mock restoration', 'काल्पनिक वापसी की पुष्टि करें')} →</button></div></section>}
      {status === 'partially_restored' && <section className="restored-card"><span className="restored-check">✓</span><p className="eyebrow">{pick('Restoration complete', 'राशि वापसी पूरी')}</p><h2>{pick('₹12,000 was partially restored', '₹12,000 आंशिक रूप से वापस हुए')}</h2><p>{pick('₹6,499 remains under simulated review. Every action is recorded below.', '₹6,499 की काल्पनिक समीक्षा जारी है। हर कार्रवाई नीचे दर्ज है।')}</p></section>}
      <section className="timeline-card"><div className="section-heading"><div><p className="eyebrow">{pick('Case timeline', 'केस समयरेखा')}</p><h2>{pick('What happened next', 'आगे क्या हुआ')}</h2></div><span>{events.length} {pick('updates', 'अपडेट')}</span></div><ol className="case-timeline">{events.map((event,index) => <li key={String(event.id)} className={index === 0 ? 'latest' : ''}><span className="timeline-dot">{index === 0 ? '✓' : ''}</span><div><strong>{String(locale === 'hi' ? event.title_hi : event.title_en)}</strong><p>{String(locale === 'hi' ? event.detail_hi : event.detail_en)}</p><small>{new Date(Number(event.created_at)).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' })}</small></div></li>)}</ol></section>
    </div><aside className="case-sidebar"><section><h3>{pick('Transaction', 'लेन-देन')}</h3><dl><div><dt>{pick('Reference', 'संदर्भ')}</dt><dd>{String(row.reference || '—')}</dd></div><div><dt>{pick('Channel', 'माध्यम')}</dt><dd>{String(row.channel).toUpperCase()}</dd></div><div><dt>{pick('Recipient', 'प्राप्तकर्ता')}</dt><dd>{String(row.recipient || '—')}</dd></div><div><dt>{pick('Bank', 'बैंक')}</dt><dd>{String(row.bank || '—')}</dd></div></dl></section><section className="mock-boundary"><strong>{pick('Mock boundary', 'काल्पनिक सीमा')}</strong><p>{pick('No bank, police or government system has been contacted. Every status is generated by FIRST30’s simulated backend.', 'किसी बैंक, पुलिस या सरकारी सिस्टम से संपर्क नहीं किया गया। हर स्थिति FIRST30 के काल्पनिक बैकएंड से बनी है।')}</p></section></aside></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
  </section><SafetyFooter /></main>;
}
