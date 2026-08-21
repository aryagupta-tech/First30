'use client';

import Link from 'next/link';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

export function Landing() {
  const { pick } = useLocale();
  return (
    <main className="site-shell">
      <Header />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{pick('The first 30 minutes matter', 'पहले 30 मिनट महत्वपूर्ण हैं')}</p>
          <h1>{pick('Act quickly after financial fraud.', 'वित्तीय धोखाधड़ी के बाद तुरंत कदम उठाएँ।')}</h1>
          <p className="hero-text">{pick(
            'FIRST30 helps you organise evidence, report what happened and follow every recovery step in one calm, guided journey.',
            'FIRST30 आपको प्रमाण व्यवस्थित करने, घटना रिपोर्ट करने और राशि वापसी के हर चरण को एक सरल यात्रा में समझने में मदद करता है।',
          )}</p>
          <div className="hero-actions">
            <Link className="primary-button" href="/report">{pick('Start a demo report', 'डेमो रिपोर्ट शुरू करें')} <span aria-hidden="true">→</span></Link>
            <Link className="secondary-button" href="/cases">{pick('Track a demo case', 'डेमो केस देखें')}</Link>
          </div>
          <p className="synthetic-note">{pick(
            'Uses a fictional citizen and synthetic financial data. No real account or identity details are required.',
            'यह काल्पनिक नागरिक और वित्तीय डेटा का उपयोग करता है। वास्तविक खाते या पहचान की जानकारी आवश्यक नहीं है।',
          )}</p>
        </div>
        <aside className="response-card" aria-label={pick('FIRST30 response journey', 'FIRST30 प्रक्रिया')}>
          <div className="response-card-header"><span className="pulse-dot" />{pick('Guided response', 'मार्गदर्शित प्रक्रिया')}<span className="time-chip">~ 4 min</span></div>
          <ol className="response-steps">
            {[
              [pick('Tell us what happened', 'बताएँ क्या हुआ'), pick('Plain language, no legal jargon', 'सरल भाषा, कानूनी शब्दों के बिना')],
              [pick('Add synthetic evidence', 'काल्पनिक प्रमाण जोड़ें'), pick('We organise the important details', 'हम महत्वपूर्ण विवरण व्यवस्थित करते हैं')],
              [pick('Submit and track', 'जमा करें और देखें'), pick('One case, every update in one place', 'हर अपडेट एक ही जगह')],
              [pick('Follow restoration', 'राशि वापसी देखें'), pick('See what was held and restored', 'देखें कितनी राशि रोकी और वापस की गई')],
            ].map(([title, detail], index) => <li className={index === 0 ? 'active' : ''} key={title}><span>{index + 1}</span><div><strong>{title}</strong><small>{detail}</small></div></li>)}
          </ol>
          <div className="case-preview"><span>{pick('Demo outcome', 'डेमो परिणाम')}</span><strong>{pick('₹12,000 partially restored', '₹12,000 आंशिक रूप से वापस')}</strong></div>
        </aside>
      </section>
      <section className="trust-strip" aria-label="FIRST30 principles">
        <div><strong>{pick('Simple by design', 'सरल डिज़ाइन')}</strong><span>{pick('One question at a time', 'एक समय में एक प्रश्न')}</span></div>
        <div><strong>English + हिंदी</strong><span>{pick('Designed for real Indian users', 'भारतीय उपयोगकर्ताओं के लिए')}</span></div>
        <div><strong>{pick('Private by default', 'गोपनीयता पहले')}</strong><span>{pick('Synthetic demo data only', 'केवल काल्पनिक डेमो डेटा')}</span></div>
      </section>
      <SafetyFooter />
    </main>
  );
}
