'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/contracts';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; pick: (en: string, hi: string) => string };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => {
    const stored = window.localStorage.getItem('f30_locale');
    if (stored === 'hi') {
      // The initial English render must match SSR; restore preference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState('hi');
    }
  }, []);
  useEffect(() => { document.documentElement.lang = locale === 'hi' ? 'hi' : 'en'; }, [locale]);
  const value = useMemo(() => ({
    locale,
    setLocale(next: Locale) { setLocaleState(next); window.localStorage.setItem('f30_locale', next); document.documentElement.lang = next === 'hi' ? 'hi' : 'en'; },
    pick: (en: string, hi: string) => locale === 'hi' ? hi : en,
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
