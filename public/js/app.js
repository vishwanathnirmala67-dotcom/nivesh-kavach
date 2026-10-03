/* NiveshKavach single-page app (hash routing). No frameworks. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = window.Engine, D = window.NKData, t = window.t, NK = window.NK;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } } };
  const state = { user: null, text: '', last: null, qi: 0, qs: 0, qans: null, qdone: false, demoTimer: null, rec: null };

  /* ---------- icons ---------- */
  const IC = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.6 9.6 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4V8z"/><circle cx="12" cy="13" r="3.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
    vol: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
    phoneCall: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    file: '<path d="M6 3h8l4 4v14H6V3z"/><path d="M14 3v4h4"/>'
  };
  const icon = (n, s = 20) => `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

  /* ---------- utils ---------- */
  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }
  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: { 'X-Requested-With': 'nk' }, credentials: 'same-origin' };
    if (opts.body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    if (opts.form) init.body = opts.form;
    let res;
    try { res = await fetch('/api' + path, init); } catch (_) { throw { code: 'network' }; }
    let data = {};
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) throw { code: data.error || 'generic', status: res.status, field: data.field };
    return data;
  }
  const errMsg = code => { const k = 'err_' + code; const s = t(k); return s === k ? t('err_generic') : s; };
  const normPhone = p => {
    let d = String(p || '').replace(/[\s\-()]/g, '');
    if (d.startsWith('+91')) d = d.slice(3); else if (d.length === 12 && d.startsWith('91')) d = d.slice(2); else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
  };
  const V = {
    name: v => /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,59}$/u.test(String(v).replace(/\s+/g, ' ').trim()),
    phone: v => !!normPhone(v),
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) && String(v).length <= 120,
    pass: v => v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v)
  };
  const firstName = n => String(n || '').split(' ')[0];
  const initials = n => Array.from(String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => Array.from(w)[0] || '')).join('').toUpperCase();
  const avatarHTML = u => u.avatar ? `<img class="av" src="${esc(u.avatar)}" alt="">` : `<span class="av-i">${esc(initials(u.name))}</span>`;
  const flagLabel = id => {
    if (id.startsWith('l_')) return t('lf_' + id.slice(2), { brand: '' }).replace(/\s+/g, ' ').trim();
    const r = E.RULES.find(x => x.id === id);
    return r ? r.t[NK.lang] : id;
  };
  function busy(form, on) { const b = $('button[type=submit]', form); if (b) { b.disabled = on; b.classList.toggle('busy', on); } }
  const setErr = (f, field, msg) => { const e = $(`[data-err="${field}"]`, f); if (e) e.textContent = msg || ''; };
  const clearErrs = f => $$('[data-err]', f).forEach(e => { e.textContent = ''; });

  /* ---------- theme / language ---------- */
  const theme = () => document.documentElement.getAttribute('data-theme');
  function setTheme(m) {
    document.documentElement.setAttribute('data-theme', m);
    LS.set('nk_theme', m);
    const meta = $('meta[name=theme-color]'); if (meta) meta.setAttribute('content', m === 'dark' ? '#050608' : '#14b8a6');
    renderHeader();
  }
  function setBig() { const on = !document.documentElement.classList.contains('big'); document.documentElement.classList.toggle('big', on); LS.set('nk_big', on ? '1' : '0'); }

  /* ---------- header / footer ---------- */
  function renderHeader() {
    const u = state.user, dark = theme() === 'dark';
    const links = [['', 'nav_home'], ['check', 'nav_check'], ['quiz', 'nav_quiz'], ['help', 'nav_help']];
    if (u) links.push(['dashboard', 'nav_dashboard']);
    $('#hdr').innerHTML = `<div class="container bar">
      <a class="brand" href="#/" aria-label="${esc(t('brand_a') + t('brand_b'))}"><img src="/assets/logo.svg" alt="" width="36" height="36"><span class="brand-name">${t('brand_a')}<b>${t('brand_b')}</b></span></a>
      <nav id="nav" class="nav" aria-label="Main">${links.map(([h, k]) => `<a href="#/${h}" data-r="${h}">${t(k)}</a>`).join('')}</nav>
      <div class="tools">
        <select id="langSel" class="lang" aria-label="${esc(t('lang_label'))}">${[['en', 'English'], ['hi', 'हिन्दी'], ['mr', 'मराठी']].map(([c, n]) => `<option value="${c}"${NK.lang === c ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <button id="themeBtn" class="icon-btn" title="${esc(dark ? t('theme_to_light') : t('theme_to_dark'))}" aria-label="${esc(dark ? t('theme_to_light') : t('theme_to_dark'))}">${icon(dark ? 'sun' : 'moon')}</button>
        <button id="bigBtn" class="icon-btn" title="${esc(t('big_text'))}" aria-label="${esc(t('big_text'))}">A+</button>
        ${u ? `<a class="avatar-sm" href="#/profile" title="${esc(t('nav_profile'))}">${avatarHTML(u)}</a><button id="logoutBtn" class="icon-btn" title="${esc(t('logout'))}" aria-label="${esc(t('logout'))}">${icon('logout')}</button>`
            : `<a class="btn btn-ghost btn-sm" href="#/login">${t('login')}</a><a class="btn btn-primary btn-sm" href="#/register">${t('register')}</a>`}
        <button id="menuBtn" class="icon-btn menu" aria-label="${esc(t('menu'))}" aria-expanded="false">${icon('menu')}</button>
      </div></div>`;
    $('#langSel').onchange = e => { NK.setLang(e.target.value); renderHeader(); renderFooter(); $('#skipLink').textContent = t('skip'); route(); };
    $('#themeBtn').onclick = () => setTheme(dark ? 'light' : 'dark');
    $('#bigBtn').onclick = setBig;
    $('#menuBtn').onclick = e => { const n = $('#nav'); const o = n.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); };
    $$('#nav a').forEach(a => a.addEventListener('click', () => $('#nav').classList.remove('open')));
    const lo = $('#logoutBtn'); if (lo) lo.onclick = logout;
    markNav();
  }
  function markNav() { const cur = currentRoute(); $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === cur)); }
  function renderFooter() {
    $('#ftr').innerHTML = `<div class="container"><span>${t('foot_disc')}</span><span>${t('foot_built')}</span></div>`;
  }
  async function logout() {
    try { await api('/logout', { method: 'POST' }); } catch (_) { /* ignore */ }
    state.user = null; renderHeader(); toast(t('bye_toast'), 'ok'); location.hash = '#/';
  }

  /* ---------- views ---------- */
  function viewHome() {
    const u = state.user;
    const feats = [['bolt', 'f1'], ['link', 'f2'], ['mic', 'f3'], ['lock', 'f4'], ['quiz', 'f5'], ['phoneCall', 'f6']];
    return `
    <section class="hero container">
      <div>
        <span class="badge">${icon('shield', 16)} ${t('h_badge')}</span>
        <h1>${t('h_title1')} <span class="grad">${t('h_title2')}</span></h1>
        <p class="lead">${t('h_sub')}</p>
        <div class="cta-row">
          ${u ? `<a class="btn btn-primary btn-lg" href="#/dashboard">${t('cta_dash')}</a>` : `<a class="btn btn-primary btn-lg" href="#/register">${t('cta_start')}</a>`}
          <a class="btn btn-lg" href="#/check">${t('cta_try')}</a>
        </div>
        <div class="pills"><span class="pill">${icon('check', 14)} ${t('pill1')}</span><span class="pill">${icon('globe', 14)} ${t('pill2')}</span><span class="pill">${icon('mic', 14)} ${t('pill3')}</span></div>
      </div>
      <div class="phone" aria-label="${esc(t('demo_live'))}">
        <div class="phone-top"><span><span class="live-dot"></span>${t('demo_live')}</span><span>${t('demo_msg')}</span></div>
        <div id="demo"></div>
      </div>
    </section>
    <section class="section container">
      <div class="card"><div class="stats">
        <div class="stat"><b>${E.RULES.length}</b><span>${t('st1')}</span></div>
        <div class="stat"><b>3</b><span>${t('st2')}</span></div>
        <div class="stat"><b>0</b><span>${t('st3')}</span></div>
        <div class="stat"><b>1930</b><span>${t('st4')}</span></div>
      </div></div>
    </section>
    <section class="section container">
      <div class="sec-head"><h2>${t('f_title')}</h2><p class="muted">${t('f_sub')}</p></div>
      <div class="grid-3">${feats.map(([ic, k]) => `<div class="card feat"><div class="ico">${icon(ic, 24)}</div><h3>${t(k + 't')}</h3><p>${t(k + 'd')}</p></div>`).join('')}</div>
    </section>
    <section class="section container">
      <div class="sec-head"><h2>${t('how_title')}</h2></div>
      <div class="grid-3 steps">${['s1', 's2', 's3'].map(k => `<div class="card step"><h3>${t(k + 't')}</h3><p class="muted">${t(k + 'd')}</p></div>`).join('')}</div>
    </section>
    <section class="section container">
      <div class="card"><h2>${t('promise_title')}</h2><div class="promise">${['promise1', 'promise2', 'promise3', 'promise4'].map(k => `<div>${icon('check', 18)}<span>${t(k)}</span></div>`).join('')}</div></div>
    </section>
    <section class="section container">
      <div class="cta-band"><h2>${t('cta2_title')}</h2><p>${t('cta2_sub')}</p><a class="btn btn-lg" href="#/${u ? 'check' : 'register'}">${u ? t('cta_try') : t('cta_start')}</a></div>
    </section>`;
  }
  function mountHome() {
    const box = $('#demo'); if (!box) return;
    let i = 0;
    const step = () => {
      const s = D.SAMPLES[i % D.SAMPLES.length]; i++;
      const a = E.analyze(s.t[NK.lang]);
      box.innerHTML = `<div class="bubble">${esc(s.t[NK.lang])}</div>
        <div class="demo-res lv-${a.level}"><span class="dot"></span><b>${t('lvl_' + a.level)}</b><span>${a.score}/100</span></div>
        <div class="chips">${a.hits.slice(0, 3).map(h => `<span class="chip">${esc(h.t[NK.lang])}</span>`).join('')}</div>`;
    };
    step();
    state.demoTimer = setInterval(step, 4500);
  }

  function emptyResult() { return `<div class="card idle">${icon('shield', 40)}<h3>${t('c_idle_t')}</h3><p>${t('c_idle_d')}</p></div>`; }
  function resultHTML(a) {
    const L = NK.lang;
    const hits = a.hits.length ? a.hits.map(r => `<div class="flag"><b>${esc(r.t[L])}</b><span>${esc(r.d[L])}</span></div>`).join('') : `<p class="muted">${t('c_none')}</p>`;
    const links = a.links.length ? `<h4>${t('c_links')}</h4>` + a.links.map(l => `<div class="flag link${l.flags.length ? '' : ' okl'}"><b>${esc(l.host)}</b>${l.official && !l.flags.length ? `<span>${t('lf_official')}</span>` : ''}${l.flags.map(f => `<span>• ${esc(t('lf_' + f.k, { brand: (f.brand || '').toUpperCase() }))}</span>`).join('<br>')}</div>`).join('') : '';
    return `<div class="card result lv-${a.level} fade">
      <div class="gauge-wrap">
        <svg class="gauge" viewBox="0 0 200 120" role="img" aria-label="${esc(t('score'))} ${a.score}/100">
          <path class="g-bg" d="M20 100A80 80 0 0 1 180 100" pathLength="100"/>
          <path class="g-fg" id="gfg" d="M20 100A80 80 0 0 1 180 100" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
          <text class="g-num" id="gnum" x="100" y="88">0</text><text class="g-sub" x="100" y="108">${esc(t('score'))}</text>
        </svg>
        <span class="lvl-badge">${t('lvl_' + a.level)}</span>
      </div>
      ${hits}${links}
      <h4>${t('c_next')}</h4><ol class="todo">${t('steps_' + a.level).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="row"><button class="btn" id="speakBtn">${icon('vol', 18)} ${t('c_speak')}</button><button class="btn" id="shareBtn">${icon('share', 18)} ${t('c_share')}</button></div>
      <p class="muted small disc">${t('c_disc')}</p>
    </div>`;
  }
  function animateGauge(score) {
    const fg = $('#gfg'), num = $('#gnum'); if (!fg || !num) return;
    requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.strokeDashoffset = String(100 - score); }));
    const start = performance.now();
    (function tick(now) { const p = Math.min(1, (now - start) / 900); num.textContent = Math.round(score * p); if (p < 1) requestAnimationFrame(tick); })(start);
  }
  function viewCheck() {
    return `<section class="container page">
      <div class="page-head"><h2>${t('c_title')}</h2><p>${t('c_sub')}</p></div>
      <div class="grid-2">
        <div class="card">
          <label class="lbl" for="msg">${t('c_paste')}</label>
          <textarea id="msg" placeholder="${esc(t('c_ph'))}">${esc(state.text)}</textarea>
          <div class="row">
            <button class="btn btn-primary" id="goBtn">${icon('shield', 18)} ${t('c_check')}</button>
            <button class="btn" id="micBtn">${icon('mic', 18)} <span>${t('c_mic')}</span></button>
            <button class="btn btn-ghost" id="clrBtn">${t('c_clear')}</button>
          </div>
          <p class="muted small" style="margin-top:14px">${t('c_samples')}</p>
          <div class="row" id="samples" style="margin-top:6px">${D.SAMPLES.map((s, i) => `<button class="btn btn-sm" data-i="${i}">${t('c_' + s.k)}</button>`).join('')}</div>
          <p class="muted small privnote">${icon('lock', 14)} ${t('c_private')}</p>
        </div>
        <div id="resultBox">${state.last ? resultHTML(state.last) : emptyResult()}</div>
      </div></section>`;
  }
  function bindResult() {
    const sp = $('#speakBtn'), sh = $('#shareBtn'); if (sp) sp.onclick = speak; if (sh) sh.onclick = share;
  }
  function mountCheck() {
    const ta = $('#msg');
    ta.addEventListener('input', () => { state.text = ta.value; });
    $('#goBtn').onclick = runCheck;
    $('#clrBtn').onclick = () => { state.text = ''; state.last = null; ta.value = ''; $('#resultBox').innerHTML = emptyResult(); };
    $('#micBtn').onclick = toggleMic;
    $$('#samples button').forEach(b => { b.onclick = () => { ta.value = state.text = D.SAMPLES[+b.dataset.i].t[NK.lang]; runCheck(); }; });
    bindResult();
    if (state.last) animateGauge(state.last.score);
  }
  async function runCheck() {
    const v = (state.text || '').trim();
    if (!v) return toast(t('c_empty'), 'warn');
    const a = E.analyze(v);
    state.last = a;
    $('#resultBox').innerHTML = resultHTML(a);
    bindResult(); animateGauge(a.score);
    $('#resultBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (state.user) {
      try { await api('/history', { method: 'POST', body: { score: a.score, level: a.level, flags: E.flagIds(a) } }); toast(t('c_saved'), 'ok'); } catch (e) { if (e.code === 'auth') { state.user = null; renderHeader(); } }
    } else toast(t('c_login_hint'));
  }
  function speak() {
    const a = state.last; if (!a || !window.speechSynthesis) return;
    const L = NK.lang;
    const txt = [t('lvl_' + a.level), ...a.hits.map(r => r.t[L] + '. ' + r.d[L]), ...t('steps_' + a.level)].join('. ');
    const u = new SpeechSynthesisUtterance(txt); u.lang = NK.locale; speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  function share() {
    if (!state.last) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(t('share_text', { level: t('lvl_' + state.last.level) })), '_blank', 'noopener');
  }
  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast(t('c_voice_no'), 'warn');
    const btn = $('#micBtn');
    if (state.rec) { state.rec.stop(); return; }
    const r = new SR(); r.lang = NK.locale; r.interimResults = false; state.rec = r;
    $('span', btn).textContent = t('c_listening');
    r.onresult = e => { const ta = $('#msg'); ta.value = state.text = ((ta.value ? ta.value + ' ' : '') + e.results[0][0].transcript).trim(); runCheck(); };
    r.onerror = () => toast(t('c_voice_err'), 'warn');
    r.onend = () => { state.rec = null; const s = $('#micBtn span'); if (s) s.textContent = t('c_mic'); };
    try { r.start(); } catch (_) { state.rec = null; }
  }

  /* quiz */
  function viewQuiz() {
    const n = D.QUIZ.length;
    if (state.qdone) {
      const msg = state.qs >= 4 ? 'q_msg_great' : state.qs >= 3 ? 'q_msg_ok' : 'q_msg_low';
      return `<section class="container page"><div class="qwrap"><div class="card fade" style="text-align:center">
        <h2>${t('q_done')}</h2><div class="bigscore grad">${state.qs} / ${n}</div><p>${t(msg)}</p>
        ${state.user ? `<p class="muted small" style="margin-top:8px">${t('q_saved')}</p>` : `<p class="muted small" style="margin-top:8px">${t('c_login_hint')}</p>`}
        <div class="row" style="justify-content:center"><button class="btn btn-primary" id="againBtn">${t('q_again')}</button></div></div></div></section>`;
    }
    const q = D.QUIZ[state.qi], L = NK.lang;
    const ans = state.qans;
    const fb = ans === null ? '' : `<div class="fb lv-${ans.ok ? 'low' : 'high'}"><b>${ans.ok ? t('q_right') : t('q_wrong')}</b> ${esc(q.e[L])}</div><div class="row"><button class="btn btn-primary" id="nextBtn">${state.qi === n - 1 ? t('q_finish') : t('q_next')}</button></div>`;
    return `<section class="container page"><div class="qwrap">
      <div class="page-head"><h2>${t('q_title')}</h2><p>${t('q_sub')}</p></div>
      <div class="card"><div class="muted small">${t('q_of', { i: state.qi + 1, n })}</div>
        <div class="qbar"><i style="width:${(state.qi / n) * 100}%"></i></div>
        <div class="qtext">${esc(q.t[L])}</div>
        <div class="qbtns"><button class="btn btn-primary" data-a="1"${ans ? ' disabled' : ''}>${icon('alert', 18)} ${t('q_scam')}</button><button class="btn" data-a="0"${ans ? ' disabled' : ''}>${icon('check', 18)} ${t('q_safe')}</button></div>
        ${fb}</div></div></section>`;
  }
  function mountQuiz() {
    $$('.qbtns [data-a]').forEach(b => { b.onclick = () => { const q = D.QUIZ[state.qi]; const ok = (b.dataset.a === '1') === q.scam; if (ok) state.qs++; state.qans = { ok }; route(); }; });
    const nx = $('#nextBtn'); if (nx) nx.onclick = async () => {
      state.qans = null;
      if (state.qi === D.QUIZ.length - 1) {
        state.qdone = true; route();
        if (state.user) { try { await api('/quiz', { method: 'POST', body: { score: state.qs, total: D.QUIZ.length } }); } catch (_) { /* ignore */ } }
      } else { state.qi++; route(); }
    };
    const ag = $('#againBtn'); if (ag) ag.onclick = () => { state.qi = 0; state.qs = 0; state.qdone = false; state.qans = null; route(); };
  }

  /* help */
  function viewHelp() {
    return `<section class="container page">
      <div class="page-head"><h2>${t('help_title')}</h2><p>${t('help_sub')}</p></div>
      <div class="tips">${t('help_tips').map(x => `<div class="card tip">${icon('shield', 22)}<span>${esc(x)}</span></div>`).join('')}</div>
      <h3 style="margin-top:34px">${t('help_res')}</h3>
      <div class="res">
        <a class="card" href="tel:1930"><b>${icon('phoneCall', 20)} ${t('help_call')}</b><span class="muted">${t('help_call_d')}</span></a>
        <a class="card" href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer"><b>cybercrime.gov.in</b><span class="muted">${t('help_portal_d')}</span></a>
        <a class="card" href="https://scores.sebi.gov.in" target="_blank" rel="noopener noreferrer"><b>SEBI SCORES</b><span class="muted">${t('help_scores_d')}</span></a>
      </div></section>`;
  }

  /* auth */
  function field(o) {
    return `<div class="field"><label for="f_${o.name}">${t(o.label)}</label>
      <div class="inp${o.ro ? ' ro' : ''}"><span class="ico">${icon(o.icon, 18)}</span>${o.pre ? `<span class="pre">${o.pre}</span>` : ''}
      <input id="f_${o.name}" name="${o.name}" type="${o.type || 'text'}" placeholder="${esc(t(o.ph || ''))}" autocomplete="${o.ac || 'off'}"${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}${o.maxlength ? ` maxlength="${o.maxlength}"` : ''}${o.value !== undefined ? ` value="${esc(o.value)}"` : ''}${o.ro ? ' readonly' : ''}>
      ${o.type === 'password' ? `<button type="button" class="eye" data-eye aria-label="${esc(t('show_pass'))}">${icon('eye', 18)}</button>` : ''}</div>
      <small class="err" data-err="${o.name}" role="alert"></small>${o.hint ? `<div class="hint">${t(o.hint)}</div>` : ''}${o.meter ? '<div class="meter"><i id="meterBar"></i></div>' : ''}</div>`;
  }
  const authSide = () => `<aside class="auth-side"><img src="/assets/logo.svg" alt=""><h2>${t('a_side_title')}</h2><ul>${['a_side1', 'a_side2', 'a_side3'].map(k => `<li>${icon('check', 18)} ${t(k)}</li>`).join('')}</ul></aside>`;
  function viewLogin() {
    return `<div class="auth">${authSide()}<div class="auth-main"><div class="auth-card fade"><h2>${t('a_login_title')}</h2><p>${t('a_login_sub')}</p>
      <form id="loginForm" novalidate>${field({ name: 'email', label: 'f_email', icon: 'mail', type: 'email', ph: 'ph_email', ac: 'email' })}${field({ name: 'password', label: 'f_pass', icon: 'lock', type: 'password', ph: 'ph_pass', ac: 'current-password' })}
      <button class="btn btn-primary btn-lg" style="width:100%" type="submit">${t('btn_login')}</button></form>
      <p class="switch">${t('no_acc')} <a href="#/register">${t('register')}</a></p></div></div></div>`;
  }
  function viewRegister() {
    return `<div class="auth">${authSide()}<div class="auth-main"><div class="auth-card fade"><h2>${t('a_reg_title')}</h2><p>${t('a_reg_sub')}</p>
      <form id="regForm" novalidate>
      ${field({ name: 'name', label: 'f_name', icon: 'user', ph: 'ph_name', ac: 'name', maxlength: 60 })}
      ${field({ name: 'phone', label: 'f_phone', icon: 'phone', type: 'tel', ph: 'ph_phone', ac: 'tel', pre: '+91', inputmode: 'numeric', maxlength: 14 })}
      ${field({ name: 'email', label: 'f_email', icon: 'mail', type: 'email', ph: 'ph_email', ac: 'email' })}
      ${field({ name: 'password', label: 'f_newpass', icon: 'lock', type: 'password', ph: 'ph_newpass', ac: 'new-password', hint: 'pass_hint', meter: true })}
      <label class="check"><input type="checkbox" name="consent"><span>${t('consent')}</span></label><small class="err" data-err="consent"></small>
      <button class="btn btn-primary btn-lg" style="width:100%;margin-top:10px" type="submit">${t('btn_register')}</button></form>
      <p class="switch">${t('have_acc')} <a href="#/login">${t('login')}</a></p></div></div></div>`;
  }
  function strength(p) {
    let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  function bindEyes(root) {
    $$('[data-eye]', root).forEach(b => {
      b.onclick = () => { const inp = $('input', b.parentElement); const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.innerHTML = icon(show ? 'eyeoff' : 'eye', 18); b.setAttribute('aria-label', show ? t('hide_pass') : t('show_pass')); };
    });
  }
  function handleErr(f, e) {
    if (e.code === 'auth') { state.user = null; renderHeader(); toast(t('err_auth'), 'warn'); location.hash = '#/login'; return; }
    if (e.field && $(`[data-err="${e.field}"]`, f)) setErr(f, e.field, errMsg(e.code)); else toast(errMsg(e.code), 'bad');
  }
  function mountLogin() {
    const f = $('#loginForm'); bindEyes(f);
    f.onsubmit = async ev => {
      ev.preventDefault(); clearErrs(f);
      const v = Object.fromEntries(new FormData(f)); let ok = true;
      if (!V.email(v.email)) { setErr(f, 'email', t('err_invalid_email')); ok = false; }
      if (!v.password) { setErr(f, 'password', t('err_required')); ok = false; }
      if (!ok) return;
      busy(f, true);
      try { const r = await api('/login', { method: 'POST', body: { email: v.email, password: v.password } }); state.user = r.user; renderHeader(); toast(t('welcome_toast', { name: firstName(r.user.name) }), 'ok'); location.hash = '#/dashboard'; }
      catch (e) { if (e.code === 'creds') setErr(f, 'password', errMsg('creds')); else toast(errMsg(e.code), 'bad'); }
      finally { busy(f, false); }
    };
  }
  function mountRegister() {
    const f = $('#regForm'); bindEyes(f);
    const bar = $('#meterBar');
    $('#f_password').addEventListener('input', e => { const s = strength(e.target.value); bar.style.width = (s / 5 * 100) + '%'; bar.style.background = s <= 2 ? 'var(--bad)' : s <= 3 ? 'var(--warn)' : 'var(--ok)'; });
    f.onsubmit = async ev => {
      ev.preventDefault(); clearErrs(f);
      const v = Object.fromEntries(new FormData(f)); let ok = true;
      if (!V.name(v.name)) { setErr(f, 'name', t('err_invalid_name')); ok = false; }
      if (!V.phone(v.phone)) { setErr(f, 'phone', t('err_invalid_phone')); ok = false; }
      if (!V.email(v.email)) { setErr(f, 'email', t('err_invalid_email')); ok = false; }
      if (!V.pass(v.password)) { setErr(f, 'password', t('err_invalid_password')); ok = false; }
      if (!f.consent.checked) { setErr(f, 'consent', t('err_consent')); ok = false; }
      if (!ok) return;
      busy(f, true);
      try { const r = await api('/register', { method: 'POST', body: { name: v.name, phone: v.phone, email: v.email, password: v.password } }); state.user = r.user; renderHeader(); toast(t('welcome_toast', { name: firstName(r.user.name) }), 'ok'); location.hash = '#/dashboard'; }
      catch (e) { handleErr(f, e); }
      finally { busy(f, false); }
    };
  }

  /* dashboard */
  async function loadDashboard() { const d = await api('/stats'); state.user = d.user; return d; }
  function viewDashboard(d) {
    const u = state.user, n = d.checks || 0, lv = d.levels;
    const pct = k => (n ? (lv[k] / n) * 100 : 0);
    const col = { low: 'var(--ok)', mid: 'var(--warn)', high: 'var(--bad)' };
    const dt = ts => new Date(ts).toLocaleString(NK.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<section class="container page">
      <div class="page-head" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div class="avatar-sm" style="width:64px;height:64px">${avatarHTML(u)}</div>
        <div><h2>${t('d_hello', { name: esc(firstName(u.name)) })}</h2><p>${t('d_sub')}</p></div>
        <a class="btn btn-primary" style="margin-left:auto" href="#/check">${icon('shield', 18)} ${t('d_cta')}</a></div>
      <div class="kpis">
        <div class="card kpi lv-low"><b data-count="${n}">0</b><span>${t('d_checks')}</span></div>
        <div class="card kpi lv-high"><b data-count="${lv.high}" style="color:var(--bad)">0</b><span>${t('d_high')}</span></div>
        <div class="card kpi"><b data-count="${d.quiz.best}" data-suffix="%">0</b><span>${t('d_quiz')}</span></div>
        <div class="card kpi"><b data-count="${d.quiz.attempts}">0</b><span>${t('d_plays')}</span></div>
      </div>
      <div class="grid-2">
        <div class="card"><h3>${t('d_recent')}</h3>
          ${d.recent.length ? `<ul class="list">${d.recent.map(r => `<li class="lv-${r.level}"><span class="dot"></span><div>${esc(t('lvl_' + r.level))}<small>${esc(dt(r.t))}${r.flags.length ? ' - ' + esc(r.flags.slice(0, 2).map(flagLabel).join(', ')) : ''}</small></div><span class="sc">${r.score}</span></li>`).join('')}</ul>` : `<p class="muted" style="margin-top:10px">${t('d_empty')}</p>`}
          <p class="muted small" style="margin-top:12px">${icon('lock', 14)} ${t('d_privacy')}</p></div>
        <div class="stack">
          <div class="card"><h3>${t('d_dist')}</h3>
            <div class="dist">${['low', 'mid', 'high'].map(k => `<i style="width:${pct(k)}%;background:${col[k]}"></i>`).join('')}</div>
            <div class="legend">${['low', 'mid', 'high'].map(k => `<span><i style="background:${col[k]}"></i>${t('lvl_' + k)}: ${lv[k]}</span>`).join('')}</div></div>
          <div class="card"><h3>${t('d_top')}</h3>
            ${d.top.length ? `<div class="chips" style="margin-top:12px">${d.top.map(x => `<span class="chip">${esc(flagLabel(x.id))} (${x.n})</span>`).join('')}</div>` : `<p class="muted" style="margin-top:10px">${t('d_none')}</p>`}</div>
        </div>
      </div></section>`;
  }
  function mountDashboard() {
    $$('[data-count]').forEach(el => {
      const end = +el.dataset.count, suf = el.dataset.suffix || '', start = performance.now();
      (function tick(now) { const p = Math.min(1, (now - start) / 800); el.textContent = Math.round(end * p) + suf; if (p < 1) requestAnimationFrame(tick); })(start);
    });
  }

  /* profile */
  function viewProfile() {
    const u = state.user;
    const date = new Date(u.createdAt).toLocaleDateString(NK.locale, { day: 'numeric', month: 'long', year: 'numeric' });
    return `<section class="container page"><div class="page-head"><h2>${t('p_title')}</h2></div>
      <div class="prof">
        <div class="card prof-card">
          <div class="avatar-lg" id="avatarBox">${avatarHTML(u)}</div>
          <h3>${esc(u.name)}</h3><p class="muted small">${t('p_member', { date })}</p>
          <input type="file" id="avatarFile" accept="image/png,image/jpeg,image/webp" hidden>
          <button class="btn btn-primary" id="photoBtn">${icon('camera', 18)} ${t('p_photo')}</button>
          ${u.avatar ? `<button class="btn" id="rmPhotoBtn">${icon('trash', 18)} ${t('p_remove')}</button>` : ''}
          <small class="err" data-err="avatar" style="text-align:center"></small>
        </div>
        <div class="stack">
          <div class="card"><h3 style="margin-bottom:14px">${t('p_details')}</h3>
            <form id="profForm" novalidate>
              ${field({ name: 'name', label: 'f_name', icon: 'user', ph: 'ph_name', ac: 'name', value: u.name, maxlength: 60 })}
              ${field({ name: 'phone', label: 'f_phone', icon: 'phone', type: 'tel', ph: 'ph_phone', ac: 'tel', pre: '+91', value: u.phone, inputmode: 'numeric', maxlength: 14 })}
              ${field({ name: 'email', label: 'f_email', icon: 'mail', type: 'email', ph: 'ph_email', value: u.email, ro: true, hint: 'p_email_ro' })}
              <button class="btn btn-primary" type="submit">${t('p_save')}</button></form></div>
          <div class="card"><h3 style="margin-bottom:14px">${t('p_security')}</h3>
            <form id="passForm" novalidate>
              ${field({ name: 'current', label: 'f_curpass', icon: 'lock', type: 'password', ph: 'ph_pass', ac: 'current-password' })}
              ${field({ name: 'next', label: 'f_newpass', icon: 'lock', type: 'password', ph: 'ph_newpass', ac: 'new-password', hint: 'pass_hint' })}
              <button class="btn" type="submit">${t('p_changepass')}</button></form></div>
          <div class="card danger"><h3>${t('p_danger')}</h3><p class="muted" style="margin:6px 0 12px">${t('p_delete_desc')}</p>
            <button class="btn btn-danger" id="delBtn">${icon('trash', 18)} ${t('p_delete')}</button>
            <form id="delForm" hidden novalidate style="margin-top:14px">${field({ name: 'password', label: 'p_delete_confirm', icon: 'lock', type: 'password', ph: 'ph_pass', ac: 'current-password' })}
              <div class="row"><button class="btn btn-danger" type="submit">${t('p_delete_go')}</button><button class="btn" type="button" id="delCancel">${t('p_cancel')}</button></div></form></div>
        </div></div></section>`;
  }
  function cropSquare(file, size) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = size;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url); c.toBlob(b => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', 0.88);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
      img.src = url;
    });
  }
  function mountProfile() {
    const fileIn = $('#avatarFile'), page = $('.prof').parentElement;
    $('#photoBtn').onclick = () => fileIn.click();
    fileIn.onchange = async () => {
      const f = fileIn.files[0]; if (!f) return; setErr(page, 'avatar', '');
      if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return setErr(page, 'avatar', t('err_file_type'));
      if (f.size > 12 * 1024 * 1024) return setErr(page, 'avatar', t('err_file_big'));
      const btn = $('#photoBtn'); btn.disabled = true; btn.textContent = t('p_uploading');
      try {
        const blob = await cropSquare(f, 320), fd = new FormData(); fd.append('avatar', blob, 'avatar.jpg');
        const r = await api('/me/avatar', { method: 'POST', form: fd }); state.user = r.user; renderHeader(); toast(t('p_photo_ok'), 'ok'); route();
      } catch (e) { setErr(page, 'avatar', e.code ? errMsg(e.code) : t('err_file_type')); btn.disabled = false; btn.innerHTML = icon('camera', 18) + ' ' + t('p_photo'); }
    };
    const rm = $('#rmPhotoBtn'); if (rm) rm.onclick = async () => { try { const r = await api('/me/avatar', { method: 'DELETE' }); state.user = r.user; renderHeader(); toast(t('p_photo_gone'), 'ok'); route(); } catch (e) { toast(errMsg(e.code), 'bad'); } };
    const pf = $('#profForm'); bindEyes(document);
    pf.onsubmit = async ev => {
      ev.preventDefault(); clearErrs(pf); const v = Object.fromEntries(new FormData(pf)); let ok = true;
      if (!V.name(v.name)) { setErr(pf, 'name', t('err_invalid_name')); ok = false; }
      if (!V.phone(v.phone)) { setErr(pf, 'phone', t('err_invalid_phone')); ok = false; }
      if (!ok) return; busy(pf, true);
      try { const r = await api('/me', { method: 'PUT', body: { name: v.name, phone: v.phone } }); state.user = r.user; renderHeader(); toast(t('p_saved'), 'ok'); route(); }
      catch (e) { handleErr(pf, e); } finally { busy(pf, false); }
    };
    const pw = $('#passForm');
    pw.onsubmit = async ev => {
      ev.preventDefault(); clearErrs(pw); const v = Object.fromEntries(new FormData(pw)); let ok = true;
      if (!v.current) { setErr(pw, 'current', t('err_required')); ok = false; }
      if (!V.pass(v.next)) { setErr(pw, 'next', t('err_invalid_password')); ok = false; }
      if (!ok) return; busy(pw, true);
      try { await api('/me/password', { method: 'POST', body: { current: v.current, next: v.next } }); pw.reset(); toast(t('p_pass_ok'), 'ok'); }
      catch (e) { if (e.code === 'wrong_password') setErr(pw, 'current', errMsg(e.code)); else if (e.code === 'invalid_password') setErr(pw, 'next', errMsg(e.code)); else handleErr(pw, e); }
      finally { busy(pw, false); }
    };
    const df = $('#delForm');
    $('#delBtn').onclick = () => { df.hidden = false; $('#delBtn').hidden = true; };
    $('#delCancel').onclick = () => { df.hidden = true; $('#delBtn').hidden = false; clearErrs(df); };
    df.onsubmit = async ev => {
      ev.preventDefault(); clearErrs(df); const v = Object.fromEntries(new FormData(df));
      if (!v.password) return setErr(df, 'password', t('err_required'));
      busy(df, true);
      try { await api('/me/delete', { method: 'POST', body: { password: v.password } }); state.user = null; renderHeader(); toast(t('p_deleted'), 'ok'); location.hash = '#/'; }
      catch (e) { if (e.code === 'wrong_password') setErr(df, 'password', errMsg(e.code)); else handleErr(df, e); } finally { busy(df, false); }
    };
  }

  /* ---------- router ---------- */
  const ROUTES = {
    '': { view: viewHome, mount: mountHome, title: 'nav_home' },
    check: { view: viewCheck, mount: mountCheck, title: 'nav_check' },
    quiz: { view: viewQuiz, mount: mountQuiz, title: 'nav_quiz' },
    help: { view: viewHelp, title: 'nav_help' },
    login: { view: viewLogin, mount: mountLogin, guest: true, title: 'login' },
    register: { view: viewRegister, mount: mountRegister, guest: true, title: 'register' },
    dashboard: { view: viewDashboard, mount: mountDashboard, auth: true, load: loadDashboard, title: 'nav_dashboard' },
    profile: { view: viewProfile, mount: mountProfile, auth: true, title: 'nav_profile' }
  };
  const currentRoute = () => location.hash.replace(/^#\/?/, '').split('?')[0];
  let routeSeq = 0;
  async function route() {
    const seq = ++routeSeq, name = currentRoute(), r = ROUTES[name] || ROUTES[''];
    if (r.auth && !state.user) { location.hash = '#/login'; return; }
    if (r.guest && state.user) { location.hash = '#/dashboard'; return; }
    clearInterval(state.demoTimer); if (state.rec) { try { state.rec.abort(); } catch (_) { /* ignore */ } state.rec = null; }
    let data;
    if (r.load) {
      $('#view').innerHTML = `<div class="loading">${t('loading')}</div>`;
      try { data = await r.load(); } catch (e) { if (seq !== routeSeq) return; if (e.code === 'auth') { state.user = null; renderHeader(); location.hash = '#/login'; } else { $('#view').innerHTML = `<div class="loading">${esc(errMsg(e.code))}</div>`; } return; }
      if (seq !== routeSeq) return;
    }
    $('#view').innerHTML = r.view(data);
    if (r.mount) r.mount(data);
    document.title = t(r.title) + ' - ' + t('brand_a') + t('brand_b');
    markNav();
    if (!route.first) route.first = true; else window.scrollTo(0, 0);
  }

  async function boot() {
    renderFooter(); $('#skipLink').textContent = t('skip');
    try { const r = await api('/session'); state.user = r.user; } catch (_) { state.user = null; }
    renderHeader();
    window.addEventListener('hashchange', route);
    route();
  }
  boot();
})();
