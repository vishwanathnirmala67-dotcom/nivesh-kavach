'use strict';
/*
 * NiveshKavach backend - zero dependencies (Node 18+ built-ins only).
 *  - cookie sessions (random token, only its SHA-256 is stored), scrypt password hashing
 *  - JSON file database (see db.js), avatar upload with magic-byte validation
 *  - rate limits, CSRF header check, strict security headers
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const PROD = process.env.NODE_ENV === 'production';
const TRUST_PROXY = !!process.env.TRUST_PROXY;
const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = path.join(db.DIR, 'uploads');
const SESSION_MS = 7 * 24 * 3600 * 1000;
const MAX_AVATAR = 2 * 1024 * 1024;
fs.mkdirSync(UPLOADS, { recursive: true });

/* ---------- small helpers ---------- */
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw.normalize('NFKC'), salt, 64, (e, k) => (e ? rej(e) : res(k))));
async function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + (await scrypt(pw, salt)).toString('hex');
}
async function checkPw(pw, stored) {
  const [s, h] = String(stored).split(':');
  const k = await scrypt(pw, Buffer.from(s, 'hex'));
  const hb = Buffer.from(h, 'hex');
  return hb.length === k.length && crypto.timingSafeEqual(hb, k);
}
const DUMMY_HASH = (() => { const s = Buffer.alloc(16, 1); return s.toString('hex') + ':' + crypto.scryptSync('dummy-password-1', s, 64).toString('hex'); })();

function send(res, status, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(b), 'Cache-Control': 'no-store' });
  res.end(b);
}
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0, big = false;
    req.on('data', c => { n += c.length; if (n > max) { big = true; chunks.length = 0; } else if (!big) chunks.push(c); });
    req.on('end', () => (big ? reject(Object.assign(new Error('big'), { code: 'TOO_BIG' })) : resolve(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (_) { /* ignore */ } }
  });
  return out;
}
const cookieAttrs = () => `HttpOnly; SameSite=Lax; Path=/${PROD ? '; Secure' : ''}`;
function startSession(res, uid) {
  const token = crypto.randomBytes(32).toString('hex');
  db.state.sessions[sha(token)] = { uid, exp: Date.now() + SESSION_MS };
  db.save();
  res.setHeader('Set-Cookie', `sid=${token}; ${cookieAttrs()}; Max-Age=${SESSION_MS / 1000}`);
}
const endCookie = res => res.setHeader('Set-Cookie', `sid=; ${cookieAttrs()}; Max-Age=0`);
function authUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  const key = sha(sid);
  const s = db.state.sessions[key];
  if (!s || s.exp < Date.now()) return null;
  const user = db.state.users.find(u => u.id === s.uid);
  return user ? { user, key } : null;
}
const clientIp = req => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';

/* ---------- rate limiting ---------- */
const hits = new Map();
function rl(name, max, ms, keyFn) {
  return ctx => {
    const key = name + ':' + (keyFn ? keyFn(ctx) : ctx.ip);
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) { h = { n: 0, reset: now + ms }; hits.set(key, h); }
    if (++h.n > max) { ctx.res.setHeader('Retry-After', Math.ceil((h.reset - now) / 1000)); return false; }
    return true;
  };
}
setInterval(() => {
  const n = Date.now();
  for (const [k, v] of hits) if (v.reset < n) hits.delete(k);
  for (const [k, s] of Object.entries(db.state.sessions)) if (s.exp < n) delete db.state.sessions[k];
}, 60 * 1000).unref();

/* ---------- validation ---------- */
const cleanName = v => {
  const s = String(v || '').replace(/\s+/g, ' ').trim();
  return /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,59}$/u.test(s) ? s : null;
};
const cleanEmail = v => {
  const s = String(v || '').trim().toLowerCase();
  return s.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
};
const cleanPhone = v => {
  let d = String(v || '').replace(/[\s\-()]/g, '');
  if (d.startsWith('+91')) d = d.slice(3);
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
};
const okPassword = v => typeof v === 'string' && v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v);
const bad = (res, field) => send(res, 400, { error: 'invalid_' + field, field });
const pub = u => ({
  id: u.id, name: u.name, phone: u.phone, email: u.email, createdAt: u.createdAt,
  avatar: u.avatar ? `/uploads/${u.avatar}?v=${u.avatarV || 0}` : null
});

/* ---------- avatar helpers ---------- */
function sniff(buf) {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  }
  return null;
}
function multipartFile(buf, ctype, field) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype || '');
  if (!m) return null;
  const boundary = Buffer.from('--' + (m[1] || m[2]).trim());
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    const start = pos + boundary.length;
    if (buf.slice(start, start + 2).toString() === '--') break;
    const hdrEnd = buf.indexOf('\r\n\r\n', start);
    if (hdrEnd === -1) break;
    const next = buf.indexOf(boundary, hdrEnd + 4);
    if (next === -1) break;
    if (new RegExp(`name="${field}"`, 'i').test(buf.slice(start, hdrEnd).toString('latin1'))) return buf.slice(hdrEnd + 4, next - 2);
    pos = next;
  }
  return null;
}
function dropAvatar(u) {
  if (u.avatar) { fs.unlink(path.join(UPLOADS, path.basename(u.avatar)), () => {}); u.avatar = null; }
}

/* ---------- API routes ---------- */
const ROUTES = {};
const route = (method, p, opts, fn) => { ROUTES[method + ' ' + p] = { ...opts, fn }; };
const LEVELS = ['low', 'mid', 'high'];

route('POST', '/api/register', { limit: rl('register', 15, 3600e3) }, async ({ res, body }) => {
  const name = cleanName(body.name), phone = cleanPhone(body.phone), email = cleanEmail(body.email);
  if (!name) return bad(res, 'name');
  if (!phone) return bad(res, 'phone');
  if (!email) return bad(res, 'email');
  if (!okPassword(body.password)) return bad(res, 'password');
  const clash = () => {
    if (db.state.users.some(u => u.email === email)) { send(res, 409, { error: 'exists_email', field: 'email' }); return true; }
    if (db.state.users.some(u => u.phone === phone)) { send(res, 409, { error: 'exists_phone', field: 'phone' }); return true; }
    return false;
  };
  if (clash()) return;
  const hash = await hashPw(body.password);
  if (clash()) return;
  const user = { id: crypto.randomUUID(), name, phone, email, hash, avatar: null, avatarV: 0, createdAt: Date.now(), history: [], quiz: { best: 0, attempts: 0, last: null } };
  db.state.users.push(user);
  db.save();
  startSession(res, user.id);
  send(res, 201, { user: pub(user) });
});

route('POST', '/api/login', { limit: rl('login', 10, 15 * 60e3, c => c.ip + ':' + String(c.body.email || '').toLowerCase().slice(0, 120)) }, async ({ res, body }) => {
  const email = cleanEmail(body.email);
  const user = email ? db.state.users.find(u => u.email === email) : null;
  const ok = await checkPw(String(body.password || '').slice(0, 72), user ? user.hash : DUMMY_HASH);
  if (!user || !ok) return send(res, 401, { error: 'creds' });
  startSession(res, user.id);
  send(res, 200, { user: pub(user) });
});

route('POST', '/api/logout', {}, ({ req, res }) => {
  const sid = parseCookies(req).sid;
  if (sid) { delete db.state.sessions[sha(sid)]; db.save(); }
  endCookie(res);
  send(res, 200, { ok: true });
});

// used on page load: 200 with user:null when logged out (keeps the browser console clean)
route('GET', '/api/session', {}, ({ req, res }) => { const a = authUser(req); send(res, 200, { user: a ? pub(a.user) : null }); });

route('GET', '/api/me', { auth: true }, ({ res, user }) => send(res, 200, { user: pub(user) }));

route('PUT', '/api/me', { auth: true }, ({ res, user, body }) => {
  const name = cleanName(body.name), phone = cleanPhone(body.phone);
  if (!name) return bad(res, 'name');
  if (!phone) return bad(res, 'phone');
  if (db.state.users.some(u => u.id !== user.id && u.phone === phone)) return send(res, 409, { error: 'exists_phone', field: 'phone' });
  user.name = name; user.phone = phone;
  db.save();
  send(res, 200, { user: pub(user) });
});

route('POST', '/api/me/password', { auth: true, limit: rl('pw', 10, 15 * 60e3) }, async ({ res, user, body, sessionKey }) => {
  if (!(await checkPw(String(body.current || '').slice(0, 72), user.hash))) return send(res, 400, { error: 'wrong_password', field: 'current' });
  if (!okPassword(body.next)) return bad(res, 'password');
  user.hash = await hashPw(body.next);
  for (const [k, s] of Object.entries(db.state.sessions)) if (s.uid === user.id && k !== sessionKey) delete db.state.sessions[k];
  db.save();
  send(res, 200, { ok: true });
});

route('POST', '/api/me/avatar', { auth: true, raw: MAX_AVATAR + 64 * 1024, limit: rl('avatar', 20, 3600e3) }, ({ req, res, user, raw }) => {
  const file = multipartFile(raw, req.headers['content-type'], 'avatar');
  if (!file || !file.length) return send(res, 400, { error: 'file_type' });
  if (file.length > MAX_AVATAR) return send(res, 400, { error: 'file_big' });
  const ext = sniff(file);
  if (!ext) return send(res, 400, { error: 'file_type' });
  const name = `${user.id}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS, name), file);
  dropAvatar(user);
  user.avatar = name;
  user.avatarV = Date.now();
  db.save();
  send(res, 200, { user: pub(user) });
});

route('DELETE', '/api/me/avatar', { auth: true }, ({ res, user }) => {
  dropAvatar(user);
  db.save();
  send(res, 200, { user: pub(user) });
});

route('POST', '/api/me/delete', { auth: true, limit: rl('del', 5, 3600e3) }, async ({ res, user, body }) => {
  if (!(await checkPw(String(body.password || '').slice(0, 72), user.hash))) return send(res, 400, { error: 'wrong_password', field: 'password' });
  dropAvatar(user);
  for (const [k, s] of Object.entries(db.state.sessions)) if (s.uid === user.id) delete db.state.sessions[k];
  db.state.users = db.state.users.filter(u => u.id !== user.id);
  db.save();
  endCookie(res);
  send(res, 200, { ok: true });
});

// PRIVACY: message text is analysed in the browser and NEVER sent here - only score, level and rule ids.
route('POST', '/api/history', { auth: true, limit: rl('hist', 60, 60e3) }, ({ res, user, body }) => {
  const { score, level, flags } = body;
  if (!Number.isInteger(score) || score < 0 || score > 100 || !LEVELS.includes(level) || !Array.isArray(flags) || flags.length > 30 ||
      !flags.every(f => typeof f === 'string' && /^[a-z_]{1,20}$/.test(f))) return send(res, 400, { error: 'invalid_input' });
  user.history.unshift({ t: Date.now(), score, level, flags });
  user.history.length = Math.min(user.history.length, 200);
  db.save();
  send(res, 201, { ok: true });
});

route('POST', '/api/quiz', { auth: true, limit: rl('quiz', 60, 60e3) }, ({ res, user, body }) => {
  const { score, total } = body;
  if (!Number.isInteger(total) || total < 1 || total > 20 || !Number.isInteger(score) || score < 0 || score > total) return send(res, 400, { error: 'invalid_input' });
  const q = user.quiz;
  q.best = Math.max(q.best, Math.round((score / total) * 100));
  q.attempts += 1;
  q.last = { score, total, t: Date.now() };
  db.save();
  send(res, 200, { quiz: q });
});

route('GET', '/api/stats', { auth: true }, ({ res, user }) => {
  const h = user.history, levels = { low: 0, mid: 0, high: 0 }, count = {};
  h.forEach(x => { levels[x.level]++; x.flags.forEach(f => { count[f] = (count[f] || 0) + 1; }); });
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ id, n }));
  send(res, 200, { user: pub(user), checks: h.length, levels, top, recent: h.slice(0, 8), quiz: user.quiz });
});

/* Owner-only overview. Disabled unless ADMIN_KEY is set. Shows name, email and counts only (never phone, password or messages). */
route('GET', '/api/admin/users', { limit: rl('admin', 20, 15 * 60e3) }, ({ req, res }) => {
  const key = process.env.ADMIN_KEY;
  if (!key) return send(res, 404, { error: 'not_found' });
  const given = String(req.headers['x-admin-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(key).digest();
  if (!crypto.timingSafeEqual(a, b)) return send(res, 401, { error: 'bad_key' });
  const day = Date.now() - 24 * 3600e3;
  const users = db.state.users.map(u => ({ name: u.name, email: u.email, joined: u.createdAt, checks: u.history.length, lastCheck: u.history[0] ? u.history[0].t : null, quizBest: u.quiz.best }))
    .sort((x, y) => y.joined - x.joined);
  send(res, 200, { total: users.length, newToday: users.filter(u => u.joined > day).length, totalChecks: users.reduce((n, u) => n + u.checks, 0), users });
});

route('GET', '/api/health', {}, ({ res }) => send(res, 200, { ok: true, users: db.state.users.length }));

async function handleApi(req, res, pathname) {
  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'nk') return send(res, 403, { error: 'forbidden' });
  const h = ROUTES[req.method + ' ' + pathname];
  if (!h) return send(res, 404, { error: 'not_found' });
  const ctx = { req, res, ip: clientIp(req), body: {} };
  if (h.auth) {
    const a = authUser(req);
    if (!a) return send(res, 401, { error: 'auth' });
    ctx.user = a.user; ctx.sessionKey = a.key;
  }
  try {
    if (h.raw) {
      if (Number(req.headers['content-length'] || 0) > h.raw) { req.resume(); return send(res, 413, { error: 'file_big' }); }
      ctx.raw = await readBody(req, h.raw);
    } else if (req.method !== 'GET') {
      const buf = await readBody(req, 20 * 1024);
      if (buf.length) { try { ctx.body = JSON.parse(buf.toString('utf8')) || {}; } catch (_) { return send(res, 400, { error: 'invalid_input' }); } }
      if (typeof ctx.body !== 'object' || Array.isArray(ctx.body)) ctx.body = {};
    }
    if (h.limit && !h.limit(ctx)) return send(res, 429, { error: 'rate' });
    await h.fn(ctx);
  } catch (e) {
    if (e && e.code === 'TOO_BIG') return send(res, 413, { error: h.raw ? 'file_big' : 'invalid_input' });
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'generic' });
  }
}

/* ---------- static files ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json'
};
function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (_) { res.writeHead(400); return res.end('Bad request'); }
  let base = PUBLIC, cache = PROD ? 'public, max-age=3600' : 'no-cache';
  const ROOT_PAGES = { '/admin': '/admin.html', '/admin.html': '/admin.html', '/admin.js': '/admin.js' };
  if (ROOT_PAGES[rel]) { base = __dirname; rel = ROOT_PAGES[rel]; cache = 'no-store'; }
  else if (rel.startsWith('/uploads/')) { base = UPLOADS; rel = rel.slice(8); cache = 'public, max-age=3600'; }
  else if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) || path.basename(file).startsWith('.')) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}

/* ---------- server ---------- */
const server = http.createServer((req, res) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()');
  let pathname;
  try { pathname = new URL(req.url, 'http://x').pathname; } catch (_) { res.writeHead(400); return res.end('Bad request'); }
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end('Method not allowed'); }
  serveStatic(req, res, pathname);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`NiveshKavach running on http://localhost:${PORT}`));
}
module.exports = server;
