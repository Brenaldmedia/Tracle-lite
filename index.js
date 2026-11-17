/*
 * Tracle-Lite launcher
 * Works on Pterodactyl, any VPS, Render, Railway, Heroku, Koyeb, Replit, Docker or a local PC.
 *
 * Order used to find a WhatsApp login:
 *   1. A linked session already saved in ./sessions
 *   2. SESSION_ID (from .env or the host's environment variables)
 *   3. PHONE_NUMBER (a pairing code is printed in the logs)
 *   4. The console asks: "Enter your WhatsApp number or session ID"
 * With none of these and no console, it prints the steps and keeps waiting (no crash loop).
 *
 * The bot itself is downloaded on start from the Tracle-Lite server (checked with SHA-256),
 * kept in .tracle/<version>, and updated automatically on restart when a new version is out.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const readline = require('readline');
const { spawn, spawnSync } = require('child_process');
const { createRequire } = require('module');

function loadEnvFile(override) {
    let text = '';
    try { text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8'); } catch (e) { return; }
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const i = line.indexOf('=');
        if (i < 1) continue;
        const key = line.slice(0, i).trim();
        let val = line.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        if (override || process.env[key] === undefined || process.env[key] === '') process.env[key] = val;
    }
}
loadEnvFile(false);

const ROOT = __dirname;
const SESS = path.join(ROOT, 'sessions');
const DEAD_FILE = path.join(SESS, '.logged-out.json');
const PAIR_TTL_MS = 3 * 60 * 1000;
const GEN_URL = (process.env.SESSION_GENERATOR_URL || 'https://tracle-sessions.brenaldmedia.com').replace(/\/$/, '');
const SID_PREFIX = 'TRACLE~';
const PORT = process.env.PORT || process.env.SERVER_PORT || '';
const CACHE = path.join(ROOT, '.tracle');
const DATA_DIR = path.join(CACHE, 'data');
const SHARED_DIR = path.join(CACHE, 'shared');
const MANIFEST_URL = process.env.TRACLE_MANIFEST_URL || 'https://tracle-lite.brenaldmedia.com/dist/manifest.json';
const IS_WIN = process.platform === 'win32';
let BUNDLE = null; // folder of the running bot version

const C = { o: '\x1b[38;5;208m', g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[31m', b: '\x1b[1m', x: '\x1b[0m' };
const log = (...a) => console.log('[Tracle-Lite]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const digits = (s) => String(s || '').replace(/\D/g, '');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 24);

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function readJson(f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return dflt; } }

// ---------------------------------------------------------------- session helpers
function credsLinked(creds) {
    if (!creds || typeof creds !== 'object') return false;
    const me = creds.me || {};
    // requestPairingCode() writes a placeholder "me" before the phone confirms.
    // A real link always stores the signed device identity (creds.account).
    return !!(me.id && creds.account);
}

function linkedSessions() {
    if (!fs.existsSync(SESS)) return [];
    return fs.readdirSync(SESS).filter((name) => {
        if (!/^\d+$/.test(name)) return false;
        const dir = path.join(SESS, name);
        try { if (!fs.statSync(dir).isDirectory()) return false; } catch (e) { return false; }
        return credsLinked(readJson(path.join(dir, 'creds.json'), null));
    });
}

// Older versions saved logins as sessions/Tracle_xxxx. The bot now uses sessions/<number>.
function migrateOldFolders() {
    if (!fs.existsSync(SESS)) return;
    for (const name of fs.readdirSync(SESS)) {
        if (/^\d+$/.test(name) || name.startsWith('.')) continue;
        const dir = path.join(SESS, name);
        const creds = readJson(path.join(dir, 'creds.json'), null);
        if (!credsLinked(creds)) continue;
        const num = digits(String(creds.me.id).split(':')[0].split('@')[0]);
        const target = path.join(SESS, num);
        if (num && !fs.existsSync(target)) {
            try { fs.renameSync(dir, target); log('Moved saved login ' + name + ' to ' + num); } catch (e) {}
        }
    }
}

function wipe(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }

function deadList() { return readJson(DEAD_FILE, []); }
function markDead(value) {
    if (!value) return;
    ensureDir(SESS);
    const list = deadList();
    const h = sha(value);
    if (!list.includes(h)) list.push(h);
    fs.writeFileSync(DEAD_FILE, JSON.stringify(list));
}
function isDead(value) { return !!value && deadList().includes(sha(value)); }

function decodeEmbedded(raw) {
    // TRACLE~<base64 of creds.json>  (prefix optional, any case, ~ : _ - accepted)
    let s = String(raw || '').trim().replace(/^tracle[~:_-]?/i, '');
    if (s.length < 200) return null;
    try {
        const json = JSON.parse(Buffer.from(s, 'base64').toString('utf8'));
        if (json && json.noiseKey && json.signedIdentityKey) return json;
    } catch (e) {}
    return null;
}

function encodeSessionId(dir) {
    const creds = fs.readFileSync(path.join(dir, 'creds.json'));
    return SID_PREFIX + creds.toString('base64');
}

function httpsGet(url) {
    return new Promise((resolve) => {
        const req = https.get(url, { timeout: 20000 }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: Buffer.concat(chunks) }));
        });
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, body: Buffer.alloc(0) }); });
        req.on('error', () => resolve({ ok: false, status: 0, body: Buffer.alloc(0) }));
    });
}

// Restores one session ID into ./sessions. Returns the folder name or null.
async function restoreSessionId(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;

    const creds = decodeEmbedded(value);
    if (creds) {
        if (!credsLinked(creds)) { log(C.r + 'This session ID is not linked to WhatsApp yet.' + C.x); return null; }
        const name = digits(String(creds.me.id).split(':')[0].split('@')[0]);
        const dir = path.join(SESS, name);
        if (!credsLinked(readJson(path.join(dir, 'creds.json'), null))) {
            wipe(dir); ensureDir(dir);
            creds.registered = true;
            fs.writeFileSync(path.join(dir, 'creds.json'), JSON.stringify(creds));
        }
        log(C.g + 'Session ID restored.' + C.x);
        return name;
    }

    if (/^Tracle_[A-Za-z0-9]+$/i.test(value)) {
        log('Downloading session ' + value + ' ...');
        const res = await httpsGet(`${GEN_URL}/sessions/${encodeURIComponent(value)}/creds.json`);
        if (res.ok) {
            let c = null;
            try { c = JSON.parse(res.body.toString('utf8')); } catch (e) {}
            if (c && credsLinked(c)) {
                const name = digits(String(c.me.id).split(':')[0].split('@')[0]);
                const dir = path.join(SESS, name);
                if (!credsLinked(readJson(path.join(dir, 'creds.json'), null))) {
                    wipe(dir); ensureDir(dir);
                    c.registered = true;
                    fs.writeFileSync(path.join(dir, 'creds.json'), JSON.stringify(c));
                }
                log(C.g + 'Session downloaded.' + C.x);
                return name;
            }
        }
        log(C.r + 'Session ID not found or not linked (HTTP ' + res.status + ').' + C.x);
        return null;
    }

    log(C.r + 'That does not look like a Tracle-Lite session ID.' + C.x);
    return null;
}


// ---------------------------------------------------------------- bot download and updates
function fetchUrl(url, asFile, redirects = 0) {
    return new Promise((resolve) => {
        const mod = url.startsWith('http://') ? http : https;
        const req = mod.get(url, { timeout: 30000, headers: { 'User-Agent': 'Tracle-Lite-launcher' } }, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
                res.resume();
                return resolve(fetchUrl(new URL(res.headers.location, url).toString(), asFile, redirects + 1));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); return resolve({ ok: false, status: res.statusCode }); }
            if (asFile) {
                const out = fs.createWriteStream(asFile);
                const hash = crypto.createHash('sha256');
                res.on('data', (c) => hash.update(c));
                res.pipe(out);
                out.on('finish', () => resolve({ ok: true, status: 200, sha256: hash.digest('hex') }));
                out.on('error', () => resolve({ ok: false, status: 0 }));
            } else {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve({ ok: true, status: 200, body: Buffer.concat(chunks) }));
            }
        });
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
        req.on('error', () => resolve({ ok: false, status: 0 }));
    });
}

function readCurrent() { return readJson(path.join(CACHE, 'current.json'), null); }
function bundleReady(dir) {
    return !!dir && fs.existsSync(path.join(dir, 'server.js')) && fs.existsSync(path.join(dir, 'node_modules', '@whiskeysockets', 'baileys'));
}

function npmInstall(dir) {
    log('Installing bot packages (first start of a version can take a few minutes)...');
    const r = spawnSync(IS_WIN ? 'npm.cmd' : 'npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error'],
        { cwd: dir, stdio: 'inherit', shell: IS_WIN, env: { ...process.env, npm_config_update_notifier: 'false' } });
    return r.status === 0;
}

function cleanupOld(keep) {
    try {
        for (const name of fs.readdirSync(CACHE)) {
            if (!/^v[\w.-]+$/.test(name) || keep.includes(name)) continue;
            wipe(path.join(CACHE, name));
        }
    } catch (e) {}
}

async function installVersion(man) {
    const ver = 'v' + String(man.version).replace(/[^\w.-]/g, '');
    const dir = path.join(CACHE, ver);
    if (bundleReady(dir)) return dir;
    const tmpFile = path.join(CACHE, 'download.tgz');
    const tmpDir = dir + '.tmp';
    log('Downloading Tracle-Lite ' + man.version + ' ...');
    const dl = await fetchUrl(new URL(man.url, MANIFEST_URL).toString(), tmpFile);
    if (!dl.ok) { log(C.r + 'Download failed (HTTP ' + dl.status + ').' + C.x); return null; }
    if (String(man.sha256 || '').toLowerCase() !== dl.sha256) {
        log(C.r + 'Download check failed (SHA-256 mismatch). Not using it.' + C.x);
        wipe(tmpFile); return null;
    }
    wipe(tmpDir); ensureDir(tmpDir);
    const t = spawnSync('tar', ['-xzf', tmpFile, '-C', tmpDir], { stdio: 'inherit' });
    wipe(tmpFile);
    if (t.status !== 0 || !fs.existsSync(path.join(tmpDir, 'server.js'))) {
        log(C.r + 'Could not unpack the download (is "tar" installed?).' + C.x);
        wipe(tmpDir); return null;
    }
    if (!npmInstall(tmpDir)) { log(C.r + 'Package install failed.' + C.x); wipe(tmpDir); return null; }
    wipe(dir);
    fs.renameSync(tmpDir, dir);
    log(C.g + 'Tracle-Lite ' + man.version + ' is ready.' + C.x);
    return dir;
}

// Returns the folder of the bot to run. Keeps trying until one is available.
async function ensureBundle() {
    ensureDir(CACHE);
    for (;;) {
        phase = 'downloading';
        const cur = readCurrent();
        const curDir = cur && path.join(CACHE, cur.dir);
        const res = await fetchUrl(MANIFEST_URL);
        let man = null;
        if (res.ok) { try { man = JSON.parse(res.body.toString('utf8')); } catch (e) {} }
        if (man && man.version && man.url && man.sha256) {
            if (cur && cur.version === man.version && bundleReady(curDir)) return curDir;
            const dir = await installVersion(man);
            if (dir) {
                fs.writeFileSync(path.join(CACHE, 'current.json'), JSON.stringify({ version: man.version, dir: path.basename(dir) }));
                cleanupOld([path.basename(dir), cur && cur.dir].filter(Boolean));
                return dir;
            }
            if (bundleReady(curDir)) { log(C.y + 'Update failed. Using the saved version ' + cur.version + '.' + C.x); return curDir; }
        } else if (bundleReady(curDir)) {
            log(C.y + 'Update server not reachable. Using the saved version ' + cur.version + '.' + C.x);
            return curDir;
        }
        log(C.y + 'Could not get the bot from ' + new URL(MANIFEST_URL).host + '. Check the internet connection. Trying again in 30 seconds...' + C.x);
        await sleep(30000);
    }
}

// Logins and settings live outside the version folder, so updates keep them.
function linkPersistent(dir) {
    ensureDir(SESS); ensureDir(DATA_DIR); ensureDir(SHARED_DIR);
    const pairs = [[path.join(dir, 'sessions'), SESS], [path.join(dir, 'data'), DATA_DIR]];
    for (const [link, target] of pairs) {
        let st = null;
        try { st = fs.lstatSync(link); } catch (e) {}
        if (st && st.isSymbolicLink()) continue;
        if (st && st.isDirectory()) {
            // seed defaults (only files the user does not have yet)
            for (const f of fs.readdirSync(link)) {
                const to = path.join(target, f);
                if (!fs.existsSync(to)) { try { fs.renameSync(path.join(link, f), to); } catch (e) {} }
            }
            wipe(link);
        }
        fs.symlinkSync(target, link, IS_WIN ? 'junction' : 'dir');
    }
}

function botRequire() { return createRequire(path.join(BUNDLE, 'package.json')); }

// ---------------------------------------------------------------- health server (only while setting up)
let healthServer = null;
let phase = 'starting';
function startHealth() {
    if (!PORT || healthServer) return;
    healthServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, app: 'Tracle-Lite', status: phase }));
    });
    healthServer.on('error', (e) => { log('Health server error:', e.message); healthServer = null; });
    healthServer.listen(PORT, () => log('Health check on port ' + PORT));
}
function stopHealth() {
    return new Promise((resolve) => {
        if (!healthServer) return resolve();
        const s = healthServer; healthServer = null;
        s.close(() => resolve());
        setTimeout(resolve, 3000);
    });
}

// ---------------------------------------------------------------- console input (Pterodactyl, VPS, PC)
let rl = null;
let stdinClosed = false;
const lineWaiters = [];
const pendingLines = [];
function setupStdin() {
    if (rl) return;
    try {
        rl = readline.createInterface({ input: process.stdin, terminal: false });
        rl.on('line', (line) => { const w = lineWaiters.shift(); if (w) w(line.trim()); else pendingLines.push(line.trim()); });
        rl.on('close', () => { stdinClosed = true; while (lineWaiters.length) lineWaiters.shift()(null); });
    } catch (e) { stdinClosed = true; }
}
function askLine(question) {
    setupStdin();
    process.stdout.write(question);
    if (pendingLines.length) return Promise.resolve(pendingLines.shift());
    if (stdinClosed) return Promise.resolve(null);
    return new Promise((resolve) => lineWaiters.push(resolve));
}

// ---------------------------------------------------------------- pairing with a number
function printCode(code, phone) {
    const pretty = String(code).length === 8 ? code.slice(0, 4) + '-' + code.slice(4) : code;
    console.log('\n' + C.o + '══════════════════════════════════════════' + C.x);
    console.log(C.b + '   Tracle-Lite pairing code for +' + phone + C.x);
    console.log('\n          ' + C.b + C.o + pretty + C.x + '\n');
    console.log('   1. Open WhatsApp on your phone');
    console.log('   2. Settings > Linked devices > Link a device');
    console.log('   3. Tap "Link with phone number instead"');
    console.log('   4. Enter the code above (valid for about 3 minutes)');
    console.log(C.o + '══════════════════════════════════════════' + C.x + '\n');
}

async function pairWithNumber(phone) {
    const req = botRequire();
    const baileys = req('@whiskeysockets/baileys');
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, DisconnectReason } = baileys;
    const pino = req('pino');

    const name = phone;
    const dir = path.join(SESS, name);
    if (!credsLinked(readJson(path.join(dir, 'creds.json'), null))) wipe(dir);
    ensureDir(dir);

    let version;
    try { version = (await fetchLatestBaileysVersion()).version; } catch (e) {}

    let lastCodeAt = 0;
    for (let attempt = 1; ; attempt++) {
        phase = 'pairing';
        const { state, saveCreds } = await useMultiFileAuthState(dir);
        const sock = makeWASocket({
            auth: state,
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS('Safari'),
            markOnlineOnConnect: false,
            syncFullHistory: false,
            qrTimeout: 60000
        });
        sock.ev.on('creds.update', saveCreds);

        const result = await new Promise((resolve) => {
            let requesting = false;
            let expiryTimer = null;
            const requestCode = async () => {
                if (requesting || credsLinked(state.creds)) return;
                // Single code at a time: reuse the last one while it is still valid.
                if (Date.now() - lastCodeAt < PAIR_TTL_MS) return;
                requesting = true;
                try {
                    log('Requesting a pairing code for +' + phone + ' ...');
                    const code = await sock.requestPairingCode(phone);
                    lastCodeAt = Date.now();
                    printCode(code, phone);
                    clearTimeout(expiryTimer);
                    expiryTimer = setTimeout(() => {
                        if (!credsLinked(state.creds)) { log(C.y + 'Code expired. Getting a new one...' + C.x); requestCode(); }
                    }, PAIR_TTL_MS + 1000);
                } catch (e) {
                    log(C.r + 'Could not get a pairing code: ' + e.message + C.x);
                    lastCodeAt = 0;
                    setTimeout(() => { requesting = false; requestCode(); }, 15000);
                    return;
                }
                requesting = false;
            };

            sock.ev.on('connection.update', async (u) => {
                if (u.qr && !credsLinked(state.creds)) setTimeout(requestCode, 1500);
                if (u.connection === 'open') {
                    clearTimeout(expiryTimer);
                    resolve({ open: true, sock });
                }
                if (u.connection === 'close') {
                    clearTimeout(expiryTimer);
                    const code = u.lastDisconnect?.error?.output?.statusCode;
                    resolve({ open: false, code });
                }
            });
        });

        if (result.open) {
            await sleep(2500);
            try { state.creds.registered = true; await saveCreds(); } catch (e) {}
            await sendSessionIdOnce(result.sock, dir);
            try { result.sock.ev.removeAllListeners(); result.sock.end(undefined); } catch (e) {}
            await sleep(1500);
            return name;
        }

        const code = result.code;
        try { sock.ev.removeAllListeners(); sock.end(undefined); } catch (e) {}
        if (code === DisconnectReason.restartRequired && credsLinked(readJson(path.join(dir, 'creds.json'), null))) {
            log(C.g + 'Linked! Finishing setup...' + C.x);
            continue; // reconnect once with the new login, then hand over to the bot
        }
        if (code === DisconnectReason.loggedOut || code === 401 || code === 403) {
            log(C.r + 'WhatsApp refused this login (' + code + '). Starting fresh.' + C.x);
            wipe(dir); ensureDir(dir); lastCodeAt = 0;
            await sleep(5000);
            if (attempt >= 3) return null;
            continue;
        }
        if (!credsLinked(readJson(path.join(dir, 'creds.json'), null))) {
            log('Connection closed (' + (code || 'unknown') + '), retrying in 5s...');
            lastCodeAt = 0; // the old code died with that connection
        }
        await sleep(5000);
    }
}

async function sendSessionIdOnce(sock, dir) {
    const marker = path.join(dir, '.session-id-sent');
    if (fs.existsSync(marker)) return;
    try {
        const sid = encodeSessionId(dir);
        const self = String(sock.user?.id || '').split(':')[0].split('@')[0] + '@s.whatsapp.net';
        await sock.sendMessage(self, { text: sid });
        await sock.sendMessage(self, {
            text: 'Tracle-Lite is linked.\n\nThe message above is your session ID. Keep it private.\n' +
                  'Paste it as SESSION_ID on any host (or in the console) to start the bot without a new code.'
        });
        fs.writeFileSync(marker, new Date().toISOString());
        log(C.g + 'Your session ID was sent to your own WhatsApp chat ("Message yourself"). Keep it private.' + C.x);
    } catch (e) {
        log(C.y + 'Could not send the session ID to your chat: ' + e.message + C.x);
    }
}

// ---------------------------------------------------------------- finding a login
function printHelp() {
    console.log('\n' + C.o + 'No WhatsApp login yet.' + C.x + ' Do one of these, then restart:');
    console.log('  - Set PHONE_NUMBER=2345678901234 (your number with country code). A pairing code will show here.');
    console.log('  - Or set SESSION_ID=TRACLE~... (sent to your own chat after a link) or a Tracle_xxxx ID.');
    console.log('  - Or, on a console you can type in (Pterodactyl, VPS, PC), type your number or session ID.');
    console.log('Waiting... (checking again every 30 seconds)\n');
}

async function handleInput(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    const asNumber = s.replace(/[\s\-()+]/g, '');
    if (/^\d{8,15}$/.test(asNumber)) return pairWithNumber(asNumber);
    return restoreSessionId(s);
}

async function acquire() {
    for (;;) {
        // 1. saved session
        let have = linkedSessions();
        if (have.length) return have;

        // 2. SESSION_ID from env (comma separated allowed)
        const envSid = (process.env.SESSION_ID || '').trim();
        if (envSid) {
            if (isDead(envSid)) {
                log(C.y + 'The SESSION_ID in your settings was logged out of WhatsApp. Replace or remove it.' + C.x);
            } else {
                for (const one of envSid.split(',').map((x) => x.trim()).filter(Boolean)) {
                    await restoreSessionId(one);
                }
                have = linkedSessions();
                if (have.length) return have;
            }
        }

        // 3. PHONE_NUMBER from env
        const envPhone = digits(process.env.PHONE_NUMBER || process.env.OWNER_NUMBER || '');
        if (envPhone.length >= 8) {
            const name = await pairWithNumber(envPhone);
            if (name) return [name];
        }

        // 4. ask in the console
        setupStdin();
        if (!stdinClosed || pendingLines.length) {
            console.log('\n' + C.o + C.b + 'Tracle-Lite setup' + C.x);
            console.log('Type your WhatsApp number with country code (example: 2345678901234)');
            console.log('or paste your session ID, then press Enter.');
            phase = 'waiting-for-input';
            const answer = await askLine('> ');
            if (answer) {
                const name = await handleInput(answer);
                if (name) return [name];
                continue;
            }
        }

        // 5. nothing to work with: explain and wait (no crash loop)
        phase = 'waiting-for-setup';
        printHelp();
        await sleep(30000);
        loadEnvFile(true);
    }
}

// ---------------------------------------------------------------- run the bot
let child = null;
async function runBot(names) {
    await stopHealth();
    phase = 'running';
    log(C.g + 'Starting the bot (' + names.join(', ') + ')...' + C.x);
    const env = { ...process.env, TRACLE_LAUNCHER: '1' };
    delete env.SESSION_ID;      // the bot uses the sessions saved in ./sessions
    delete env.PHONE_NUMBER;    // pairing is done by this launcher
    env.PORT = String(PORT || '5000');
    env.SESSIONS_ROOT = SESS;
    env.TRACLE_SHARED_DIR = SHARED_DIR;

    child = spawn(process.execPath, [path.join(BUNDLE, 'server.js')], { cwd: BUNDLE, env, stdio: ['ignore', 'inherit', 'inherit'] });

    return new Promise((resolve) => {
        let missing = 0;
        const watch = setInterval(() => {
            if (linkedSessions().length) { missing = 0; return; }
            if (++missing >= 2) {
                clearInterval(watch);
                log(C.r + 'WhatsApp logged this bot out. You need to link again.' + C.x);
                if (process.env.SESSION_ID) markDead(process.env.SESSION_ID.trim());
                for (const n of names) wipe(path.join(SESS, n));
                try { child.kill('SIGTERM'); } catch (e) {}
                setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) {} }, 8000);
                resolve('logged-out');
            }
        }, 15000);
        child.on('exit', (code) => { clearInterval(watch); resolve('exit:' + code); });
    });
}

process.on('SIGTERM', () => { try { child && child.kill('SIGTERM'); } catch (e) {} process.exit(0); });
process.on('SIGINT', () => { try { child && child.kill('SIGINT'); } catch (e) {} process.exit(0); });
process.on('unhandledRejection', (e) => log('Error:', e && e.message ? e.message : e));

(async () => {
    console.log(C.o + C.b + '\n  Tracle-Lite\n' + C.x);
    ensureDir(SESS);
    migrateOldFolders();
    for (;;) {
        startHealth();
        BUNDLE = await ensureBundle();
        linkPersistent(BUNDLE);
        const names = await acquire();
        const why = await runBot(names);
        log('Bot stopped (' + why + '). Restarting in 5s...');
        await sleep(5000);
    }
})();
