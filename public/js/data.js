/* Sample messages and quiz scenarios (en / hi / mr). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NKData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // kind: expected risk for tests ('high' | 'low')
  const SAMPLES = [
    { k: 's1', kind: 'high', t: {
      en: 'Congratulations! Join our VIP Telegram group. Guaranteed 5% daily profit, risk free. Pay registration fee today, limited slots. Tell nobody. http://sebi-invest.xyz/join',
      hi: 'बधाई हो! हमारे VIP टेलीग्राम ग्रुप में जुड़ें। रोज़ 5% पक्का मुनाफा, जोखिम बिल्कुल नहीं। आज ही रजिस्ट्रेशन फीस जमा करें, सीमित सीटें। किसी को मत बताना। http://sebi-invest.xyz/join',
      mr: 'अभिनंदन! आमच्या VIP टेलिग्राम ग्रुपमध्ये सामील व्हा. रोज 5% हमखास नफा, जोखीम नाही. आजच रजिस्ट्रेशन फी भरा, मर्यादित जागा. कोणाला सांगू नका. http://sebi-invest.xyz/join' } },
    { k: 's2', kind: 'high', t: {
      en: 'Dear customer, your KYC will expire today and your account will be blocked. Share OTP immediately to verify. Click bit.ly/kyc-now',
      hi: 'प्रिय ग्राहक, आपका KYC आज खत्म हो रहा है और खाता ब्लॉक हो जाएगा। तुरंत OTP बताएं। bit.ly/kyc-now पर क्लिक करें।',
      mr: 'प्रिय ग्राहक, तुमचे KYC आज संपत आहे आणि खाते ब्लॉक होईल. ताबडतोब OTP सांगा. bit.ly/kyc-now वर क्लिक करा.' } },
    { k: 's3', kind: 'high', t: {
      en: 'Sure shot multibagger tip, operator call, 100% profit. Join WhatsApp group now.',
      hi: 'पक्की मल्टीबैगर टिप, ऑपरेटर कॉल, 100% मुनाफा। अभी WhatsApp ग्रुप जॉइन करें।',
      mr: 'हमखास मल्टीबॅगर टिप, ऑपरेटर कॉल, 100% नफा. आत्ताच WhatsApp ग्रुप जॉइन करा.' } },
    { k: 's4', kind: 'low', t: {
      en: 'HDFC Bank: Rs 500 debited at ABC Store. Never share your OTP or PIN with anyone. If not you, call the number on your card.',
      hi: 'HDFC Bank: ABC Store पर Rs 500 कटे। अपना OTP या PIN किसी को न बताएं। आप नहीं थे तो कार्ड पर दिए नंबर पर कॉल करें।',
      mr: 'HDFC Bank: ABC Store येथे Rs 500 वजा झाले. तुमचा OTP किंवा PIN कोणालाही सांगू नका. तुम्ही नसाल तर कार्डवरील नंबरवर कॉल करा.' } }
  ];

  const QUIZ = [
    { scam: true,
      t: { en: '"Your demat KYC expired. Update now at sebi-kyc-update.top or your account will be frozen."',
           hi: '"आपका डीमैट KYC खत्म हो गया। sebi-kyc-update.top पर अभी अपडेट करें वरना खाता बंद होगा।"',
           mr: '"तुमचे डीमॅट KYC संपले. sebi-kyc-update.top वर आत्ताच अपडेट करा नाहीतर खाते बंद होईल."' },
      e: { en: 'Fake SEBI-like domain with a risky ending and a freeze threat.',
           hi: 'SEBI जैसा दिखने वाला नकली डोमेन और खाता बंद होने की धमकी।',
           mr: 'SEBI सारखे दिसणारे बनावट डोमेन आणि खाते बंद होण्याची धमकी.' } },
    { scam: false,
      t: { en: '"Rs 2,000 debited from A/c XX1234 at ABC Mart. Never share OTP or PIN with anyone."',
           hi: '"A/c XX1234 से ABC Mart पर Rs 2,000 कटे। OTP या PIN किसी को न बताएं।"',
           mr: '"A/c XX1234 मधून ABC Mart येथे Rs 2,000 वजा झाले. OTP किंवा PIN कोणालाही सांगू नका."' },
      e: { en: 'A normal debit alert that warns you NOT to share your OTP. Still check it matches your own transaction.',
           hi: 'सामान्य डेबिट अलर्ट जो OTP न बताने की सलाह देता है। फिर भी देखें कि लेन-देन आपका ही है।',
           mr: 'OTP न सांगण्याचा इशारा देणारा सामान्य डेबिट अलर्ट. तरीही व्यवहार तुमचाच आहे का ते पहा.' } },
    { scam: true,
      t: { en: '"I will double your money in 30 days. Send Rs 10,000 now, only for you, tell nobody."',
           hi: '"30 दिन में पैसा दोगुना करूँगा। अभी Rs 10,000 भेजो, सिर्फ आपके लिए, किसी को मत बताना।"',
           mr: '"३० दिवसांत पैसे दुप्पट करतो. आत्ताच Rs 10,000 पाठवा, फक्त तुमच्यासाठी, कोणाला सांगू नका."' },
      e: { en: 'Assured doubling, secrecy and upfront payment - all three are scam signs.',
           hi: 'दोगुने का वादा, गोपनीयता और पहले पैसे - तीनों ठगी के संकेत।',
           mr: 'दुप्पट करण्याचे आश्वासन, गुप्तता आणि आधी पैसे - तिन्ही फसवणुकीची चिन्हे.' } },
    { scam: true,
      t: { en: '"To receive your refund, scan this QR and enter your UPI PIN."',
           hi: '"रिफंड पाने के लिए यह QR स्कैन करें और UPI PIN डालें।"',
           mr: '"रिफंड मिळवण्यासाठी हा QR स्कॅन करा आणि UPI PIN टाका."' },
      e: { en: 'You never need a PIN to receive money.',
           hi: 'पैसे पाने के लिए PIN की ज़रूरत नहीं होती।',
           mr: 'पैसे मिळवण्यासाठी PIN ची गरज नसते.' } },
    { scam: false,
      t: { en: '"Your mutual fund SIP of Rs 1,000 will be debited on the 5th. Mutual fund investments are subject to market risks."',
           hi: '"5 तारीख को Rs 1,000 की SIP कटेगी। म्यूचुअल फंड निवेश बाज़ार जोखिमों के अधीन हैं।"',
           mr: '"५ तारखेला Rs 1,000 ची SIP वजा होईल. म्युच्युअल फंड गुंतवणूक बाजार जोखमींच्या अधीन आहे."' },
      e: { en: 'Routine reminder with a risk statement, no pressure and no link.',
           hi: 'सामान्य रिमाइंडर, जोखिम की सूचना के साथ, कोई दबाव या लिंक नहीं।',
           mr: 'जोखमीच्या सूचनेसह नेहमीचे रिमाइंडर, कोणताही दबाव किंवा लिंक नाही.' } }
  ];

  return { SAMPLES, QUIZ };
});
