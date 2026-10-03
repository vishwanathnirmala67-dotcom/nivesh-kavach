'use strict';
// End-to-end API test. Uses a temp data dir, so your real data is untouched.  Run: node test/api.test.js
const os = require('os'), fs = require('fs'), path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'nk-test-'));
const server = require('../server.js');

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('OK  ', m); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = async (method, p, body, extra = {}) => {
    const headers = { 'X-Requested-With': 'nk', ...(extra.headers || {}) };
    if (cookie) headers.Cookie = cookie;
    let payload = extra.raw;
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + p, { method, headers, body: payload });
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].startsWith('sid=') && sc.includes('Max-Age=0') ? '' : sc.split(';')[0];
    let data = {}; try { data = await res.json(); } catch (_) { /* not json */ }
    return { status: res.status, data, res };
  };
  const u = { name: 'Vishwanath Gupta', phone: '9876543210', email: 'Vish@Example.com', password: 'Strong123' };

  let r = await call('POST', '/api/register', { ...u, name: 'X' });
  ok(r.status === 400 && r.data.error === 'invalid_name', 'register rejects bad name');
  r = await call('POST', '/api/register', { ...u, phone: '12345' });
  ok(r.data.error === 'invalid_phone', 'register rejects bad phone');
  r = await call('POST', '/api/register', { ...u, email: 'nope' });
  ok(r.data.error === 'invalid_email', 'register rejects bad email');
  r = await call('POST', '/api/register', { ...u, password: 'short' });
  ok(r.data.error === 'invalid_password', 'register rejects weak password');
  r = await call('POST', '/api/register', u);
  ok(r.status === 201 && r.data.user.email === 'vish@example.com' && !r.data.user.hash, 'register ok (email normalised, no hash leaked)');
  r = await call('POST', '/api/register', { ...u, phone: '9876543211' });
  ok(r.status === 409 && r.data.error === 'exists_email', 'duplicate email blocked');
  r = await call('POST', '/api/register', { ...u, email: 'other@example.com' });
  ok(r.status === 409 && r.data.error === 'exists_phone', 'duplicate phone blocked');
  r = await call('GET', '/api/me');
  ok(r.status === 200 && r.data.user.name === u.name, 'session cookie works (/me)');
  await call('POST', '/api/logout', {});
  r = await call('GET', '/api/me');
  ok(r.status === 401, 'logout clears session');
  r = await call('POST', '/api/login', { email: u.email, password: 'Wrong123' });
  ok(r.status === 401 && r.data.error === 'creds', 'wrong password rejected');
  r = await call('POST', '/api/login', { email: u.email, password: u.password });
  ok(r.status === 200, 'login ok');

  const noHdr = await fetch(base + '/api/logout', { method: 'POST' });
  ok(noHdr.status === 403, 'CSRF header required on POST');

  r = await call('PUT', '/api/me', { name: 'Vishwanath G', phone: '9123456789' });
  ok(r.status === 200 && r.data.user.name === 'Vishwanath G', 'profile update');

  // avatar upload (tiny valid PNG signature + padding)
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
  const mp = (name, buf) => {
    const b = '----nkboundary';
    const body = Buffer.concat([Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="avatar"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`), buf, Buffer.from(`\r\n--${b}--\r\n`)]);
    return { raw: body, headers: { 'Content-Type': `multipart/form-data; boundary=${b}` } };
  };
  const send = async (m) => { const h = { 'X-Requested-With': 'nk', Cookie: cookie, ...m.headers }; const res = await fetch(base + '/api/me/avatar', { method: 'POST', headers: h, body: m.raw }); return { status: res.status, data: await res.json() }; };
  r = await send(mp('a.png', png));
  ok(r.status === 200 && /^\/uploads\/.+\.png/.test(r.data.user.avatar), 'avatar upload ok');
  const img = await fetch(base + r.data.user.avatar);
  ok(img.status === 200 && img.headers.get('content-type') === 'image/png', 'avatar is served');
  r = await send(mp('evil.png', Buffer.from('<script>alert(1)</script>-------------')));
  ok(r.status === 400 && r.data.error === 'file_type', 'non-image rejected by magic bytes');
  r = await send(mp('big.png', Buffer.concat([png, Buffer.alloc(2.2 * 1024 * 1024, 2)])));
  ok((r.status === 400 || r.status === 413) && r.data.error === 'file_big', 'oversized image rejected');
  r = await call('DELETE', '/api/me/avatar');
  ok(r.status === 200 && r.data.user.avatar === null, 'avatar removed');

  r = await call('POST', '/api/history', { score: 100, level: 'high', flags: ['guar', 'l_fake'] });
  ok(r.status === 201, 'history saved');
  r = await call('POST', '/api/history', { score: 1000, level: 'high', flags: [] });
  ok(r.status === 400, 'history validates score');
  r = await call('POST', '/api/history', { score: 5, level: 'low', flags: ['<script>'] });
  ok(r.status === 400, 'history rejects odd flag ids');
  r = await call('POST', '/api/quiz', { score: 4, total: 5 });
  ok(r.status === 200 && r.data.quiz.best === 80, 'quiz score saved');
  r = await call('GET', '/api/stats');
  ok(r.data.checks === 1 && r.data.levels.high === 1 && r.data.top.length === 2 && r.data.quiz.attempts === 1, 'stats aggregate');

  r = await call('POST', '/api/me/password', { current: 'Nope1234', next: 'NewPass123' });
  ok(r.status === 400 && r.data.error === 'wrong_password', 'password change needs current password');
  r = await call('POST', '/api/me/password', { current: u.password, next: 'NewPass123' });
  ok(r.status === 200, 'password changed');
  await call('POST', '/api/logout', {});
  r = await call('POST', '/api/login', { email: u.email, password: 'NewPass123' });
  ok(r.status === 200, 'login with new password');

  r = await call('POST', '/api/me/delete', { password: 'bad' });
  ok(r.status === 400, 'delete needs correct password');
  r = await call('POST', '/api/me/delete', { password: 'NewPass123' });
  ok(r.status === 200, 'account deleted');
  r = await call('GET', '/api/me');
  ok(r.status === 401, 'session gone after delete');

  const page = await fetch(base + '/');
  ok(page.status === 200 && /NiveshKavach/.test(await page.text()) && /default-src 'self'/.test(page.headers.get('content-security-policy')), 'index served with CSP');
  const trav = await fetch(base + '/..%2fserver.js');
  ok(trav.status === 404 || trav.status === 400, 'path traversal blocked');
  const dot = await fetch(base + '/uploads/../db.json');
  ok(dot.status !== 200 || !(await dot.text()).includes('users'), 'db file not exposed');

  // login rate limit
  let limited = false;
  for (let i = 0; i < 14; i++) { const x = await call('POST', '/api/login', { email: 'brute@example.com', password: 'x' + i }); if (x.status === 429) limited = true; }
  ok(limited, 'login brute-force is rate limited');

  server.close();
  setTimeout(() => process.exit(fail ? 1 : 0), 300);
})().catch(e => { console.error(e); process.exit(1); });
