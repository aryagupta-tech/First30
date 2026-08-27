'use client';

import { useLocale } from './LocaleProvider';
import { NativeLink } from './NativeLink';

export function Header({ compact = false }: { compact?: boolean }) {
  const { pick } = useLocale();
  return <header className={`topbar ${compact ? 'topbar-compact' : ''}`}>
    <NativeLink className="brand" href="/" aria-label="FIRST30 home"><span className="brand-mark">30</span><span>FIRST30</span></NativeLink>
    <nav className="topbar-nav" aria-label={pick('Main menu', 'मुख्य मेनू')}><NativeLink href="/report">{pick('Start report', 'रिपोर्ट शुरू करें')}</NativeLink><NativeLink href="/cases">{pick('My reports', 'मेरी रिपोर्ट')}</NativeLink><NativeLink href="/verify">{pick('Check a report', 'रिपोर्ट जाँचें')}</NativeLink></nav>
    <div className="topbar-actions"><span className="prototype-pill"><i /> {pick('Independent prototype')}</span>{!compact && <NativeLink className="header-cta" href="/report">{pick('Start report')} <span>↗</span></NativeLink>}</div>
  </header>;
}

export function SafetyFooter() {
  const { pick } = useLocale();
  return <footer className="safety-footer"><div><NativeLink className="brand footer-brand" href="/"><span className="brand-mark">30</span><span>FIRST30</span></NativeLink><p>{pick('An independent reimagining of the financial cyber-fraud reporting journey.', 'वित्तीय साइबर धोखाधड़ी रिपोर्टिंग यात्रा की स्वतंत्र पुनर्कल्पना।')}</p></div><div><strong>{pick('Real incident?', 'वास्तविक घटना?')}</strong><p>{pick('Call 1930, contact your bank and never share an OTP. FIRST30 does not contact government, police or banking systems.', '1930 पर कॉल करें, बैंक से संपर्क करें और OTP कभी साझा न करें। FIRST30 सरकार, पुलिस या बैंकिंग सिस्टम से संपर्क नहीं करता।')}</p></div></footer>;
}
