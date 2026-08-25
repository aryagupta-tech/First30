'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';
import { signedManifestSchema } from '@/lib/contracts';
import { sha256Hex, stableJson } from '@/lib/response-file';

type Result = { status: 'valid' | 'altered' | 'unknown'; createdAt?: number; version?: number; fileCount?: number };

export function ManifestVerifier() {
  const { pick } = useLocale(); const [result, setResult] = useState<Result | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function verify(file: File) {
    setBusy(true); setError(''); setResult(null);
    try {
      const manifest = signedManifestSchema.parse(JSON.parse(await file.text()));
      const { manifestHash, signature, ...unsigned } = manifest;
      const calculatedHash = await sha256Hex(stableJson(unsigned));
      if (calculatedHash !== manifestHash) { setResult({ status: 'altered' }); return; }
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ verificationCode: manifest.verificationCode, manifestHash, signature }),
      });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || 'This is not a valid FIRST30 manifest.'); setResult(data);
    } catch { setResult({ status: 'altered' }); }
    finally { setBusy(false); }
  }
  return <main className="site-shell"><Header compact /><section className="verify-page"><Link href="/" className="back-link">← {pick('FIRST30 home', 'FIRST30 होम')}</Link><div className="verify-hero"><p className="eyebrow">{pick('Independent integrity check', 'स्वतंत्र अखंडता जाँच')}</p><h1>{pick('Verify a response file', 'रिस्पॉन्स फ़ाइल सत्यापित करें')}</h1><p>{pick('Upload only manifest.json from a FIRST30 package. Verification checks its signature and recorded hash without reading the citizen’s evidence.', 'FIRST30 पैकेज से केवल manifest.json अपलोड करें। सत्यापन नागरिक के प्रमाण को पढ़े बिना हस्ताक्षर और दर्ज हैश जाँचता है।')}</p></div><label className="manifest-drop"><span className="verify-mark">⌁</span><strong>{busy ? pick('Verifying manifest…', 'मैनिफेस्ट सत्यापित हो रहा है…') : pick('Choose manifest.json', 'manifest.json चुनें')}</strong><small>{pick('No evidence or personal details are uploaded', 'कोई प्रमाण या निजी जानकारी अपलोड नहीं होती')}</small><input type="file" accept="application/json,.json" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void verify(file); event.target.value = ''; }} /></label>{result && <section className={`verification-result result-${result.status}`}><span>{result.status === 'valid' ? '✓' : result.status === 'altered' ? '!' : '?'}</span><div><p className="eyebrow">{pick('Verification result', 'सत्यापन परिणाम')}</p><h2>{pick(result.status === 'valid' ? 'Valid FIRST30 package' : result.status === 'altered' ? 'Manifest has been altered' : 'Package is not recorded', result.status === 'valid' ? 'मान्य FIRST30 पैकेज' : result.status === 'altered' ? 'मैनिफेस्ट बदला गया है' : 'पैकेज दर्ज नहीं है')}</h2>{result.status === 'valid' && <p>{pick(`Version ${result.version} · ${result.fileCount} signed files · created ${new Date(result.createdAt || 0).toLocaleString('en-IN')}`, `संस्करण ${result.version} · ${result.fileCount} हस्ताक्षरित फ़ाइलें · ${new Date(result.createdAt || 0).toLocaleString('hi-IN')} को बनाया गया`)}</p>}{result.status !== 'valid' && <p>{pick('Do not rely on this package without obtaining the original manifest from the citizen.', 'नागरिक से मूल मैनिफेस्ट लिए बिना इस पैकेज पर भरोसा न करें।')}</p>}</div></section>}{error && <div className="error-banner" role="alert">{error}</div>}<section className="verification-boundary"><strong>{pick('What verification proves', 'सत्यापन क्या साबित करता है')}</strong><p>{pick('It proves that the recorded manifest has not changed since FIRST30 signed it. It does not prove that an institution accepted the case or that funds were recovered.', 'यह साबित करता है कि FIRST30 के हस्ताक्षर के बाद दर्ज मैनिफेस्ट नहीं बदला। यह किसी संस्था द्वारा केस स्वीकार करने या राशि वापस होने का प्रमाण नहीं है।')}</p></section></section><SafetyFooter /></main>;
}
