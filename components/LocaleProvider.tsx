'use client';

import { createContext, useContext, useMemo } from 'react';

type LocaleContextValue = { locale: 'en'; pick: (en: string, legacyHindi?: string) => string };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({
    locale: 'en' as const,
    pick: (en: string) => en,
  }), []);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
