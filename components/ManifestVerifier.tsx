'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';
import { verifyArchiveLocally } from '@/lib/package-verification';

type Result = { status: 'valid' | 'altered' | 'unknown'; createdAt?: number; version?: number; fileCount?: number; checkedFiles?: number; failedFiles?: string[] };

export function ManifestVerifier() {
  const { pick } = useLocale(); const [result, setResult] = useState<Result | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function verify(file: File) {
    setBusy(true); setError(''); setResult(null);
    try {
      const { manifest, calculatedHash, failedFiles, intact, signature } = await verifyArchiveLocally(await file.arrayBuffer());
      if (!intact) { setResult({ status: 'altered', checkedFiles: manifest.files.length, failedFiles }); return; }
      const response = await fetch('/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ verificationCode: manifest.verificationCode, manifestHash: calculatedHash, signature }) });
      const data = await response.json() as Result & { error?: string }; if (!response.ok) throw new Error(data.error || 'Verification failed.');
      setResult({ ...data, checkedFiles: manifest.files.length, failedFiles: [] });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not verify this ZIP.'); }
    finally { setBusy(false); }
  }
  return <main className="site-shell"><Header compact /><section className="verify-page"><Link href="/" className="back-link">← {pick('FIRST30 home', 'FIRST30 होम')}</Link><div className="verify-hero"><p className="eyebrow">{pick('Whole-package integrity check', 'पूरे पैकेज की अखंडता जाँच')}</p><h1>{pick('Verify an Evidence Passport', 'एविडेंस पासपोर्ट सत्यापित करें')}</h1><p>{pick('Choose the complete FIRST30 ZIP. Every file is unpacked and hashed inside your browser; only the verification code, manifest hash and signature reach FIRST30.', 'पूरा FIRST30 ZIP चुनें। हर फ़ाइल आपके ब्राउज़र में खुलकर हैश होती है; FIRST30 तक केवल सत्यापन कोड, मैनिफेस्ट हैश और हस्ताक्षर पहुँचते हैं।')}</p></div><label className="manifest-drop"><span className="verify-mark">⌁</span><strong>{busy ? pick('Checking every file…', 'हर फ़ाइल जाँची जा रही है…') : pick('Choose Evidence Passport ZIP', 'एविडेंस पासपोर्ट ZIP चुनें')}</strong><small>{pick('Evidence bytes never leave this browser during verification', 'सत्यापन में प्रमाण बाइट्स इस ब्राउज़र से बाहर नहीं जाते')}</small><input type="file" accept="application/zip,.zip" disabled={busy} onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void verify(selected); event.target.value = ''; }} /></label>{result && <section className={`verification-result result-${result.status}`}><span>{result.status === 'valid' ? '✓' : result.status === 'altered' ? '!' : '?'}</span><div><p className="eyebrow">{pick('Verification result', 'सत्यापन परिणाम')}</p><h2>{pick(result.status === 'valid' ? 'Valid, unchanged Evidence Passport' : result.status === 'altered' ? 'Package files have changed' : 'Package is not recorded', result.status === 'valid' ? 'मान्य, अपरिवर्तित एविडेंस पासपोर्ट' : result.status === 'altered' ? 'पैकेज फ़ाइलें बदल गई हैं' : 'पैकेज दर्ज नहीं है')}</h2><p>{result.status === 'valid' ? pick(`${result.checkedFiles} files matched · signature recorded · version ${result.version}`, `${result.checkedFiles} फ़ाइलें मेल खाती हैं · हस्ताक्षर दर्ज · संस्करण ${result.version}`) : result.status === 'altered' ? pick(`Failed: ${result.failedFiles?.join(', ') || 'manifest integrity'}`, `विफल: ${result.failedFiles?.join(', ') || 'मैनिफेस्ट अखंडता'}`) : pick('The signature was not found in FIRST30 records.', 'हस्ताक्षर FIRST30 रिकॉर्ड में नहीं मिला।')}</p></div></section>}{error && <div className="error-banner" role="alert">{error}</div>}<section className="verification-boundary"><strong>{pick('What this proves', 'यह क्या साबित करता है')}</strong><p>{pick('The signed package and every listed file are unchanged. It does not prove that the citizen’s account is true, that an institution accepted it, or that funds were recovered.', 'हस्ताक्षरित पैकेज और हर सूचीबद्ध फ़ाइल अपरिवर्तित हैं। यह नागरिक के कथन की सत्यता, संस्था की स्वीकृति या राशि वापसी साबित नहीं करता।')}</p></section></section><SafetyFooter /></main>;
}
