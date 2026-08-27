'use client';

import Link from 'next/link';
import { useLocale } from './LocaleProvider';

export function Header({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, pick } = useLocale();
  return <header className={`topbar ${compact ? 'topbar-compact' : ''}`}>
    <Link className="brand" href="/" aria-label="FIRST30 home"><span className="brand-mark">30</span><span>FIRST30</span></Link>
    <nav className="topbar-nav" aria-label={pick('Main menu', 'मुख्य मेनू')}><Link href="/report">{pick('Start report', 'रिपोर्ट शुरू करें')}</Link><Link href="/cases">{pick('My reports', 'मेरी रिपोर्ट')}</Link><Link href="/verify">{pick('Check a report', 'रिपोर्ट जाँचें')}</Link></nav>
    <div className="topbar-actions"><span className="prototype-pill"><i /> {pick('Independent prototype', 'स्वतंत्र प्रोटोटाइप')}</span><button className="language-button" type="button" onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')} aria-label={pick('Switch to Hindi', 'अंग्रेज़ी में बदलें')}>{locale === 'en' ? 'हिंदी' : 'EN'}</button>{!compact && <Link className="header-cta" href="/report">{pick('Start report', 'रिपोर्ट शुरू करें')} <span>↗</span></Link>}</div>
  </header>;
}

export function SafetyFooter() {
  const { pick } = useLocale();
  return <footer className="safety-footer"><div><Link className="brand footer-brand" href="/"><span className="brand-mark">30</span><span>FIRST30</span></Link><p>{pick('An independent reimagining of the financial cyber-fraud reporting journey.', 'वित्तीय साइबर धोखाधड़ी रिपोर्टिंग यात्रा की स्वतंत्र पुनर्कल्पना।')}</p></div><div><strong>{pick('Real incident?', 'वास्तविक घटना?')}</strong><p>{pick('Call 1930, contact your bank and never share an OTP. FIRST30 does not contact government, police or banking systems.', '1930 पर कॉल करें, बैंक से संपर्क करें और OTP कभी साझा न करें। FIRST30 सरकार, पुलिस या बैंकिंग सिस्टम से संपर्क नहीं करता।')}</p></div></footer>;
}
