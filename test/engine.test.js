'use strict';
// Run: npm test
const assert = require('assert');
const E = require('../public/js/engine.js');
const D = require('../public/js/data.js');
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('OK  ', m); };

for (const s of D.SAMPLES) {
  for (const lang of ['en', 'hi', 'mr']) {
    const a = E.analyze(s.t[lang]);
    ok(s.kind === 'high' ? a.level === 'high' : a.level === 'low', `${s.k}/${lang} -> ${a.level} (${a.score}) expected ${s.kind}`);
  }
}
const extra = [
  ['To receive your refund, scan this QR and enter your UPI PIN.', 'mid'],
  ['Mutual fund SIP of Rs 1,000 will be debited on 5th. Mutual fund investments are subject to market risks.', 'low'],
  ['Check https://www.sebi.gov.in for registered intermediaries', 'low'],
  ['आपका KYC अपडेट करें वरना खाता बंद होगा, ओटीपी बताएं, पक्का मुनाफा', 'high']
];
for (const [t, lv] of extra) ok(E.analyze(t).level === lv, `extra "${t.slice(0, 40)}" -> ${lv}`);

// i18n: every key present in every language
global.window = {}; global.document = { documentElement: {} }; global.localStorage = { getItem() { return null; }, setItem() {} };
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(require('path').join(__dirname, '../public/js/i18n.js'), 'utf8');
vm.runInThisContext(src);
const dict = global.window.NK_DICT;
const base = Object.keys(dict.en);
for (const l of ['hi', 'mr']) {
  const miss = base.filter(k => !(k in dict[l]));
  const extraK = Object.keys(dict[l]).filter(k => !(k in dict.en));
  ok(miss.length === 0 && extraK.length === 0, `i18n ${l}: missing=[${miss}] extra=[${extraK}]`);
  const arr = base.filter(k => Array.isArray(dict.en[k]) && (!Array.isArray(dict[l][k]) || dict[l][k].length !== dict.en[k].length));
  ok(arr.length === 0, `i18n ${l}: array lengths match [${arr}]`);
}
process.exit(fail ? 1 : 0);
