'use client';

import Link from 'next/link';
import { useLocale } from './LocaleProvider';

export function Header({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, pick } = useLocale();
  return (
    <header className={`topbar ${compact ? 'topbar-compact' : ''}`}>
      <Link className="brand" href="/" aria-label="FIRST30 home">
        <span className="brand-mark">30</span><span>FIRST30</span>
      </Link>
      <div className="topbar-actions">
        <span className="prototype-pill">{pick('Independent prototype', 'स्वतंत्र प्रोटोटाइप')}</span>
        <button className="language-button" type="button" onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')} aria-label={pick('Switch to Hindi', 'अंग्रेज़ी में बदलें')}>
          {locale === 'en' ? 'हिंदी' : 'EN'}
        </button>
      </div>
    </header>
  );
}

export function SafetyFooter() {
  const { pick } = useLocale();
  return <footer className="safety-footer">{pick(
    'For a real financial cyber-fraud incident in India, call the national helpline at 1930. FIRST30 does not contact government, police or banking systems.',
    'भारत में वास्तविक वित्तीय साइबर धोखाधड़ी के लिए राष्ट्रीय हेल्पलाइन 1930 पर कॉल करें। FIRST30 सरकार, पुलिस या बैंकिंग सिस्टम से संपर्क नहीं करता।',
  )}</footer>;
}
