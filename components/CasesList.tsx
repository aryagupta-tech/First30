'use client';

import { useEffect, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { NativeLink } from './NativeLink';
import { useLocale } from './LocaleProvider';

type CaseRow = Record<string, string | number | null>;
const status: Record<string, [string,string]> = {
  draft: ['Safety steps incomplete','सुरक्षा चरण अधूरा'], evidence_review: ['Check screenshots','स्क्रीनशॉट जाँचें'], ready_to_submit: ['Ready to finish','पूरा करने के लिए तैयार'], submitted: ['Demo report finished','डेमो रिपोर्ट पूरी'], action_required: ['One more document needed','एक और दस्तावेज़ चाहिए'], evidence_received: ['Extra document added','अतिरिक्त दस्तावेज़ जोड़ा'], review_needed: ['Check screenshots','स्क्रीनशॉट जाँचें'], ready: ['Ready','तैयार'], exported: ['Report downloaded','रिपोर्ट डाउनलोड हुई'],
};

export function CasesList() {
  const { pick } = useLocale(); const [cases, setCases] = useState<CaseRow[] | null>(null);
  useEffect(() => { fetch('/api/cases').then(async (response) => response.ok ? await response.json() as { cases?: CaseRow[] } : { cases: [] }).then((data) => setCases(data.cases || [])).catch(() => setCases([])); }, []);
  return <main className="site-shell"><Header compact /><section className="cases-page">
    <div className="cases-heading"><div><p className="eyebrow">{pick('Saved demo reports', 'सहेजी गई डेमो रिपोर्ट')}</p><h1>{pick('Your reports', 'आपकी रिपोर्ट')}</h1><p>{pick('Continue an unfinished report, add a requested document or open a completed demo report.', 'अधूरी रिपोर्ट जारी रखें, माँगा गया दस्तावेज़ जोड़ें या पूरी डेमो रिपोर्ट खोलें।')}</p></div><NativeLink className="primary-button" href="/report">{pick('Start a new demo report', 'नई डेमो रिपोर्ट शुरू करें')} →</NativeLink></div>
    {cases === null ? <div className="loading-state">{pick('Loading reports…', 'रिपोर्ट लोड हो रही हैं…')}</div> : cases.length === 0 ? <div className="empty-state"><span className="empty-icon">30</span><h2>{pick('No reports yet', 'अभी कोई रिपोर्ट नहीं')}</h2><p>{pick('Start the guided demo to see how FIRST30 helps prepare and track a clear fraud report.', 'निर्देशित डेमो शुरू करें और देखें कि FIRST30 स्पष्ट धोखाधड़ी रिपोर्ट तैयार और ट्रैक करने में कैसे मदद करता है।')}</p><NativeLink className="primary-button" href="/report">{pick('Start the guided demo', 'निर्देशित डेमो शुरू करें')} →</NativeLink></div> : <div className="case-list">{cases.map((item) => {
      const key = String(item.status || 'draft'); const label = status[key] || [key,key];
      return <NativeLink className="case-row" href={`/cases/${item.id}`} key={String(item.id)}><div className="case-row-main"><span className={`status-badge status-${key}`}>{pick(label[0],label[1])}</span><h2>{pick('Financial fraud report', 'वित्तीय धोखाधड़ी रिपोर्ट')}</h2><p>{item.acknowledgement || pick('Demo report · your progress is saved', 'डेमो रिपोर्ट · आपकी प्रगति सहेजी गई है')}</p></div><div className="case-amount"><span>{pick('Reported loss', 'दर्ज नुकसान')}</span><strong>₹{Number(item.amount || 0).toLocaleString('en-IN')}</strong><small>{pick('Open report', 'रिपोर्ट खोलें')} →</small></div></NativeLink>;
    })}</div>}
  </section><SafetyFooter /></main>;
}
