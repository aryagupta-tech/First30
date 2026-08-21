'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

type CaseRow = Record<string, string | number | null>;
const status: Record<string, [string,string]> = {
  draft: ['Draft','ड्राफ्ट'], submitted: ['Submitted','जमा'], action_required: ['Action required','कार्रवाई आवश्यक'],
  funds_held: ['Funds held','राशि होल्ड'], restoration_processing: ['Restoration processing','राशि वापसी जारी'],
  partially_restored: ['Partially restored','आंशिक वापसी'],
};

export function CasesList() {
  const { pick } = useLocale(); const [cases, setCases] = useState<CaseRow[] | null>(null);
  useEffect(() => { fetch('/api/cases').then(async (response) => response.ok ? response.json() : { cases: [] }).then((data) => setCases(data.cases || [])).catch(() => setCases([])); }, []);
  return <main className="site-shell"><Header compact /><section className="cases-page">
    <div className="cases-heading"><div><p className="eyebrow">{pick('Sunita’s demo workspace', 'सुनीता का डेमो कार्यक्षेत्र')}</p><h1>{pick('Your cases', 'आपके केस')}</h1><p>{pick('Every report, request and restoration update stays together.', 'हर रिपोर्ट, अनुरोध और राशि वापसी अपडेट एक ही जगह रहता है।')}</p></div><Link className="primary-button" href="/report">{pick('New demo report', 'नई डेमो रिपोर्ट')} →</Link></div>
    {cases === null ? <div className="loading-state">{pick('Loading cases…', 'केस लोड हो रहे हैं…')}</div> : cases.length === 0 ? <div className="empty-state"><span className="empty-icon">30</span><h2>{pick('No demo cases yet', 'अभी कोई डेमो केस नहीं')}</h2><p>{pick('Start with Sunita’s safe synthetic scenario. It takes about four minutes.', 'सुनीता के सुरक्षित काल्पनिक परिदृश्य से शुरू करें। इसमें लगभग चार मिनट लगते हैं।')}</p><Link className="primary-button" href="/report">{pick('Start the guided demo', 'मार्गदर्शित डेमो शुरू करें')} →</Link></div> : <div className="case-list">{cases.map((item) => {
      const key = String(item.status || 'draft'); const label = status[key] || [key,key];
      return <Link className="case-row" href={`/cases/${item.id}`} key={String(item.id)}><div className="case-row-main"><span className={`status-badge status-${key}`}>{pick(label[0],label[1])}</span><h2>{pick('Fake KYC UPI fraud', 'फर्जी केवाईसी यूपीआई धोखाधड़ी')}</h2><p>{item.acknowledgement || pick('Draft report · progress saved', 'ड्राफ्ट रिपोर्ट · प्रगति सहेजी गई')}</p></div><div className="case-amount"><span>{pick('Reported loss', 'रिपोर्ट किया नुकसान')}</span><strong>₹{Number(item.amount || 18499).toLocaleString('en-IN')}</strong><small>{pick('Open case', 'केस खोलें')} →</small></div></Link>;
    })}</div>}
  </section><SafetyFooter /></main>;
}
