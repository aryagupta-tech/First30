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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hero || reduceMotion) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(hero.offsetHeight, 1)));
      hero.style.setProperty('--hero-scroll', String(progress));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.visible = 'true'; observer.unobserve(entry.target); }
    }), { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const journey = [
    ['01', pick('Urgent triage', 'तत्काल जाँच'), pick('See time-critical actions first, then record the loss once.', 'पहले समय-संवेदनशील कदम देखें, फिर नुकसान एक बार दर्ज करें।')],
    ['02', pick('Evidence intelligence', 'प्रमाण इंटेलिजेंस'), pick('Local OCR traces every fact to a receipt, chat or call log.', 'स्थानीय OCR हर तथ्य को रसीद, चैट या कॉल लॉग से जोड़ता है।')],
    ['03', pick('Complaint builder', 'शिकायत निर्माण'), pick('Explain naturally while FIRST30 structures the report in two languages.', 'स्वाभाविक रूप से बताएँ और FIRST30 रिपोर्ट को दो भाषाओं में व्यवस्थित करे।')],
    ['04', pick('Submit and track', 'जमा करें और ट्रैक करें'), pick('Preview the exact mock payload, receive an acknowledgement and respond to follow-up.', 'सटीक मॉक पेलोड देखें, पावती पाएँ और फॉलो-अप का जवाब दें।')],
  ];

  return <main className="site-shell cinematic-site">
    <Header />
    <section className="urgent-service-strip" aria-label={pick('Urgent financial fraud guidance', 'तत्काल वित्तीय धोखाधड़ी मार्गदर्शन')}>
      <span className="urgent-pulse" aria-hidden="true" /><strong>{pick('Money just left your account?', 'क्या अभी आपके खाते से पैसे गए हैं?')}</strong>
      <span>{pick('Call 1930 now · Contact your bank · Never share an OTP', 'अभी 1930 पर कॉल करें · बैंक से संपर्क करें · OTP कभी साझा न करें')}</span>
    </section>

    <section className="cinematic-hero" ref={heroRef}>
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow hero-eyebrow"><span /> {pick('A calmer way through cyber fraud', 'साइबर धोखाधड़ी के बाद एक सरल रास्ता')}</p>
        <h1>{pick('Explain once.', 'एक बार बताएँ।')}<br /><em>{pick('Move clearly.', 'स्पष्टता से आगे बढ़ें।')}</em></h1>
        <p className="hero-text">{pick('FIRST30 transforms scattered screenshots and stressful details into one clear, source-linked financial cyber-fraud report.', 'FIRST30 बिखरे स्क्रीनशॉट और तनावपूर्ण विवरण को एक स्पष्ट, स्रोत-संबद्ध वित्तीय साइबर धोखाधड़ी रिपोर्ट में बदलता है।')}</p>
        <div className="hero-actions"><Link className="primary-button" href="/report">{pick('Start synthetic report', 'काल्पनिक रिपोर्ट शुरू करें')} <span>↗</span></Link><Link className="secondary-button" href="/cases">{pick('Track demo case', 'डेमो केस ट्रैक करें')}</Link></div>
        <p className="synthetic-note">{pick('Independent hackathon prototype · mock NCRP backend · synthetic data only', 'स्वतंत्र हैकाथॉन प्रोटोटाइप · मॉक NCRP बैकएंड · केवल काल्पनिक डेटा')}</p>
      </div>
      <div className="hero-product" aria-label={pick('FIRST30 report workspace preview', 'FIRST30 रिपोर्ट कार्यक्षेत्र पूर्वावलोकन')}>
        <div className="hero-orb" aria-hidden="true" />
        <div className="dashboard-frame">
          <div className="dashboard-bar"><span className="dashboard-brand"><b>30</b> FIRST30</span><span className="live-chip"><i /> {pick('Private analysis', 'निजी विश्लेषण')}</span></div>
          <div className="dashboard-body"><aside className="dashboard-nav" aria-hidden="true"><span className="active">01</span><span>02</span><span>03</span><span>04</span></aside><div className="dashboard-main">
            <div className="dashboard-heading"><div><small>{pick('Evidence review', 'प्रमाण समीक्षा')}</small><strong>{pick('Know what your evidence proves.', 'जानें कि आपका प्रमाण क्या साबित करता है।')}</strong></div><span>3/3</span></div>
            <div className="evidence-preview-grid"><article><span className="file-icon">₹</span><div><small>{pick('Payment receipt', 'भुगतान रसीद')}</small><strong>₹18,499</strong></div><i>✓</i></article><article><span className="file-icon">···</span><div><small>{pick('Scam chat', 'ठगी चैट')}</small><strong>₹18,400</strong></div><i className="warn">!</i></article><article><span className="file-icon">⌕</span><div><small>{pick('Call log', 'कॉल लॉग')}</small><strong>+91 98765…</strong></div><i>✓</i></article></div>
            <div className="conflict-preview"><span>!</span><div><small>{pick('Conflict detected', 'विरोध मिला')}</small><strong>{pick('Receipt and chat amounts do not match', 'रसीद और चैट की राशि मेल नहीं खाती')}</strong></div><button type="button">{pick('Review source', 'स्रोत देखें')}</button></div>
            <div className="dashboard-stats"><span><b>5</b>{pick('checks passed', 'जाँच सफल')}</span><span><b>1</b>{pick('conflict', 'विरोध')}</span><span><b>0</b>{pick('external uploads', 'बाहरी अपलोड')}</span></div>
          </div></div>
        </div>
      </div>
    </section>

    <section className="signal-strip" data-reveal><span>{pick('One explanation', 'एक विवरण')}</span><i /><span>{pick('Local OCR', 'स्थानीय OCR')}</span><i /><span>{pick('Source-linked facts', 'स्रोत-संबद्ध तथ्य')}</span><i /><span>{pick('Bilingual complaint', 'द्विभाषी शिकायत')}</span><i /><span>{pick('Trackable mock report', 'ट्रैक योग्य मॉक रिपोर्ट')}</span></section>

    <section className="pain-section section-pad" data-reveal><div className="section-heading"><p className="eyebrow">{pick('Designed around the first 30 minutes', 'पहले 30 मिनटों के लिए बनाया गया')}</p><h2>{pick('The victim is already overwhelmed.', 'पीड़ित पहले से ही परेशान है।')}<br /><em>{pick('The portal should not add to it.', 'पोर्टल को परेशानी नहीं बढ़ानी चाहिए।')}</em></h2></div><div className="comparison-grid">
      <article className="comparison-card current"><span className="card-kicker">{pick('Current pain', 'मौजूदा परेशानी')}</span><strong>{pick('Forms before understanding', 'समझने से पहले फॉर्म')}</strong><p>{pick('Repeated facts, unclear evidence requirements and anxiety about losing progress.', 'दोहराए गए तथ्य, अस्पष्ट प्रमाण आवश्यकताएँ और प्रगति खोने की चिंता।')}</p><div className="friction-lines"><i /><i /><i /><i /></div></article>
      <article className="comparison-card first30"><span className="card-kicker">FIRST30</span><strong>{pick('Understanding before submission', 'सबमिशन से पहले समझ')}</strong><p>{pick('Upload once, resolve visible conflicts and review the exact structured payload.', 'एक बार अपलोड करें, दिखाई देने वाले विरोध सुलझाएँ और सटीक संरचित पेलोड की समीक्षा करें।')}</p><div className="clarity-meter"><span><b>01</b>{pick('Explain', 'बताएँ')}</span><span><b>02</b>{pick('Verify', 'जाँचें')}</span><span><b>03</b>{pick('Submit', 'जमा करें')}</span></div></article>
    </div></section>

    <section className="features-section section-pad"><div className="section-heading centered" data-reveal><p className="eyebrow">{pick('Evidence, made understandable', 'प्रमाण, अब समझने योग्य')}</p><h2>{pick('Powerful where it matters.', 'जहाँ ज़रूरी, वहीं शक्तिशाली।')}</h2><p>{pick('No opaque score. FIRST30 shows the exact source, missing fact and contradiction behind every result.', 'कोई अस्पष्ट स्कोर नहीं। FIRST30 हर परिणाम के पीछे सटीक स्रोत, गायब तथ्य और विरोध दिखाता है।')}</p></div><div className="feature-bento">
      <article className="bento-card bento-large" data-reveal><div><span className="card-kicker">{pick('Source-linked facts', 'स्रोत-संबद्ध तथ्य')}</span><h3>{pick('Every value keeps its proof attached.', 'हर जानकारी के साथ उसका प्रमाण जुड़ा रहता है।')}</h3><p>{pick('Select the supported value or mark it Unknown—nothing is silently invented.', 'समर्थित जानकारी चुनें या अज्ञात चिह्नित करें—कुछ भी चुपचाप गढ़ा नहीं जाता।')}</p></div><div className="fact-stack"><span><small>{pick('Amount', 'राशि')}</small><strong>₹18,499</strong><em>{pick('Receipt · supported', 'रसीद · समर्थित')}</em></span><span className="conflicting"><small>{pick('Chat claim', 'चैट दावा')}</small><strong>₹18,400</strong><em>{pick('Conflict · retained', 'विरोध · सुरक्षित')}</em></span><span><small>{pick('UPI reference', 'UPI संदर्भ')}</small><strong>4268•••901</strong><em>{pick('Receipt · supported', 'रसीद · समर्थित')}</em></span></div></article>
      <article className="bento-card privacy-card" data-reveal><span className="card-kicker">{pick('Private by design', 'डिज़ाइन से निजी')}</span><div className="privacy-orbit"><b>LOCAL</b><i /><i /><i /></div><h3>{pick('OCR stays in your browser.', 'OCR आपके ब्राउज़र में रहता है।')}</h3><p>{pick('No AI or external OCR service receives the screenshots.', 'किसी AI या बाहरी OCR सेवा को स्क्रीनशॉट नहीं मिलते।')}</p></article>
      <article className="bento-card language-card" data-reveal><span className="card-kicker">{pick('Explain naturally', 'स्वाभाविक रूप से बताएँ')}</span><h3>{pick('One story. Two clear complaints.', 'एक कहानी। दो स्पष्ट शिकायतें।')}</h3><div className="language-switch"><span>English</span><span>हिंदी</span></div><p>{pick('Your confirmed facts become structured English and Hindi documents.', 'आपके पुष्ट तथ्य अंग्रेज़ी और हिंदी दस्तावेज़ बनते हैं।')}</p></article>
    </div></section>

    <section className="journey-section section-pad"><div className="section-heading" data-reveal><p className="eyebrow">{pick('One continuous journey', 'एक निरंतर यात्रा')}</p><h2>{pick('From urgency to a trackable report.', 'तत्कालता से ट्रैक योग्य रिपोर्ट तक।')}</h2></div><ol className="journey-grid">{journey.map(([number, title, body], index) => <li key={number} data-reveal style={{ '--delay': `${index * 70}ms` } as CSSProperties}><span>{number}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol></section>

    <section className="final-cta" data-reveal><div className="cta-glow" aria-hidden="true" /><p className="eyebrow">{pick('A complete synthetic demonstration', 'एक पूर्ण काल्पनिक प्रदर्शन')}</p><h2>{pick('Report clearly when every minute feels expensive.', 'जब हर मिनट कीमती लगे, तब स्पष्टता से रिपोर्ट करें।')}</h2><Link className="primary-button" href="/report">{pick('Enter FIRST30', 'FIRST30 में प्रवेश करें')} <span>↗</span></Link><small>{pick('Mock systems only. No government, police or bank system is contacted.', 'केवल मॉक सिस्टम। किसी सरकारी, पुलिस या बैंक प्रणाली से संपर्क नहीं किया जाता।')}</small></section>
    <SafetyFooter />
  </main>;
}
