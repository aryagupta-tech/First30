'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { Header, SafetyFooter } from './Header';
import { NativeLink } from './NativeLink';
import { useLocale } from './LocaleProvider';
import { downloadDemoEvidenceKit } from '@/lib/client-ocr';

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
    ['02', pick('Add your screenshots', 'अपने स्क्रीनशॉट जोड़ें'), pick('FIRST30 reads the receipt, chat and call list on your device.', 'FIRST30 आपके डिवाइस पर रसीद, चैट और कॉल सूची पढ़ता है।')],
    ['03', pick('Check the important details', 'जरूरी जानकारी जाँचें'), pick('If two screenshots disagree, FIRST30 clearly shows what needs your attention.', 'अगर दो स्क्रीनशॉट में अलग जानकारी है, तो FIRST30 साफ़ दिखाता है कि क्या जाँचना है।')],
    ['04', pick('Create one clear report', 'एक स्पष्ट रिपोर्ट बनाएँ'), pick('Review the report, create a demo acknowledgement and see any follow-up request.', 'रिपोर्ट जाँचें, डेमो पावती बनाएँ और आगे माँगी गई जानकारी देखें।')],
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
        <p>{pick('Add your screenshots once. FIRST30 reads them privately, checks important details and prepares one clear English complaint.')}</p>
        <div className="editorial-actions">
          <NativeLink className="editorial-primary" href="/report">{pick('Start a report', 'रिपोर्ट शुरू करें')} <span>↗</span></NativeLink>
          <button className="editorial-link download-demo-link" type="button" onClick={() => void downloadDemoEvidenceKit()}>{pick('Download safe demo files', 'सुरक्षित डेमो फ़ाइलें डाउनलोड करें')} <span>↓</span></button>
        </div>
        <div className="editorial-case-chip"><span className="avatar-dot">SS</span><div><small>{pick('Sample person for this demo', 'इस डेमो की नमूना व्यक्ति')}</small><strong>Sunita Sharma · ₹18,499</strong></div><i>{pick('Resume', 'जारी रखें')} →</i></div>
      </div>

      <div className="evidence-orbit" aria-label={pick('Preview of how FIRST30 checks screenshots', 'FIRST30 स्क्रीनशॉट कैसे जाँचता है इसका पूर्वावलोकन')}>
        <div className="orbit-halo" aria-hidden="true" />
        <div className="orbit-center"><span>FIRST30</span><strong>{pick('One clear report', 'एक स्पष्ट रिपोर्ट')}</strong><small>{pick('Built privately', 'निजी रूप से तैयार')}</small></div>
        <div className="orbit-card orbit-receipt"><i>₹</i><span><small>{pick('Receipt', 'रसीद')}</small><strong>₹18,499</strong></span><b>✓</b></div>
        <div className="orbit-card orbit-chat"><i>···</i><span><small>{pick('Chat', 'चैट')}</small><strong>₹18,400</strong></span><b>!</b></div>
        <div className="orbit-card orbit-call"><i>⌕</i><span><small>{pick('Call log', 'कॉल लॉग')}</small><strong>+91 98765…</strong></span><b>✓</b></div>
        <div className="orbit-stats"><span><strong>100%</strong><small>{pick('Kept on device', 'डिवाइस पर सुरक्षित')}</small></span><span><strong>3/3</strong><small>{pick('Screenshots added', 'स्क्रीनशॉट जोड़े')}</small></span><span><strong>1</strong><small>{pick('Difference found', 'अंतर मिला')}</small></span></div>
      </div>
    </section>

    <section className="editorial-proof-strip" data-reveal><span>{pick('Add once')}</span><span>{pick('See where details came from')}</span><span>{pick('Clear English complaint')}</span><span>{pick('Screenshots stay private')}</span><span>{pick('One complete report')}</span></section>

    <section className="navy-workflow">
      <div className="navy-heading" data-reveal><p className="editorial-kicker">{pick('Clear checks, no guesswork', 'स्पष्ट जाँच, कोई अनुमान नहीं')}</p><h2>{pick('See what FIRST30 found in every screenshot.', 'देखें FIRST30 ने हर स्क्रीनशॉट में क्या पाया।')}</h2><p>{pick('Every amount, phone number and payment reference shows the screenshot it came from. If something does not match, you can see and correct it.', 'हर राशि, फ़ोन नंबर और भुगतान संदर्भ के साथ उसका स्क्रीनशॉट दिखता है। कुछ मेल न खाए तो आप उसे देखकर ठीक कर सकते हैं।')}</p></div>
      <div className="workflow-demo" data-reveal>
        <div className="workflow-tabs"><span className="active">{pick('Screenshots', 'स्क्रीनशॉट')}</span><span>{pick('Details', 'जानकारी')}</span><span>{pick('Review', 'जाँच')}</span><span>{pick('Complaint', 'शिकायत')}</span><span>{pick('Progress', 'प्रगति')}</span></div>
        <div className="workflow-body"><div className="workflow-copy"><span className="step-pill">02 · {pick('Check your screenshots', 'अपने स्क्रीनशॉट जाँचें')}</span><h3>{pick('Every important detail shows where it came from.', 'हर जरूरी जानकारी के साथ उसका स्रोत दिखता है।')}</h3><p>{pick('Choose the correct value, type it yourself or mark it “I do not know.” FIRST30 never guesses missing information.', 'सही जानकारी चुनें, खुद लिखें या “मुझे नहीं पता” चुनें। FIRST30 गायब जानकारी का अनुमान नहीं लगाता।')}</p><ul><li>✓ {pick('Amount found in receipt', 'राशि रसीद में मिली')}</li><li>✓ {pick('Phone found in call list', 'फ़ोन कॉल सूची में मिला')}</li><li className="warning">! {pick('Two amounts need review', 'दो राशियों की जाँच जरूरी')}</li></ul></div><div className="workflow-panel"><div className="panel-top"><span>{pick('Details found', 'मिली जानकारी')}</span><b>5 ✓ · 1 !</b></div><div className="fact-row"><span>{pick('Reported amount', 'दर्ज राशि')}</span><strong>₹18,499</strong><small>{pick('Found in receipt', 'रसीद में मिला')}</small></div><div className="fact-row conflict"><span>{pick('Amount in chat', 'चैट में राशि')}</span><strong>₹18,400</strong><small>{pick('Different amount · please check', 'अलग राशि · कृपया जाँचें')}</small></div><div className="fact-row"><span>{pick('Transaction reference', 'लेन-देन संदर्भ')}</span><strong>UTR826194730521</strong><small>{pick('Found in receipt', 'रसीद में मिला')}</small></div><div className="panel-button">{pick('Confirm details and continue', 'जानकारी पुष्ट कर आगे बढ़ें')} →</div></div></div>
      </div>
    </section>

    <section className="impact-section section-pad"><div className="impact-heading" data-reveal><p className="editorial-kicker">{pick('Real work. Clear outcome.', 'वास्तविक काम। स्पष्ट परिणाम।')}</p><h2>{pick('One report instead of repeated forms.', 'बार-बार फॉर्म के बजाय एक रिपोर्ट।')}</h2><p>{pick('Get urgent guidance, prepare the complaint, save a demo acknowledgement and answer a follow-up in one place.', 'जरूरी सलाह पाएँ, शिकायत तैयार करें, डेमो पावती सहेजें और आगे माँगी गई जानकारी एक ही जगह दें।')}</p></div><div className="impact-grid" data-reveal><article><strong>3/3</strong><span>{pick('important screenshot types checked', 'जरूरी स्क्रीनशॉट प्रकार जाँचे')}</span></article><article><strong>2</strong><span>{pick('complaint languages prepared', 'शिकायत भाषाएँ तैयार')}</span></article><article><strong>0</strong><span>{pick('screenshots sent elsewhere', 'स्क्रीनशॉट बाहर भेजे')}</span></article><article><strong>1</strong><span>{pick('demo acknowledgement to track', 'ट्रैक करने के लिए डेमो पावती')}</span></article></div></section>

    <section className="intake-section section-pad"><div className="intake-visual" data-reveal><div className="intake-image"><span>FIRST30</span><strong>{pick('Explain it naturally.', 'स्वाभाविक रूप से बताएँ।')}</strong><p>{pick('Write in your own words. You do not need legal or technical language.', 'अपने शब्दों में लिखें। कानूनी या तकनीकी भाषा की जरूरत नहीं है।')}</p></div><div className="intake-profile"><span className="avatar-dot">SS</span><div><strong>Sunita Sharma</strong><small>{pick('Fictional demo citizen', 'काल्पनिक डेमो नागरिक')}</small></div></div></div><div className="intake-copy" data-reveal><p className="editorial-kicker">{pick('Made for citizens', 'नागरिकों के लिए बनाया गया')}</p><h2>{pick('Tell the story once. FIRST30 organises it for you.', 'कहानी एक बार बताएँ। FIRST30 इसे आपके लिए व्यवस्थित करता है।')}</h2><p>{pick('Your explanation and checked screenshots become a clear complaint without asking you to repeat the same information.', 'आपका विवरण और जाँचे गए स्क्रीनशॉट एक स्पष्ट शिकायत बनते हैं, बिना वही जानकारी बार-बार माँगे।')}</p><div className="intake-list"><span><b>01</b>{pick('Tell us what happened', 'बताएँ क्या हुआ')}</span><span><b>02</b>{pick('Check your personal details', 'अपनी जानकारी जाँचें')}</span><span><b>03</b>{pick('Review the complete report', 'पूरी रिपोर्ट देखें')}</span></div></div></section>

    <section className="routine-section section-pad"><div className="routine-heading" data-reveal><p className="editorial-kicker">{pick('Less routine work', 'कम दोहराव वाला काम')}</p><h2>{pick('A reporting journey people can finish.', 'एक रिपोर्टिंग यात्रा जिसे लोग पूरा कर सकें।')}</h2></div><ol className="editorial-journey">{journey.map(([number,title,body],index)=><li key={number} data-reveal style={{'--delay':`${index*65}ms`} as CSSProperties}><span>{number}</span><strong>{title}</strong><p>{body}</p></li>)}</ol></section>

    <section className="editorial-final" data-reveal><div><p className="editorial-kicker">{pick('Independent demonstration', 'स्वतंत्र डेमो')}</p><h2>{pick('Use the sample case or bring your own safe test screenshots.', 'नमूना केस उपयोग करें या अपने सुरक्षित परीक्षण स्क्रीनशॉट जोड़ें।')}</h2><p>{pick('Custom fictional or fully redacted images work end to end. Never upload real IDs, account numbers, OTPs or private evidence to this public hackathon demo.', 'काल्पनिक या पूरी तरह छिपाई गई अपनी तस्वीरें शुरू से अंत तक काम करती हैं। इस सार्वजनिक हैकाथॉन डेमो में असली ID, खाता नंबर, OTP या निजी प्रमाण कभी अपलोड न करें।')}</p></div><NativeLink className="editorial-primary" href="/report">{pick('Start a report', 'रिपोर्ट शुरू करें')} <span>↗</span></NativeLink></section>
    <SafetyFooter />
  </main>;
}
