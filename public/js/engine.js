/* NiveshKavach scam engine - runs fully in the browser (and in Node for tests). Message text never leaves the device. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const OFFICIAL = ['sebi.gov.in', 'nsdl.co.in', 'cdslindia.com', 'zerodha.com', 'groww.in', 'upstox.com', 'sbi.co.in', 'onlinesbi.sbi',
    'hdfcbank.com', 'icicibank.com', 'paytm.com', 'npci.org.in', 'cybercrime.gov.in', 'scores.sebi.gov.in', 'bseindia.com', 'nseindia.com', 'rbi.org.in'];
  const BRANDS = ['sebi', 'nsdl', 'cdsl', 'zerodha', 'groww', 'upstox', 'sbi', 'hdfc', 'icici', 'paytm', 'npci', 'nse', 'bse', 'rbi'];
  const SHORT = ['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'is.gd', 'shorturl.at', 'tiny.cc', 'goo.gl'];
  const BADTLD = ['xyz', 'top', 'club', 'vip', 'buzz', 'live', 'online', 'site', 'link', 'cc', 'icu', 'click', 'fun'];
  // "never share OTP", "OTP किसी को न बताएं", "OTP कोणालाही सांगू नका" -> a warning, not a request
  const NEG = /(do not|don'?t|never|मत |न करें|कभी नहीं|न बताएं|न बताना|मत बताएं|नका|नये|kabhi nahi|mat )/i;

  const R = (id, w, re, t, d, neg) => ({ id, w, re, neg: !!neg, t, d });
  const VERBS_FWD = 'share|send|tell|give|forward|bhej\\w*|batao|bata do|बताएं|बताओ|बताइए|भेजें|दें|सांगा|सांगू|पाठवा|द्या';

  const RULES = [
    R('guar', 25,
      /guarantee|assured (return|profit)|fixed return|100% ?(profit|return|मुनाफा|नफा)|risk[- ]?free|double (your )?money|paisa double|पक्का मुनाफा|पक्की कमाई|गारंटी|दोगुना|हमखास|हमी|\d+% ?(daily|per day|weekly|per week|रोज|हफ्ते|आठवड्याला)|जोखिम (बिल्कुल )?नहीं|जोखीम नाही/i,
      { en: 'Guaranteed / unrealistic returns', hi: 'पक्के मुनाफे का वादा', mr: 'हमखास नफ्याचे आश्वासन' },
      { en: 'No real investment can guarantee profit. SEBI warns against assured-return promises.', hi: 'कोई भी असली निवेश मुनाफे की गारंटी नहीं दे सकता। यह ठगी का सबसे आम तरीका है।', mr: 'कोणतीही खरी गुंतवणूक नफ्याची हमी देऊ शकत नाही. फसवणुकीची ही सर्वात सामान्य पद्धत आहे.' }),
    R('urg', 15,
      /urgent|immediately|last chance|limited (time|slots|seats)|today only|expires?\b|hurry|(act|join|invest|apply|pay)\b.{0,25}\bnow\b|(act|join|invest|apply|pay) today|right now|जल्दी|तुरंत|आज ही|अंतिम मौका|सीमित सीटें|अभी|ताबडतोब|आत्ताच|आजच|मर्यादित जागा|घाई|jaldi|turant|abhi/i,
      { en: 'Fake urgency', hi: 'जल्दबाज़ी का दबाव', mr: 'घाई करण्याचा दबाव' },
      { en: 'Scammers rush you so you do not think or ask family.', hi: 'ठग आपको सोचने या घर में पूछने का समय नहीं देते।', mr: 'फसवणूक करणारे तुम्हाला विचार करायला किंवा घरच्यांना विचारायला वेळ देत नाहीत.' }),
    R('otp', 30,
      new RegExp('(?:' + VERBS_FWD + ').{0,30}(?:\\b(?:otp|pin|cvv|password)\\b|ओटीपी|पिन|पासवर्ड)|(?:\\b(?:otp|pin|cvv)\\b|ओटीपी|पिन).{0,30}(?:share|send|tell|bhej\\w*|batao|बताएं|बताओ|बताइए|भेजें|सांगा|सांगू|पाठवा)', 'i'),
      { en: 'Asks for OTP / PIN / password', hi: 'OTP / PIN / पासवर्ड मांगा गया', mr: 'OTP / PIN / पासवर्ड मागितला' },
      { en: 'Genuine banks, SEBI or brokers never ask for your OTP or PIN.', hi: 'असली बैंक, SEBI या ब्रोकर कभी OTP या PIN नहीं मांगते।', mr: 'खरी बँक, SEBI किंवा ब्रोकर कधीही OTP किंवा PIN मागत नाहीत.' }, true),
    R('grp', 20,
      /(telegram|whatsapp) ?(group|channel)|vip (group|channel)|join (our|my) (group|channel)|sure ?shot|jackpot|multibagger|insider (tip|info)|operator call|ग्रुप जॉइन|ग्रुप जॉईन|ग्रुप में जुड़ें|ग्रुपमध्ये सामील|मल्टीबैगर|मल्टीबॅगर|ऑपरेटर कॉल|पक्की (टिप|कॉल)|हमखास (टिप|कॉल)|टेलीग्राम ग्रुप|टेलिग्राम ग्रुप/i,
      { en: 'Tips group / sure-shot calls', hi: 'टिप्स ग्रुप / पक्की कॉल', mr: 'टिप्स ग्रुप / हमखास कॉल' },
      { en: 'Paid tips groups and "operator" calls are a common fraud channel.', hi: 'पैसे लेकर टिप्स देने वाले ग्रुप और "ऑपरेटर कॉल" अक्सर ठगी होते हैं।', mr: 'पैसे घेऊन टिप्स देणारे ग्रुप आणि "ऑपरेटर कॉल" अनेकदा फसवणूक असतात.' }),
    R('kyc', 25,
      /(?:\b(?:kyc|pan|aadhaar|aadhar)\b|आधार).{0,40}(update|expire|block|suspend|verify|अपडेट|बंद|ब्लॉक|संपत|खत्म)|account (will be |has been )?(blocked|suspended|freez|closed)|केवाईसी|खाता (बंद|ब्लॉक)|खाते (बंद|ब्लॉक)|account band/i,
      { en: 'KYC / account-block threat', hi: 'KYC / खाता बंद होने की धमकी', mr: 'KYC / खाते बंद होण्याची धमकी' },
      { en: 'Phishing often says your KYC expired or account will close.', hi: 'फ़िशिंग संदेश अक्सर कहते हैं कि KYC खत्म हो गया या खाता बंद होगा।', mr: 'फिशिंग मेसेज अनेकदा सांगतात की KYC संपले किंवा खाते बंद होईल.' }),
    R('fee', 20,
      /(registration|processing|advance|deposit|activation|release|tax|insurance|refund|withdrawal) (fee|charge|amount)|pay .{0,25}(first|upfront|before)|शुल्क जमा|फीस जमा|फी भरा|पहले (पैसे|रकम)|आधी पैसे|रजिस्ट्रेशन फी/i,
      { en: 'Asks you to pay first', hi: 'पहले पैसे जमा करने को कहा', mr: 'आधी पैसे भरायला सांगितले' },
      { en: 'Genuine returns never need an upfront fee or "tax" before withdrawal.', hi: 'असली निवेश में निकासी से पहले फीस या "टैक्स" नहीं लगता।', mr: 'खऱ्या गुंतवणुकीत पैसे काढण्यापूर्वी फी किंवा "टॅक्स" भरावा लागत नाही.' }),
    R('win', 15,
      /congratulations|you have (won|been selected)|winner|lottery|bonus (credited|waiting)|बधाई|इनाम|लॉटरी|जीत लिया|अभिनंदन|बक्षीस|जिंकले/i,
      { en: 'Unexpected prize / bonus', hi: 'अचानक इनाम / बोनस', mr: 'अचानक बक्षीस / बोनस' },
      { en: 'You cannot win what you never entered.', hi: 'जिसमें आपने हिस्सा नहीं लिया, उसमें इनाम नहीं मिलता।', mr: 'ज्यात तुम्ही भाग घेतला नाही त्यात बक्षीस मिळत नाही.' }),
    R('auth', 10,
      /sebi (approved|registered|certified)|rbi (approved|certified)|government (scheme|approved)|सेबी (से )?(पंजीकृत|मान्यता|मंजूर)|सरकारी (योजना|मंजूरी|मान्यता)|शासकीय योजना/i,
      { en: 'Claims official approval', hi: 'सरकारी मंज़ूरी का दावा', mr: 'सरकारी मान्यतेचा दावा' },
      { en: 'Scammers misuse SEBI/RBI names. Verify on the official website yourself.', hi: 'ठग SEBI/RBI का नाम गलत इस्तेमाल करते हैं। खुद आधिकारिक वेबसाइट पर जांचें।', mr: 'फसवणूक करणारे SEBI/RBI चे नाव चुकीच्या पद्धतीने वापरतात. अधिकृत वेबसाइटवर स्वतः तपासा.' }),
    R('sec', 15,
      /don'?t tell|keep (it )?(secret|confidential)|tell nobody|किसी को (मत|न) बताना|किसी को मत बताएं|गोपनीय रखें|कोणाला सांगू नका|कोणाला सांगायचे नाही|kisi ko mat batana/i,
      { en: 'Asks you to keep it secret', hi: 'किसी को न बताने को कहा', mr: 'कोणाला सांगू नका असे सांगितले' },
      { en: 'Secrecy blocks family from warning you.', hi: 'गोपनीयता का दबाव इसलिए कि परिवार आपको रोक न दे।', mr: 'गुप्ततेचा दबाव यासाठी की घरच्यांनी तुम्हाला थांबवू नये.' }),
    R('app', 25,
      /(download|install).{0,25}(apk|app)|\.apk\b|anydesk|teamviewer|quicksupport|screen ?shar|ऐप (इंस्टॉल|डाउनलोड)|अॅप (इन्स्टॉल|डाउनलोड)/i,
      { en: 'Asks to install app / share screen', hi: 'ऐप इंस्टॉल / स्क्रीन शेयर करने को कहा', mr: 'अॅप इन्स्टॉल / स्क्रीन शेअर करायला सांगितले' },
      { en: 'Remote-access apps let fraudsters empty your account.', hi: 'रिमोट ऐप से ठग आपका खाता खाली कर सकते हैं।', mr: 'रिमोट अॅपमुळे फसवणूक करणारे तुमचे खाते रिकामे करू शकतात.' }),
    R('qr', 30,
      /scan.{0,25}qr.{0,40}(receive|refund|get|पाने)|(receive|refund).{0,40}scan.{0,25}qr|qr.{0,40}(upi )?pin|collect request|enter (your )?upi pin to receive|पैसे पाने.{0,20}पिन|पैसे मिळवण्यासाठी.{0,20}(पिन|PIN)/i,
      { en: '"Scan / enter PIN to receive money"', hi: '"पैसे पाने के लिए स्कैन / PIN डालें"', mr: '"पैसे मिळवण्यासाठी स्कॅन / PIN टाका"' },
      { en: 'You never enter a PIN to receive money.', hi: 'पैसे पाने के लिए PIN कभी नहीं डालना पड़ता।', mr: 'पैसे मिळवण्यासाठी PIN कधीच टाकावा लागत नाही.' }),
    R('cry', 10,
      /crypto|bitcoin|forex|binary option|trading bot|ai trading|क्रिप्टो|फॉरेक्स/i,
      { en: 'Crypto / forex / bot trading pitch', hi: 'क्रिप्टो / फॉरेक्स / ट्रेडिंग बॉट का प्रचार', mr: 'क्रिप्टो / फॉरेक्स / ट्रेडिंग बॉटची जाहिरात' },
      { en: 'Often used in fake high-return platforms.', hi: 'नकली ज़्यादा-रिटर्न प्लेटफ़ॉर्म में अक्सर यही होता है।', mr: 'बनावट जास्त-परताव्याच्या प्लॅटफॉर्ममध्ये हे अनेकदा दिसते.' })
  ];

  function officialOf(h) { return OFFICIAL.find(d => h === d || h.endsWith('.' + d)); }

  function extractLinks(s) {
    const re = /(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|co|net|org|xyz|top|club|info|online|site|live|vip|buzz|link|cc|app|icu|click|fun|gov|sbi)(?:\/[^\s<>"']*)?/gi;
    return [...new Set((s.match(re) || []).map(x => x.replace(/[.,;)।]+$/, '')))];
  }

  function checkLink(u) {
    const flags = [];
    const host = u.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[\/?#]/)[0].toLowerCase().split(':')[0];
    if (/^http:\/\//i.test(u)) flags.push({ w: 10, k: 'http' });
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) flags.push({ w: 25, k: 'ip' });
    if (SHORT.includes(host)) flags.push({ w: 15, k: 'short' });
    if (host.includes('xn--')) flags.push({ w: 20, k: 'puny' });
    if (BADTLD.includes(host.split('.').pop())) flags.push({ w: 15, k: 'tld' });
    const brand = BRANDS.find(b => host.split(/[.-]/).some(p => p === b || p.startsWith(b) || p.endsWith(b)));
    if (brand && !officialOf(host)) flags.push({ w: 30, k: 'fake', brand });
    return { u, host, flags, official: !!officialOf(host) };
  }

  function analyze(text) {
    const hits = [];
    let score = 0;
    for (const r of RULES) {
      if (!r.re.test(text)) continue;
      if (r.neg) {
        const g = new RegExp(r.re.source, 'gi');
        let m, real = false;
        while ((m = g.exec(text))) {
          // look a little before AND after the match ("never share OTP", "OTP कोणालाही सांगू नका")
          if (!NEG.test(text.slice(Math.max(0, m.index - 25), m.index + m[0].length + 12))) { real = true; break; }
          if (m[0].length === 0) g.lastIndex++;
        }
        if (!real) continue;
      }
      score += r.w;
      hits.push(r);
    }
    const links = extractLinks(text).map(checkLink);
    links.forEach(l => l.flags.forEach(f => { score += f.w; }));
    score = Math.min(100, score);
    const level = score >= 55 ? 'high' : score >= 25 ? 'mid' : 'low';
    return { score, level, hits, links };
  }

  // ids stored in the user's history (never the message itself)
  function flagIds(a) {
    const ids = a.hits.map(h => h.id);
    a.links.forEach(l => l.flags.forEach(f => ids.push('l_' + f.k)));
    return [...new Set(ids)].slice(0, 30);
  }

  return { RULES, analyze, checkLink, extractLinks, flagIds, OFFICIAL };
});
