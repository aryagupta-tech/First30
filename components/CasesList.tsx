'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

type CaseRow = Record<string, string | number | null>;
const status: Record<string, [string,string]> = {
  draft: ['Triage incomplete','तत्काल जाँच अपूर्ण'], evidence_review: ['Evidence review','प्रमाण समीक्षा'], ready_to_submit: ['Ready to submit','सबमिट के लिए तैयार'], submitted: ['Submitted to mock backend','मॉक बैकएंड में जमा'], action_required: ['Action required','कार्रवाई आवश्यक'], evidence_received: ['Follow-up received','फॉलो-अप प्राप्त'], review_needed: ['Evidence review','प्रमाण समीक्षा'], ready: ['Ready','तैयार'], exported: ['Package built','पैकेज बना'],
};

export function CasesList() {
  const { pick } = useLocale(); const [cases, setCases] = useState<CaseRow[] | null>(null);
  useEffect(() => { fetch('/api/cases').then(async (response) => response.ok ? await response.json() as { cases?: CaseRow[] } : { cases: [] }).then((data) => setCases(data.cases || [])).catch(() => setCases([])); }, []);
  return <main className="site-shell"><Header compact /><section className="cases-page">
    <div className="cases-heading"><div><p className="eyebrow">{pick('Saved synthetic reports', 'सहेजी गई काल्पनिक रिपोर्ट')}</p><h1>{pick('Your fraud reports', 'आपकी धोखाधड़ी रिपोर्ट')}</h1><p>{pick('Resume a draft, answer a follow-up request or inspect a mock submission.', 'ड्राफ्ट जारी रखें, फॉलो-अप का जवाब दें या मॉक सबमिशन देखें।')}</p></div><Link className="primary-button" href="/report">{pick('New synthetic report', 'नई काल्पनिक रिपोर्ट')} →</Link></div>
    {cases === null ? <div className="loading-state">{pick('Loading reports…', 'रिपोर्ट लोड हो रही हैं…')}</div> : cases.length === 0 ? <div className="empty-state"><span className="empty-icon">30</span><h2>{pick('No fraud reports yet', 'अभी कोई धोखाधड़ी रिपोर्ट नहीं')}</h2><p>{pick('Use the visible demo login to complete the citizen journey from urgent triage to mock acknowledgement.', 'तत्काल जाँच से मॉक पावती तक नागरिक यात्रा पूरी करने के लिए दिखने वाला डेमो लॉगिन उपयोग करें।')}</p><Link className="primary-button" href="/report">{pick('Start the journey', 'यात्रा शुरू करें')} →</Link></div> : <div className="case-list">{cases.map((item) => {
      const key = String(item.status || 'draft'); const label = status[key] || [key,key];
      return <Link className="case-row" href={`/cases/${item.id}`} key={String(item.id)}><div className="case-row-main"><span className={`status-badge status-${key}`}>{pick(label[0],label[1])}</span><h2>{pick('Financial cyber-fraud report', 'वित्तीय साइबर धोखाधड़ी रिपोर्ट')}</h2><p>{item.acknowledgement || pick('Independent mock journey · progress saved', 'स्वतंत्र मॉक यात्रा · प्रगति सहेजी गई')}</p></div><div className="case-amount"><span>{pick('Reported loss', 'दर्ज नुकसान')}</span><strong>₹{Number(item.amount || 0).toLocaleString('en-IN')}</strong><small>{pick('Open report', 'रिपोर्ट खोलें')} →</small></div></Link>;
    })}</div>}
  </section><SafetyFooter /></main>;
}
