'use client';

import Link from 'next/link';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

export function Landing() {
  const { pick } = useLocale();
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(hero.offsetHeight, 1)));
      hero.style.setProperty('--editorial-scroll', String(progress));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).dataset.visible = 'true';
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.15, rootMargin: '0px 0px -9% 0px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const journey = [
    ['01', pick('Protect the first minutes', 'शुरुआती मिनट बचाएँ'), pick('Critical 1930 and bank guidance appears before paperwork.', 'कागजी काम से पहले 1930 और बैंक की जरूरी जानकारी दिखती है।')],
    ['02', pick('Read evidence locally', 'प्रमाण स्थानीय रूप से पढ़ें'), pick('Receipt, chat and call log become facts with visible sources.', 'रसीद, चैट और कॉल लॉग दिखाई देने वाले स्रोतों के साथ तथ्य बनते हैं।')],
    ['03', pick('Resolve what conflicts', 'विरोध सुलझाएँ'), pick('Mismatches remain visible instead of being silently removed.', 'बेमेल जानकारी चुपचाप हटने के बजाय दिखाई देती रहती है।')],
    ['04', pick('Submit one clear report', 'एक स्पष्ट रिपोर्ट जमा करें'), pick('Review the exact mock payload, acknowledgement and follow-up.', 'सटीक मॉक पेलोड, पावती और फॉलो-अप की समीक्षा करें।')],
  ];

  return <main className="site-shell editorial-site">
    <Header />

    <section className="editorial-alert" aria-label={pick('Urgent financial fraud guidance', 'तत्काल वित्तीय धोखाधड़ी मार्गदर्शन')}>
      <span>{pick('Urgent', 'तत्काल')}</span>
      <p><strong>{pick('Money just left your account?', 'क्या अभी आपके खाते से पैसे गए हैं?')}</strong> {pick('Call 1930 now, contact your bank and never share an OTP.', 'अभी 1930 पर कॉल करें, बैंक से संपर्क करें और OTP कभी साझा न करें।')}</p>
    </section>

    <section className="editorial-hero" ref={heroRef}>
      <div className="editorial-hero-copy">
        <p className="editorial-kicker">{pick('Financial cyber-fraud reporting, reimagined', 'वित्तीय साइबर धोखाधड़ी रिपोर्टिंग की नई कल्पना')}</p>
        <h1>{pick('Your evidence.', 'आपका प्रमाण।')}<br /><em>{pick('Ready for action.', 'कार्रवाई के लिए तैयार।')}</em></h1>
        <p>{pick('FIRST30 organises scattered screenshots into one source-linked complaint—without sending evidence to an AI or external OCR service.', 'FIRST30 बिखरे स्क्रीनशॉट को एक स्रोत-संबद्ध शिकायत में व्यवस्थित करता है—प्रमाण को AI या बाहरी OCR सेवा को भेजे बिना।')}</p>
        <div className="editorial-actions">
          <Link className="editorial-primary" href="/report">{pick('Start synthetic report', 'काल्पनिक रिपोर्ट शुरू करें')} <span>↗</span></Link>
          <Link className="editorial-link" href="/cases">{pick('View saved cases', 'सहेजे केस देखें')} <span>→</span></Link>
        </div>
        <div className="editorial-case-chip"><span className="avatar-dot">SS</span><div><small>{pick('Synthetic citizen', 'काल्पनिक नागरिक')}</small><strong>Sunita Sharma · ₹18,499</strong></div><i>{pick('Resume', 'जारी रखें')} →</i></div>
      </div>

      <div className="evidence-orbit" aria-label={pick('Evidence processing preview', 'प्रमाण प्रसंस्करण पूर्वावलोकन')}>
        <div className="orbit-halo" aria-hidden="true" />
        <div className="orbit-center"><span>FIRST30</span><strong>{pick('One clear report', 'एक स्पष्ट रिपोर्ट')}</strong><small>{pick('Built privately', 'निजी रूप से तैयार')}</small></div>
        <div className="orbit-card orbit-receipt"><i>₹</i><span><small>{pick('Receipt', 'रसीद')}</small><strong>₹18,499</strong></span><b>✓</b></div>
        <div className="orbit-card orbit-chat"><i>···</i><span><small>{pick('Chat', 'चैट')}</small><strong>₹18,400</strong></span><b>!</b></div>
        <div className="orbit-card orbit-call"><i>⌕</i><span><small>{pick('Call log', 'कॉल लॉग')}</small><strong>+91 98765…</strong></span><b>✓</b></div>
        <div className="orbit-stats"><span><strong>100%</strong><small>{pick('Local analysis', 'स्थानीय विश्लेषण')}</small></span><span><strong>3/3</strong><small>{pick('Evidence types', 'प्रमाण प्रकार')}</small></span><span><strong>1</strong><small>{pick('Conflict found', 'विरोध मिला')}</small></span></div>
      </div>
    </section>

    <section className="editorial-proof-strip" data-reveal><span>{pick('Upload once', 'एक बार अपलोड')}</span><span>{pick('Trace every fact', 'हर तथ्य का स्रोत')}</span><span>{pick('English + Hindi', 'अंग्रेज़ी + हिंदी')}</span><span>{pick('Private local OCR', 'निजी स्थानीय OCR')}</span><span>{pick('Signed Evidence Passport', 'हस्ताक्षरित एविडेंस पासपोर्ट')}</span></section>

    <section className="navy-workflow">
      <div className="navy-heading" data-reveal><p className="editorial-kicker">{pick('Evidence intelligence without the mystery', 'बिना रहस्य के प्रमाण इंटेलिजेंस')}</p><h2>{pick('See what every file proves.', 'देखें हर फ़ाइल क्या साबित करती है।')}</h2><p>{pick('FIRST30 does not hide its reasoning behind a score. Each result stays connected to the screenshot it came from.', 'FIRST30 अपने तर्क को किसी स्कोर के पीछे नहीं छिपाता। हर परिणाम उस स्क्रीनशॉट से जुड़ा रहता है जहाँ से वह आया है।')}</p></div>
      <div className="workflow-demo" data-reveal>
        <div className="workflow-tabs"><span className="active">{pick('Evidence', 'प्रमाण')}</span><span>{pick('Facts', 'तथ्य')}</span><span>{pick('Checks', 'जाँच')}</span><span>{pick('Complaint', 'शिकायत')}</span><span>{pick('Track', 'ट्रैक')}</span></div>
        <div className="workflow-body"><div className="workflow-copy"><span className="step-pill">02 · {pick('Evidence review', 'प्रमाण समीक्षा')}</span><h3>{pick('Every confirmed fact keeps its source.', 'हर पुष्ट तथ्य अपना स्रोत बनाए रखता है।')}</h3><p>{pick('Choose a supported observation, enter it manually or mark it Unknown. FIRST30 never silently fills a gap.', 'समर्थित जानकारी चुनें, मैनुअल दर्ज करें या अज्ञात चिह्नित करें। FIRST30 किसी कमी को चुपचाप नहीं भरता।')}</p><ul><li>✓ {pick('Amount supported by receipt', 'राशि रसीद से समर्थित')}</li><li>✓ {pick('Phone supported by call log', 'फ़ोन कॉल लॉग से समर्थित')}</li><li className="warning">! {pick('Amount conflict retained', 'राशि विरोध सुरक्षित')}</li></ul></div><div className="workflow-panel"><div className="panel-top"><span>{pick('Source-linked facts', 'स्रोत-संबद्ध तथ्य')}</span><b>5 ✓ · 1 !</b></div><div className="fact-row"><span>{pick('Reported amount', 'दर्ज राशि')}</span><strong>₹18,499</strong><small>{pick('Receipt · supported', 'रसीद · समर्थित')}</small></div><div className="fact-row conflict"><span>{pick('Amount in chat', 'चैट में राशि')}</span><strong>₹18,400</strong><small>{pick('Conflict · review', 'विरोध · समीक्षा')}</small></div><div className="fact-row"><span>{pick('Transaction reference', 'लेन-देन संदर्भ')}</span><strong>UTR826194730521</strong><small>{pick('Receipt · supported', 'रसीद · समर्थित')}</small></div><div className="panel-button">{pick('Confirm facts and continue', 'तथ्य पुष्ट कर आगे बढ़ें')} →</div></div></div>
      </div>
    </section>

    <section className="impact-section section-pad"><div className="impact-heading" data-reveal><p className="editorial-kicker">{pick('Real work. Clear outcome.', 'वास्तविक काम। स्पष्ट परिणाम।')}</p><h2>{pick('One report instead of repeated forms.', 'बार-बार फॉर्म के बजाय एक रिपोर्ट।')}</h2><p>{pick('A complete citizen journey from urgent triage to mock acknowledgement and follow-up.', 'तत्काल जाँच से मॉक पावती और फॉलो-अप तक पूरी नागरिक यात्रा।')}</p></div><div className="impact-grid" data-reveal><article><strong>3/3</strong><span>{pick('core evidence types connected', 'मुख्य प्रमाण प्रकार जुड़े')}</span></article><article><strong>2</strong><span>{pick('complaint languages prepared', 'शिकायत भाषाएँ तैयार')}</span></article><article><strong>0</strong><span>{pick('external evidence processors', 'बाहरी प्रमाण प्रोसेसर')}</span></article><article><strong>1</strong><span>{pick('trackable mock acknowledgement', 'ट्रैक योग्य मॉक पावती')}</span></article></div></section>

    <section className="intake-section section-pad"><div className="intake-visual" data-reveal><div className="intake-image"><span>FIRST30</span><strong>{pick('Explain it naturally.', 'स्वाभाविक रूप से बताएँ।')}</strong><p>{pick('No tiny character limit. No special-character trap.', 'कोई छोटा अक्षर-सीमा नियम नहीं। विशेष अक्षर की समस्या नहीं।')}</p></div><div className="intake-profile"><span className="avatar-dot">SS</span><div><strong>Sunita Sharma</strong><small>{pick('Fictional demo citizen', 'काल्पनिक डेमो नागरिक')}</small></div></div></div><div className="intake-copy" data-reveal><p className="editorial-kicker">{pick('Citizen-first intake', 'नागरिक-केंद्रित विवरण')}</p><h2>{pick('Tell the story once. Reuse every confirmed fact.', 'कहानी एक बार बताएँ। हर पुष्ट तथ्य फिर उपयोग करें।')}</h2><p>{pick('FIRST30 turns a natural explanation and confirmed evidence into the structured fields expected by the mock reporting flow.', 'FIRST30 स्वाभाविक विवरण और पुष्ट प्रमाण को मॉक रिपोर्टिंग प्रक्रिया के संरचित क्षेत्रों में बदलता है।')}</p><div className="intake-list"><span><b>01</b>{pick('Plain-language explanation', 'सरल भाषा में विवरण')}</span><span><b>02</b>{pick('Fictional complainant profile', 'काल्पनिक शिकायतकर्ता प्रोफ़ाइल')}</span><span><b>03</b>{pick('Exact payload preview', 'सटीक पेलोड पूर्वावलोकन')}</span></div></div></section>

    <section className="routine-section section-pad"><div className="routine-heading" data-reveal><p className="editorial-kicker">{pick('Less routine work', 'कम दोहराव वाला काम')}</p><h2>{pick('A reporting journey people can finish.', 'एक रिपोर्टिंग यात्रा जिसे लोग पूरा कर सकें।')}</h2></div><ol className="editorial-journey">{journey.map(([number,title,body],index)=><li key={number} data-reveal style={{'--delay':`${index*65}ms`} as CSSProperties}><span>{number}</span><strong>{title}</strong><p>{body}</p></li>)}</ol></section>

    <section className="editorial-final" data-reveal><div><p className="editorial-kicker">{pick('Independent synthetic prototype', 'स्वतंत्र काल्पनिक प्रोटोटाइप')}</p><h2>{pick('A clearer path through the first 30 minutes.', 'पहले 30 मिनटों में एक स्पष्ट रास्ता।')}</h2><p>{pick('Nothing is sent to NCRP, police, a bank or any government system.', 'NCRP, पुलिस, बैंक या किसी सरकारी सिस्टम को कुछ नहीं भेजा जाता।')}</p></div><Link className="editorial-primary" href="/report">{pick('Enter FIRST30', 'FIRST30 में प्रवेश करें')} <span>↗</span></Link></section>
    <SafetyFooter />
  </main>;
}
