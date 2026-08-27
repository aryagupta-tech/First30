'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';
import { verifyArchiveLocally, verifyExtractedFolderLocally } from '@/lib/package-verification';

type Result = { status: 'valid' | 'altered' | 'unknown'; createdAt?: number; version?: number; fileCount?: number; checkedFiles?: number; failedFiles?: string[] };

export function ManifestVerifier() {
  const { pick } = useLocale(); const [result, setResult] = useState<Result | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function finishVerification(local: Awaited<ReturnType<typeof verifyArchiveLocally>>) {
    const { manifest, calculatedHash, failedFiles, intact, signature } = local;
    if (!intact) { setResult({ status: 'altered', checkedFiles: manifest.files.length, failedFiles }); return; }
    const response = await fetch('/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ verificationCode: manifest.verificationCode, manifestHash: calculatedHash, signature }) });
    const data = await response.json() as Result & { error?: string }; if (!response.ok) throw new Error(data.error || 'Verification failed.');
    setResult({ ...data, checkedFiles: manifest.files.length, failedFiles: [] });
  }
  async function verifyZip(file: File) {
    setBusy(true); setError(''); setResult(null);
    try {
      await finishVerification(await verifyArchiveLocally(await file.arrayBuffer()));
    } catch { setError(pick('We could not check this file. Choose the complete report you downloaded from FIRST30 and try again.')); }
    finally { setBusy(false); }
  }
  async function verifyFolder(files: File[]) {
    setBusy(true); setError(''); setResult(null);
    try {
      await finishVerification(await verifyExtractedFolderLocally(files));
    } catch { setError(pick('We could not check this folder. Choose the folder created when you opened the FIRST30 ZIP and try again.')); }
    finally { setBusy(false); }
  }
  const resultTitle = result?.status === 'valid'
    ? pick('Your saved report is unchanged', 'आपकी सहेजी रिपोर्ट बदली नहीं है')
    : result?.status === 'altered'
      ? pick('Something inside the report has changed', 'रिपोर्ट के अंदर कुछ बदल गया है')
      : pick('FIRST30 could not recognise this report', 'FIRST30 इस रिपोर्ट को पहचान नहीं सका');
  const changedFileCount = result?.failedFiles?.length || 0;
  const resultBody = result?.status === 'valid'
    ? pick(`${result.checkedFiles} files were checked. This is saved report version ${result.version}.`, `${result.checkedFiles} फ़ाइलें जाँची गईं। यह सहेजी रिपोर्ट का संस्करण ${result.version} है।`)
    : result?.status === 'altered'
      ? pick(changedFileCount ? `${changedFileCount} ${changedFileCount === 1 ? 'file is' : 'files are'} missing or different. Download a fresh copy from your report page before sharing it.` : 'At least one file is missing or different. Download a fresh copy from your report page before sharing it.', changedFileCount ? `${changedFileCount} फ़ाइलें गायब हैं या अलग हैं। साझा करने से पहले अपनी रिपोर्ट से नई कॉपी डाउनलोड करें।` : 'कम से कम एक फ़ाइल गायब है या अलग है। साझा करने से पहले अपनी रिपोर्ट से नई कॉपी डाउनलोड करें।')
      : pick('Choose the complete report downloaded directly from FIRST30. Changing its name is fine.', 'FIRST30 से सीधे डाउनलोड की गई पूरी रिपोर्ट चुनें। उसका नाम बदलना ठीक है।');
  return <main className="site-shell"><Header compact /><section className="verify-page">
    <Link href="/" className="back-link">← {pick('FIRST30 home', 'FIRST30 होम')}</Link>
    <div className="verify-hero"><p className="eyebrow">{pick('Check a downloaded report', 'डाउनलोड की गई रिपोर्ट जाँचें')}</p><h1>{pick('Check that your report is unchanged', 'जाँचें कि आपकी रिपोर्ट बदली नहीं है')}</h1><p>{pick('Use this before you share your downloaded report, or when someone sends it back to you. FIRST30 checks whether anything inside was changed after download. Your screenshots stay on this device.', 'डाउनलोड की गई रिपोर्ट साझा करने से पहले, या किसी से वापस मिलने पर इसका उपयोग करें। FIRST30 जाँचता है कि डाउनलोड के बाद अंदर कुछ बदला या नहीं। आपके स्क्रीनशॉट इसी डिवाइस पर रहते हैं।')}</p></div>
    <div className="manifest-drop"><span className="verify-mark">✓</span><strong>{busy ? pick('Checking your report…') : pick('Choose your downloaded FIRST30 report')}</strong><small>{pick('Choose the original ZIP or the folder created after opening it. You do not need to open the JSON files.')}</small><div className="verify-picker-actions"><label className="verify-picker-button verify-picker-primary">{pick('Choose ZIP file')}<input type="file" accept="application/zip,.zip" disabled={busy} onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void verifyZip(selected); event.target.value = ''; }} /></label><span>{pick('or')}</span><label className="verify-picker-button">{pick('Choose extracted folder')}<input type="file" multiple disabled={busy} {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} onChange={(event) => { const selected = Array.from(event.target.files || []); if (selected.length) void verifyFolder(selected); event.target.value = ''; }} /></label></div><p className="verify-privacy-note">{pick('The report is checked on this device. Your screenshots are not uploaded.')}</p></div>
    {result && <section className={`verification-result result-${result.status}`}><span>{result.status === 'valid' ? '✓' : result.status === 'altered' ? '!' : '?'}</span><div><p className="eyebrow">{pick('Check complete', 'जाँच पूरी')}</p><h2>{resultTitle}</h2><p>{resultBody}</p></div></section>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    <section className="verification-boundary"><strong>{pick('What this check can tell you', 'यह जाँच आपको क्या बता सकती है')}</strong><p>{pick('It can tell you whether the downloaded files are still exactly as FIRST30 prepared them. It cannot confirm that the incident happened, that an authority accepted the report or that money will be recovered.', 'यह बता सकती है कि डाउनलोड की गई फ़ाइलें वैसी ही हैं जैसी FIRST30 ने तैयार की थीं। यह घटना की सत्यता, किसी संस्था द्वारा रिपोर्ट स्वीकार होना या पैसे वापस मिलने की पुष्टि नहीं करती।')}</p></section>
  </section><SafetyFooter /></main>;
}
