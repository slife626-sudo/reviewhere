const crypto = require('crypto');
const { promisify } = require('util');
const { q } = require('./db');
const { fail, isAdmin } = require('./util');

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET সেট করা নেই (কমপক্ষে ১৬ অক্ষর)।');
  return s;
}

async function hashPw(pw, salt) {
  return (await scrypt(String(pw), salt, 64)).toString('hex');
}
const newSalt = () => crypto.randomBytes(16).toString('hex');
const newUid = () => crypto.randomBytes(5).toString('hex');        // ১০ অক্ষরের hex
const newCode = () => String(crypto.randomInt(100000, 1000000));    // ৬ ডিজিট

function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const sign = (p) => crypto.createHmac('sha256', secret()).update(p).digest('base64url');

function makeToken(u) {
  const p = u.uid + '|' + (Date.now() + SESSION_DAYS * 864e5) + '|' + u.hash.slice(0, 10);
  return Buffer.from(p).toString('base64url') + '.' + sign(p);
}

async function findUser(by, val) {
  const col = by === 'uid' ? 'uid' : 'email';
  const r = await q(`SELECT uid, created_at, email, name, hash, salt, status FROM users WHERE ${col} = $1`, [val]);
  return r.rows[0] || null;
}

/** টোকেন যাচাই করে ইউজার দেয়; না মিললে LOGIN_REQUIRED, অ্যাডমিন না হলে ADMIN_ONLY */
async function authUser(token, needAdmin) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) fail('LOGIN_REQUIRED');
  let p;
  try { p = Buffer.from(parts[0], 'base64url').toString('utf8'); } catch (e) { fail('LOGIN_REQUIRED'); }
  if (!safeEq(sign(p), parts[1])) fail('LOGIN_REQUIRED');
  const f = p.split('|');
  if (Date.now() > Number(f[1])) fail('LOGIN_REQUIRED');
  const u = await findUser('uid', f[0]);
  if (!u || u.status !== 'active' || u.hash.slice(0, 10) !== f[2]) fail('LOGIN_REQUIRED');
  if (needAdmin && !isAdmin(u.email)) fail('ADMIN_ONLY');
  return u;
}

const pubUser = (u) => ({ uid: u.uid, name: u.name, email: u.email, admin: isAdmin(u.email) });

module.exports = { hashPw, newSalt, newUid, newCode, safeEq, makeToken, findUser, authUser, pubUser };
