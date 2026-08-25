'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

type CaseRow = Record<string, string | number | null>;
const status: Record<string, [string,string]> = {
  draft: ['Incomplete','अपूर्ण'], review_needed: ['Review needed','समीक्षा आवश्यक'], ready: ['Ready to export','निर्यात के लिए तैयार'], exported: ['Response file built','रिस्पॉन्स फ़ाइल बनी'],
};

export function CasesList() {
  const { pick } = useLocale(); const [cases, setCases] = useState<CaseRow[] | null>(null);
  useEffect(() => { fetch('/api/cases').then(async (response) => response.ok ? await response.json() as { cases?: CaseRow[] } : { cases: [] }).then((data) => setCases(data.cases || [])).catch(() => setCases([])); }, []);
  return <main className="site-shell"><Header compact /><section className="cases-page">
    <div className="cases-heading"><div><p className="eyebrow">{pick('Saved response workspaces', 'सहेजे गए रिस्पॉन्स कार्यक्षेत्र')}</p><h1>{pick('Your response files', 'आपकी रिस्पॉन्स फ़ाइलें')}</h1><p>{pick('Resume evidence preparation or open a previously verified package.', 'प्रमाण तैयारी जारी रखें या पहले सत्यापित पैकेज खोलें।')}</p></div><Link className="primary-button" href="/report">{pick('New response file', 'नई रिस्पॉन्स फ़ाइल')} →</Link></div>
    {cases === null ? <div className="loading-state">{pick('Loading response files…', 'रिस्पॉन्स फ़ाइलें लोड हो रही हैं…')}</div> : cases.length === 0 ? <div className="empty-state"><span className="empty-icon">30</span><h2>{pick('No response files yet', 'अभी कोई रिस्पॉन्स फ़ाइल नहीं')}</h2><p>{pick('Use Sunita’s synthetic receipt to build and inspect a real downloadable package.', 'सुनीता की काल्पनिक रसीद से वास्तविक डाउनलोड योग्य पैकेज बनाएँ और जाँचें।')}</p><Link className="primary-button" href="/report">{pick('Open the workspace', 'कार्यस्थल खोलें')} →</Link></div> : <div className="case-list">{cases.map((item) => {
      const key = String(item.status || 'draft'); const label = status[key] || [key,key];
      return <Link className="case-row" href={`/cases/${item.id}`} key={String(item.id)}><div className="case-row-main"><span className={`status-badge status-${key}`}>{pick(label[0],label[1])}</span><h2>{pick('Financial fraud response file', 'वित्तीय फ्रॉड रिस्पॉन्स फ़ाइल')}</h2><p>{item.acknowledgement || pick('Evidence workspace · progress saved', 'प्रमाण कार्यक्षेत्र · प्रगति सहेजी गई')}</p></div><div className="case-amount"><span>{pick('Reported loss', 'रिपोर्ट किया नुकसान')}</span><strong>₹{Number(item.amount || 0).toLocaleString('en-IN')}</strong><small>{pick('Open workspace', 'कार्यस्थल खोलें')} →</small></div></Link>;
    })}</div>}
  </section><SafetyFooter /></main>;
}
