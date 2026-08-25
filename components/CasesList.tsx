'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

type CaseRow = Record<string, string | number | null>;
const status: Record<string, [string,string]> = {
  draft: ['Evidence incomplete','प्रमाण अपूर्ण'], review_needed: ['Evidence review','प्रमाण समीक्षा'], ready: ['Passport ready','पासपोर्ट तैयार'], exported: ['Passport built','पासपोर्ट बना'],
};

export function CasesList() {
  const { pick } = useLocale(); const [cases, setCases] = useState<CaseRow[] | null>(null);
  useEffect(() => { fetch('/api/cases').then(async (response) => response.ok ? await response.json() as { cases?: CaseRow[] } : { cases: [] }).then((data) => setCases(data.cases || [])).catch(() => setCases([])); }, []);
  return <main className="site-shell"><Header compact /><section className="cases-page">
    <div className="cases-heading"><div><p className="eyebrow">{pick('Saved evidence workspaces', 'सहेजे गए प्रमाण कार्यक्षेत्र')}</p><h1>{pick('Your Evidence Passports', 'आपके एविडेंस पासपोर्ट')}</h1><p>{pick('Resume source-linking or inspect a previously signed package.', 'स्रोत जोड़ना जारी रखें या पहले हस्ताक्षरित पैकेज की जाँच करें।')}</p></div><Link className="primary-button" href="/report">{pick('New Evidence Passport', 'नया एविडेंस पासपोर्ट')} →</Link></div>
    {cases === null ? <div className="loading-state">{pick('Loading passports…', 'पासपोर्ट लोड हो रहे हैं…')}</div> : cases.length === 0 ? <div className="empty-state"><span className="empty-icon">30</span><h2>{pick('No Evidence Passports yet', 'अभी कोई एविडेंस पासपोर्ट नहीं')}</h2><p>{pick('Load the three-file synthetic case to see cross-evidence verification and a real downloadable ZIP.', 'क्रॉस-एविडेंस सत्यापन और वास्तविक डाउनलोड ZIP देखने के लिए तीन-फ़ाइल काल्पनिक केस लोड करें।')}</p><Link className="primary-button" href="/report">{pick('Open the workspace', 'कार्यस्थल खोलें')} →</Link></div> : <div className="case-list">{cases.map((item) => {
      const key = String(item.status || 'draft'); const label = status[key] || [key,key];
      return <Link className="case-row" href={`/cases/${item.id}`} key={String(item.id)}><div className="case-row-main"><span className={`status-badge status-${key}`}>{pick(label[0],label[1])}</span><h2>{pick('Financial fraud Evidence Passport', 'वित्तीय फ्रॉड एविडेंस पासपोर्ट')}</h2><p>{item.acknowledgement || pick('Source-linked workspace · progress saved', 'स्रोत-संबद्ध कार्यक्षेत्र · प्रगति सहेजी गई')}</p></div><div className="case-amount"><span>{pick('Confirmed loss', 'पुष्ट नुकसान')}</span><strong>₹{Number(item.amount || 0).toLocaleString('en-IN')}</strong><small>{pick('Open workspace', 'कार्यस्थल खोलें')} →</small></div></Link>;
    })}</div>}
  </section><SafetyFooter /></main>;
}
