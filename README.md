# NiveshKavach (निवेश कवच)

**Privacy-first scam shield for Indian investors** - built for the **SANGYAN Hackathon (IIT BHU x SEBI / NSDL)**, **Track A: Digital Fraud & Scam Resilience**.

> Spot the scam before it spots your money.

## Problem
First-time and Tier-2/3 investors receive fake "guaranteed return" offers, paid tips groups, KYC-block threats, look-alike SEBI/bank links and "scan QR to receive money" tricks - mostly in Hindi/Marathi/Hinglish on WhatsApp and SMS. Existing tools are English-heavy and need servers or personal data.

## Solution
Paste or **speak** a suspicious message or link. NiveshKavach:

1. Flags **12 fraud patterns** (guaranteed returns, urgency, OTP/PIN requests, tips groups, KYC threats, upfront fees, fake prizes, secrecy, remote-access apps, QR/PIN tricks, crypto/forex pitches).
2. Checks **links/domains**: shorteners, http, raw IP, risky TLDs, look-alikes of SEBI / NSDL / banks / brokers vs an official-domain list.
3. Shows an animated **0-100 risk gauge** with a plain-language reason for every flag.
4. **Reads the result aloud** and shows next steps: 1930 helpline, cybercrime.gov.in, SEBI SCORES; one-tap WhatsApp warning for family.
5. **Scam-spotting quiz** and a personal **dashboard** (checks, high-risk caught, top red flags, quiz progress).

## Bharat-first
English / हिन्दी / मराठी (full UI + explanations) - voice input & read-aloud (hi-IN, mr-IN, en-IN) - light/dark (black) theme - large-text mode - no heavy assets, no external fonts/CDNs, works on low bandwidth.

## Trust, privacy & guardrails
- Message text is analysed **in the browser and never sent to the server**. Only score, level and rule-ids go into your history.
- No OTP / SMS / contacts access. No stock tips, price predictions, broker promotion or monetisation.
- Always communicates uncertainty: "no red flags" is not "safe".
- Accounts: name, phone, email, password (scrypt-hashed). Users can change password and **delete their account + data** any time.

## Features checklist
- Register (name, phone, email, password) / Login (email, password) with validation + password strength meter
- Profile page: **change / remove profile photo** (client-side square crop, server-side magic-byte validation), edit name/phone, change password, delete account
- Language switch (3 languages), dark/light switch, logo + brand
- Backend: REST API, cookie sessions, rate limits, CSRF header, CSP and security headers, file store

## Run locally (no npm install needed - zero dependencies)
```bash
node server.js          # Node 18+
# open http://localhost:3000
```
Env (optional): `PORT`, `NODE_ENV=production` (secure cookies), `TRUST_PROXY=1` (behind a proxy), `DATA_DIR` (where db.json + uploads live).

## Tests
```bash
npm test                # engine + i18n + full API flow (register, login, avatar, history, delete...)
```

## Deploy (for a live demo link)
GitHub Pages cannot run the backend. Use any Node host: Render / Railway / Fly.io / a VPS.
- Render: New > Web Service > connect repo > Build command: *(empty)* > Start command: `node server.js` > env `NODE_ENV=production`, `TRUST_PROXY=1`. Add a disk mounted at `/data` and set `DATA_DIR=/data` to keep users/photos across restarts.
- Docker: `docker build -t nivesh-kavach . && docker run -p 3000:3000 -v nk-data:/data nivesh-kavach`

## Architecture
```
Browser (SPA, vanilla JS)
  |-- rule engine + link checker (on device) -> score, reasons (hi/en/mr), voice
  |-- fetch /api/*  (only account, profile, score history)
Node server (http, crypto, fs)  ->  data/db.json + data/uploads/
```
Folders: `server.js` API + static, `db.js` store, `public/` SPA (`js/engine.js` scam engine, `js/i18n.js`, `js/data.js`, `js/app.js`), `test/`.

## Scalability roadmap
More languages (Tamil, Bengali, Telugu...) via the same i18n table - on-device ML classifier trained on community-reported scams - PWA + share-sheet ("Share to NiveshKavach" from WhatsApp) - swap `db.js` for PostgreSQL/SQLite - verified, updatable official-domain list with regulators.

## Limitations
Heuristic detection: can miss new scams and can false-flag. It is an awareness tool, not financial advice.

## License
MIT
