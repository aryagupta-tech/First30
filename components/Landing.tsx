'use client';

import Link from 'next/link';
import { Header, SafetyFooter } from './Header';
import { useLocale } from './LocaleProvider';

export function Landing() {
  const { pick } = useLocale();
  const stages = [
    [pick('Act quickly', 'तुरंत कदम उठाएँ'), pick('See 1930 and bank-contact guidance before filling a long form.', 'लंबा फॉर्म भरने से पहले 1930 और बैंक से संपर्क की जानकारी पाएँ।')],
    [pick('Add evidence once', 'प्रमाण एक बार जोड़ें'), pick('Receipt, chat and call log become source-linked facts.', 'रसीद, चैट और कॉल लॉग स्रोत-संबद्ध तथ्य बनते हैं।')],
    [pick('Review clearly', 'स्पष्ट समीक्षा करें'), pick('Confirm facts, explain conflicts and mark unavailable details Unknown.', 'तथ्य पुष्ट करें, विरोध समझाएँ और अनुपलब्ध जानकारी अज्ञात रखें।')],
    [pick('Submit and track', 'जमा करें और ट्रैक करें'), pick('Receive a mock acknowledgement and answer a follow-up request.', 'मॉक पावती पाएँ और अतिरिक्त प्रमाण अनुरोध का उत्तर दें।')],
  ];

  return <main className="site-shell"><Header />
    <section className="urgent-service-strip" aria-label={pick('Urgent financial fraud guidance', 'तत्काल वित्तीय धोखाधड़ी मार्गदर्शन')}>
      <strong>{pick('Money just left your account?', 'क्या अभी आपके खाते से पैसे गए हैं?')}</strong>
      <span>{pick('Call 1930 now, contact your bank and never share an OTP.', 'अभी 1930 पर कॉल करें, अपने बैंक से संपर्क करें और OTP कभी साझा न करें।')}</span>
    </section>

    <section className="ncrp-hero">
      <div className="ncrp-hero-copy">
        <p className="eyebrow">{pick('A reimagined financial cyber-fraud journey', 'वित्तीय साइबर धोखाधड़ी की नई रिपोर्टिंग यात्रा')}</p>
        <h1>{pick('Report the fraud—not the same details again and again.', 'धोखाधड़ी रिपोर्ट करें—एक ही जानकारी बार-बार नहीं।')}</h1>
        <p>{pick('FIRST30 turns scattered evidence into a complete complaint, shows what is missing and lets a citizen submit and track one clear mock report from start to finish.', 'FIRST30 बिखरे प्रमाण को पूरी शिकायत में बदलता है, कमी दिखाता है और नागरिक को एक स्पष्ट मॉक रिपोर्ट शुरू से अंत तक जमा और ट्रैक करने देता है।')}</p>
        <div className="hero-actions">
          <Link className="primary-button" href="/report">{pick('Start synthetic report', 'काल्पनिक रिपोर्ट शुरू करें')} →</Link>
          <Link className="secondary-button" href="/cases">{pick('Track demo complaint', 'डेमो शिकायत ट्रैक करें')}</Link>
        </div>
        <small>{pick('Independent hackathon prototype · mock NCRP backend · synthetic data only', 'स्वतंत्र हैकाथॉन प्रोटोटाइप · मॉक NCRP बैकएंड · केवल काल्पनिक डेटा')}</small>
      </div>
      <aside className="journey-card" aria-label={pick('Simplified reporting journey', 'सरल रिपोर्टिंग यात्रा')}>
        <div className="journey-card-top"><span>FIRST30</span><strong>{pick('One citizen journey', 'एक नागरिक यात्रा')}</strong></div>
        <ol>{stages.map(([title, body], index) => <li key={title}><span>{index + 1}</span><div><strong>{title}</strong><small>{body}</small></div></li>)}</ol>
        <p>{pick('No government, police or bank system is contacted.', 'किसी सरकारी, पुलिस या बैंक प्रणाली से संपर्क नहीं किया जाता।')}</p>
      </aside>
    </section>

    <section className="before-after-section">
      <div><p className="eyebrow">{pick('The problem', 'समस्या')}</p><h2>{pick('A victim is stressed. The form adds more work.', 'पीड़ित तनाव में है। फॉर्म और काम बढ़ाता है।')}</h2></div>
      <div className="before-after-grid">
        <article className="before-card"><span>{pick('Current experience', 'मौजूदा अनुभव')}</span><ul><li>{pick('Requirements are understood before the incident can be explained.', 'घटना बताने से पहले आवश्यकताएँ समझनी पड़ती हैं।')}</li><li>{pick('Evidence and transaction facts are entered separately.', 'प्रमाण और लेन-देन तथ्य अलग-अलग भरे जाते हैं।')}</li><li>{pick('Long forms make failure or lost progress costly.', 'लंबे फॉर्म में विफलता या प्रगति खोना महँगा पड़ता है।')}</li></ul></article>
        <article className="after-card"><span>{pick('FIRST30 redesign', 'FIRST30 पुनर्रचना')}</span><ul><li>{pick('Urgent actions appear before paperwork.', 'कागजी काम से पहले जरूरी कदम दिखते हैं।')}</li><li>{pick('Evidence supplies facts and exposes contradictions.', 'प्रमाण तथ्य देता है और विरोध दिखाता है।')}</li><li>{pick('The complete draft is saved, reviewed and tracked.', 'पूरा मसौदा सहेजा, जाँचा और ट्रैक किया जाता है।')}</li></ul></article>
      </div>
    </section>
    <SafetyFooter />
  </main>;
}
