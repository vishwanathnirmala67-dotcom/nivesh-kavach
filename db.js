'use strict';
// Tiny zero-dependency JSON file store (atomic writes). Perfect for a hackathon demo.
// To scale: swap this module for SQLite / PostgreSQL / MongoDB - server.js only uses db.state + db.save().
const fs = require('fs');
const path = require('path');

let DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
try { fs.mkdirSync(DIR, { recursive: true }); fs.accessSync(DIR, fs.constants.W_OK); } catch (_) {
  // e.g. hosts where the chosen folder is read-only: fall back to a writable temp folder
  DIR = path.join(require('os').tmpdir(), 'nk-data');
  fs.mkdirSync(DIR, { recursive: true });
  console.warn('[db] data dir not writable, using', DIR);
}
const FILE = path.join(DIR, 'db.json');

let state = { users: [], sessions: {} };
try {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  state.users = Array.isArray(raw.users) ? raw.users : [];
  state.sessions = raw.sessions && typeof raw.sessions === 'object' ? raw.sessions : {};
} catch (_) { /* first run */ }

let timer = null;
function flush() {
  clearTimeout(timer);
  timer = null;
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, FILE);
}
function save() {
  if (timer) return;
  timer = setTimeout(flush, 150);
}

process.on('exit', () => { try { flush(); } catch (_) {} });
['SIGINT', 'SIGTERM'].forEach(s => process.on(s, () => process.exit(0)));

module.exports = { state, save, flush, DIR };
