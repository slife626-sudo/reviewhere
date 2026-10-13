/**
 * রিভিউ হাব — সার্ভারের সব ফাংশন (Code.gs-এর Node.js + Postgres সংস্করণ)
 * ফ্রন্টএন্ড POST /api/rpc দিয়ে এই ফাংশনগুলো নাম ধরে ডাকে। এখানে যা export হয়, শুধু সেটাই বাইরে থেকে ডাকা যায়।
 */
const crypto = require('crypto');
const { q, tx, kvGet, kvPut, kvDel } = require('./db');
const { sendMail } = require('./mail');
const {
  hashPw, newSalt, newUid, newCode, safeEq, makeToken, findUser, authUser, pubUser
} = require('./auth');
const {
  AppError, fail, clean, clamp, normEmail, validEmail, safeUrl, safeLink, okColor, iso, isAdmin
} = require('./util');
const D = require('./defaults');

const hex = (n) => crypto.randomBytes(n).toString('hex');
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* =====================================================
 *  ভেতরের সহায়ক
 * ===================================================== */
function mapReview(r) {
  return {
    id: Number(r.id), time: iso(r.created_at), status: String(r.status).trim().toLowerCase(),
    w: String(r.reviewer), b: String(r.book), u: String(r.topic).trim(), a: String(r.author).trim(), p: String(r.publisher).trim(),
    c: String(r.category).trim().toLowerCase(),
    t: ['text', 'image', 'video'].includes(r.type) ? r.type : 'text',
    r: clamp(parseInt(r.rating, 10) || 5, 1, 5), x: String(r.review), m: safeUrl(r.media),
    l: Math.max(0, parseInt(r.likes, 10) || 0),
    s: [1, 2, 3].includes(Number(r.stock)) ? Number(r.stock) : 3,
    uid: String(r.uid || ''), note: String(r.note || ''), lk: safeUrl(r.link)
  };
}
const readReviews = async (where = '', params = []) =>
  (await q(`SELECT * FROM reviews ${where} ORDER BY id DESC`, params)).rows.map(mapReview);

async function addNotif(qq, uid, text) {
  await qq('INSERT INTO notifications (nid, uid, text) VALUES ($1, $2, $3)', [hex(4), uid, text]);
}

async function getSettings() {
  const out = { ...D.DEFAULT_SETTINGS };
  (await q('SELECT key, value FROM settings')).rows.forEach((r) => { if (has(D.DEFAULT_SETTINGS, r.key)) out[r.key] = r.value; });
  return out;
}
async function getCats() {
  return (await q('SELECT key, name, color, ord FROM categories ORDER BY ord, key')).rows
    .map((r) => ({ k: String(r.key), n: String(r.name), c: okColor(r.color, '#555f5a'), o: Number(r.ord) || 0 }))
    .filter((c) => c.k);
}
const catKeys = async () => (await getCats()).map((c) => c.k);
async function getBanners(all) {
  const rows = (await q('SELECT * FROM banners ORDER BY ord, bid')).rows;
  const out = rows.map((r) => ({
    bid: String(r.bid), o: Number(r.ord) || 0, on: !!r.on_, title: String(r.title), text: String(r.text), btn: String(r.btn),
    action: D.SECTIONS.includes(r.action) ? r.action : 'read', arg: String(r.arg),
    c1: okColor(r.c1, '#0f3d22'), c2: okColor(r.c2, '#2f6b5e')
  })).filter((b) => b.title);
  return all ? out : out.filter((b) => b.on);
}
async function getBadges() {
  return (await q('SELECT bid, icon, label FROM badges ORDER BY bid')).rows
    .map((r) => ({ bid: String(r.bid), i: String(r.icon), l: String(r.label) }))
    .filter((b) => b.bid && b.l);
}

async function saveProfile(qq, key, patch) {
  const old = (await qq('SELECT name, bio, badges FROM profiles WHERE key = $1', [key])).rows[0] || { name: '', bio: '', badges: '' };
  await qq(
    `INSERT INTO profiles (key, name, bio, badges, updated) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, bio = EXCLUDED.bio, badges = EXCLUDED.badges, updated = now()`,
    [key,
      patch.name != null ? patch.name : old.name,
      patch.bio != null ? patch.bio : old.bio,
      patch.badges != null ? patch.badges : old.badges]
  );
}

/* =====================================================
 *  পাবলিক: রিভিউ পড়া ও হেল্পফুল
 * ===================================================== */
async function getReviews() {
  const keys = await catKeys();
  const rows = await readReviews("WHERE status = 'approved'");
  return rows.map((r) => ({
    id: r.id, k: r.uid, d: r.time, w: r.w, b: r.b,
    u: r.u || 'অন্যান্য', a: r.a || 'অজানা', p: r.p || 'অজানা',
    c: keys.includes(r.c) ? r.c : 'other', t: r.t, r: r.r, x: r.x, m: r.m, l: r.l, s: r.s, n: r.lk
  }));
}

async function likeReview(id, delta) {
  id = Number(id);
  if (!Number.isInteger(id)) return { ok: false };
  delta = delta > 0 ? 1 : -1;
  const r = await q('UPDATE reviews SET likes = GREATEST(0, likes + $2) WHERE id = $1', [id, delta]);
  return { ok: r.rowCount > 0 };
}

/** পুরো সাইটের কনফিগ */
async function getConfig() {
  const [s, bn, ct, bdList, prRows, flRows] = await Promise.all([
    getSettings(), getBanners(false), getCats(), getBadges(),
    q('SELECT key, bio, badges FROM profiles'),
    q('SELECT target, count(*)::int AS n FROM follows GROUP BY target')
  ]);
  const bd = {}; bdList.forEach((b) => { bd[b.bid] = { i: b.i, l: b.l }; });
  const pr = {};
  prRows.rows.forEach((r) => { if (r.key) pr[r.key] = { bio: String(r.bio || ''), bd: String(r.badges || '').split(',').filter(Boolean) }; });
  const fl = {}; flRows.rows.forEach((r) => { fl[r.target] = r.n; });
  return { s, bn, ct, bd, pr, fl };
}

/* =====================================================
 *  অ্যাকাউন্ট: নিবন্ধন, লগইন, পাসওয়ার্ড রিসেট
 * ===================================================== */
async function register(name, email, pw) {
  name = clean(name, 40);
  email = normEmail(email);
  pw = String(pw || '');
  if (name.length < 2) return { ok: false, error: 'নাম অন্তত ২ অক্ষরের হতে হবে।' };
  if (!validEmail(email)) return { ok: false, error: 'সঠিক ইমেইল দিন।' };
  if (pw.length < 8 || pw.length > 100) return { ok: false, error: 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।' };
  if (await findUser('email', email)) return { ok: false, error: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করুন।' };
  if (await kvGet('rgt_' + email)) return { ok: false, error: 'এক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।' };

  const salt = newSalt();
  const code = newCode();
  const sent = await sendMail(email, 'রিভিউ হাব — ভেরিফিকেশন কোড',
    'আপনার ভেরিফিকেশন কোড: ' + code + '\n\nকোডটি ১৫ মিনিট পর্যন্ত কার্যকর থাকবে। আপনি অনুরোধ না করে থাকলে এই মেইল উপেক্ষা করুন।');
  if (!sent.ok) return sent;
  await kvPut('reg_' + email, { name, salt, hash: await hashPw(pw, salt), code, tries: 0 }, 900);
  await kvPut('rgt_' + email, 1, 60);
  return { ok: true };
}

async function verifyRegistration(email, code) {
  email = normEmail(email);
  const d = await kvGet('reg_' + email);
  if (!d) return { ok: false, error: 'কোডের মেয়াদ শেষ। আবার নিবন্ধন করুন।' };
  if (d.tries >= 5) { await kvDel('reg_' + email); return { ok: false, error: 'অনেকবার ভুল হয়েছে। আবার নিবন্ধন করুন।' }; }
  if (!safeEq(String(code).trim(), d.code)) {
    d.tries++; await kvPut('reg_' + email, d, 900);
    return { ok: false, error: 'কোড মেলেনি।' };
  }
  const uid = newUid();
  const ins = await q(
    `INSERT INTO users (uid, email, name, hash, salt, status) VALUES ($1, $2, $3, $4, $5, 'active')
     ON CONFLICT (email) DO NOTHING`,
    [uid, email, d.name, d.hash, d.salt]
  );
  if (!ins.rowCount) return { ok: false, error: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে।' };
  await kvDel('reg_' + email);
  const u = await findUser('uid', uid);
  return { ok: true, token: makeToken(u), user: pubUser(u) };
}

async function login(email, pw) {
  email = normEmail(email);
  const fk = 'lf_' + email;
  const fails = (parseInt(await kvGet(fk), 10) || 0);
  if (fails >= 5) return { ok: false, error: 'অনেকবার ভুল হয়েছে। ১৫ মিনিট পরে চেষ্টা করুন।' };
  const u = await findUser('email', email);
  const hashed = await hashPw(String(pw || ''), u ? u.salt : 'x');   // ইমেইল আছে কিনা সময় দেখে বোঝা না যাক
  if (!u || !safeEq(hashed, u.hash)) {
    await kvPut(fk, fails + 1, 900);
    return { ok: false, error: 'ইমেইল বা পাসওয়ার্ড ঠিক নয়।' };
  }
  if (u.status !== 'active') return { ok: false, error: 'এই অ্যাকাউন্টটি বন্ধ করা আছে।' };
  await kvDel(fk);
  return { ok: true, token: makeToken(u), user: pubUser(u) };
}

/** পেজ খোলার সময় সেশন ঠিক আছে কিনা */
async function me(token) {
  try { return { ok: true, user: pubUser(await authUser(token)) }; }
  catch (e) { if (e instanceof AppError) return { ok: false }; throw e; }
}

async function requestReset(email) {
  email = normEmail(email);
  const u = await findUser('email', email);
  if (u && u.status === 'active' && !(await kvGet('rst_' + email))) {
    const code = newCode();
    const sent = await sendMail(email, 'রিভিউ হাব — পাসওয়ার্ড রিসেট কোড',
      'পাসওয়ার্ড রিসেট কোড: ' + code + '\n\nকোডটি ১৫ মিনিট কার্যকর থাকবে। আপনি অনুরোধ না করে থাকলে এই মেইল উপেক্ষা করুন।');
    if (sent.ok) {
      await kvPut('rs_' + email, { code, tries: 0 }, 900);
      await kvPut('rst_' + email, 1, 60);
    }
  }
  return { ok: true };   // ইমেইল আছে কিনা বোঝা যাবে না
}

async function resetPassword(email, code, newPw) {
  email = normEmail(email);
  newPw = String(newPw || '');
  if (newPw.length < 8 || newPw.length > 100) return { ok: false, error: 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।' };
  const d = await kvGet('rs_' + email);
  if (!d) return { ok: false, error: 'কোডের মেয়াদ শেষ বা কোড ঠিক নয়।' };
  if (d.tries >= 5) { await kvDel('rs_' + email); return { ok: false, error: 'অনেকবার ভুল হয়েছে। আবার কোড নিন।' }; }
  if (!safeEq(String(code).trim(), d.code)) {
    d.tries++; await kvPut('rs_' + email, d, 900);
    return { ok: false, error: 'কোড মেলেনি।' };
  }
  const u = await findUser('email', email);
  if (!u) return { ok: false, error: 'কোডের মেয়াদ শেষ বা কোড ঠিক নয়।' };
  const salt = newSalt();
  await q('UPDATE users SET hash = $1, salt = $2 WHERE uid = $3', [await hashPw(newPw, salt), salt, u.uid]);
  await kvDel('rs_' + email);
  return { ok: true };   // পুরনো সব সেশন নিজে থেকেই অচল হয়ে যায়
}

/* =====================================================
 *  লগইন করা ব্যবহারকারীর কাজ
 * ===================================================== */
async function submitReview(token, v) {
  const user = await authUser(token);
  v = v || {};
  const b = clean(v.b, 150), x = clean(v.x, 3000);
  const r = clamp(parseInt(v.r, 10) || 5, 1, 5);
  const m = safeUrl(v.m);
  if (!b || !x) return { ok: false, error: 'বইয়ের নাম ও রিভিউ লিখুন।' };
  if (x.length < 20) return { ok: false, error: 'রিভিউ আরেকটু বিস্তারিত লিখুন।' };
  if (String(v.m || '').trim() && !m) return { ok: false, error: 'লিংকটি http:// বা https:// দিয়ে শুরু হতে হবে।' };

  const gate = 'sub_' + user.uid;
  if (await kvGet(gate)) return { ok: false, error: 'একটু অপেক্ষা করে আবার জমা দিন।' };

  const type = /(youtube\.com|youtu\.be|vimeo\.com)/i.test(m) ? 'video'
    : /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(m) ? 'image' : 'text';
  await q(
    `INSERT INTO reviews (status, reviewer, book, type, rating, review, media, likes, stock, uid)
     VALUES ('pending', $1, $2, $3, $4, $5, $6, 0, 3, $7)`,
    [user.name, b, type, r, x, m, user.uid]
  );
  await kvPut(gate, 1, 30);

  const notify = process.env.NOTIFY_EMAIL;
  if (notify) {
    await sendMail(notify, 'নতুন রিভিউ অনুমোদনের অপেক্ষায়: ' + b,
      'রিভিউয়ার: ' + user.name + '\nবই: ' + b + '\n\n' + x + '\n\nঅ্যাডমিন প্যানেল থেকে দেখুন।');
  }
  return { ok: true };
}

async function getMyReviews(token) {
  const user = await authUser(token);
  return readReviews('WHERE uid = $1', [user.uid]);
}

async function getNotifications(token) {
  const user = await authUser(token);
  const r = await q('SELECT nid, created_at, text, read FROM notifications WHERE uid = $1 ORDER BY created_at DESC LIMIT 20', [user.uid]);
  return r.rows.map((n) => ({ id: String(n.nid), time: iso(n.created_at), text: String(n.text), read: !!n.read }));
}

async function markNotifsRead(token) {
  const user = await authUser(token);
  await q('UPDATE notifications SET read = true WHERE uid = $1 AND read = false', [user.uid]);
  return { ok: true };
}

/* =====================================================
 *  ফলো ও নিজের পরিচিতি
 * ===================================================== */
async function reviewerExists(key) {
  if (key.indexOf('n:') === 0) {
    const r = await q("SELECT 1 FROM reviews WHERE status = 'approved' AND uid = '' AND reviewer = $1 LIMIT 1", [key.slice(2)]);
    return r.rowCount > 0;
  }
  return !!(await findUser('uid', key));
}

async function toggleFollow(token, target) {
  const user = await authUser(token);
  target = clean(target, 80);
  if (!target) return { ok: false, error: 'রিভিউয়ার পাওয়া যায়নি।' };
  if (target === user.uid) return { ok: false, error: 'নিজেকে ফলো করা যাবে না।' };
  if (!(await reviewerExists(target))) return { ok: false, error: 'রিভিউয়ার পাওয়া যায়নি।' };
  return tx(async (qq) => {
    const del = await qq('DELETE FROM follows WHERE uid = $1 AND target = $2', [user.uid, target]);
    let on;
    if (del.rowCount) on = false;
    else { await qq('INSERT INTO follows (uid, target) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.uid, target]); on = true; }
    const c = await qq('SELECT count(*)::int AS n FROM follows WHERE target = $1', [target]);
    return { ok: true, on, count: c.rows[0].n };
  });
}

async function myFollows(token) {
  const user = await authUser(token);
  return (await q('SELECT target FROM follows WHERE uid = $1', [user.uid])).rows.map((r) => r.target);
}

async function updateMyProfile(token, bio) {
  const user = await authUser(token);
  bio = clean(bio, 300);
  await saveProfile(q, user.uid, { name: user.name, bio });
  return { ok: true, bio };
}

/* =====================================================
 *  অ্যাডমিন: রিভিউ ও ব্যবহারকারী
 * ===================================================== */
async function adminReviews(token) {
  await authUser(token, true);
  return readReviews();
}

async function adminSaveReview(token, f) {
  await authUser(token, true);
  f = f || {};
  const status = String(f.status || '');
  const isNew = !Number(f.id);   // id ফাঁকা/০ হলে অ্যাডমিন নতুন রিভিউ যোগ করছেন
  if (!['pending', 'approved', 'rejected'].includes(status)) return { ok: false, error: 'অবস্থা ঠিক নয়।' };
  const w = clean(f.w, 40);
  if (isNew && !w) return { ok: false, error: 'রিভিউয়ারের নাম দিন।' };
  const b = clean(f.b, 150), u = clean(f.u, 80), a = clean(f.a, 120), p = clean(f.p, 120);
  const c = String(f.c || ''), t = String(f.t || 'text');
  const x = clean(f.x, 3000), m = safeUrl(f.m), note = clean(f.note, 200), lk = safeUrl(f.lk);
  const r = clamp(parseInt(f.r, 10) || 5, 1, 5);
  const s = [1, 2, 3].includes(parseInt(f.s, 10)) ? parseInt(f.s, 10) : 3;
  if (!b || !x) return { ok: false, error: 'বইয়ের নাম ও রিভিউ ফাঁকা রাখা যাবে না।' };
  if (c && !(await catKeys()).includes(c)) return { ok: false, error: 'ক্যাটাগরি ঠিক নয়।' };
  if (!['text', 'image', 'video'].includes(t)) return { ok: false, error: 'ধরন ঠিক নয়।' };
  if (String(f.m || '').trim() && !m) return { ok: false, error: 'মিডিয়া লিংক http/https দিয়ে শুরু হতে হবে।' };
  if (String(f.lk || '').trim() && !lk) return { ok: false, error: 'বইয়ের পাতার লিংক http:// বা https:// দিয়ে শুরু হতে হবে।' };
  if (status === 'approved' && (!c || !u || !a || !p)) return { ok: false, error: 'প্রকাশের আগে বিষয়, লেখক, প্রকাশক ও ক্যাটাগরি দিন।' };

  if (isNew) {   // অ্যাডমিনের যোগ করা নতুন রিভিউ (কোনো অ্যাকাউন্টের সাথে যুক্ত নয়)
    const ins = await q(
      `INSERT INTO reviews (status, reviewer, book, topic, author, publisher, category, type, rating, review, media, likes, stock, uid, note, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$12,'',$13,$14) RETURNING id`,
      [status, w, b, u, a, p, c, t, r, x, m, s, note, lk]
    );
    return { ok: true, id: ins.rows[0].id };
  }

  return tx(async (qq) => {
    const cur = await qq('SELECT status, uid FROM reviews WHERE id = $1 FOR UPDATE', [Number(f.id)]);
    if (!cur.rows[0]) return { ok: false, error: 'রিভিউটি পাওয়া যায়নি।' };
    const old = cur.rows[0].status, uid = String(cur.rows[0].uid || '');
    await qq(
      `UPDATE reviews SET reviewer = CASE WHEN $2::text <> '' THEN $2::text ELSE reviewer END,
         book = $3, topic = $4, author = $5, publisher = $6, category = $7, type = $8,
         rating = $9, review = $10, media = $11, status = $12, stock = $13, note = $14, link = $15
       WHERE id = $1`,
      [Number(f.id), w, b, u, a, p, c, t, r, x, m, status, s, note, lk]
    );
    if (status !== old && uid) {
      if (status === 'approved') await addNotif(qq, uid, 'আপনার রিভিউ "' + b + '" অনুমোদিত হয়ে প্রকাশিত হয়েছে।');
      if (status === 'rejected') await addNotif(qq, uid, '"' + b + '" রিভিউ প্রকাশ হয়নি' + (note ? ': ' + note : '।'));
    }
    return { ok: true };
  });
}

async function adminDeleteReview(token, id) {
  await authUser(token, true);
  const r = await q('DELETE FROM reviews WHERE id = $1', [Number(id) || 0]);
  return r.rowCount ? { ok: true } : { ok: false, error: 'রিভিউটি পাওয়া যায়নি।' };
}

async function adminUsers(token) {
  await authUser(token, true);
  const [users, counts] = await Promise.all([
    q('SELECT uid, created_at, email, name, status FROM users ORDER BY created_at DESC'),
    q("SELECT uid, count(*)::int AS n FROM reviews WHERE uid <> '' GROUP BY uid")
  ]);
  const cnt = {}; counts.rows.forEach((r) => { cnt[r.uid] = r.n; });
  return users.rows.map((u) => ({
    uid: u.uid, name: u.name, email: u.email, created: iso(u.created_at), status: u.status,
    admin: isAdmin(u.email), reviews: cnt[u.uid] || 0
  }));
}

async function adminSetUserStatus(token, uid, status) {
  const meU = await authUser(token, true);
  if (!['active', 'banned'].includes(status)) return { ok: false, error: 'অবস্থা ঠিক নয়।' };
  const u = await findUser('uid', uid);
  if (!u) return { ok: false, error: 'ব্যবহারকারী পাওয়া যায়নি।' };
  if (u.uid === meU.uid || isAdmin(u.email)) return { ok: false, error: 'অ্যাডমিনকে বন্ধ করা যাবে না।' };
  await q('UPDATE users SET status = $1 WHERE uid = $2', [status, u.uid]);
  return { ok: true };
}

/* =====================================================
 *  অ্যাডমিন: সেটিংস, ব্যানার, ক্যাটাগরি, ব্যাজ, প্রোফাইল
 * ===================================================== */
async function adminConfig(token) {
  await authUser(token, true);
  const [s, bn, ct, bd] = await Promise.all([getSettings(), getBanners(true), getCats(), getBadges()]);
  return { s, bn, ct, bd };
}

async function adminSaveSettings(token, obj) {
  await authUser(token, true);
  obj = obj || {};
  const out = {};
  for (const k of Object.keys(D.DEFAULT_SETTINGS)) {
    if (!has(obj, k)) continue;
    let v = clean(obj[k], k === 'foot_text' ? 600 : 200);
    if ((k === 'top_link_url' || k === 'foot_link_url' || k === 'req_url') && v && !safeLink(v)) return { ok: false, error: 'লিংক http://, https:// বা mailto: দিয়ে শুরু হতে হবে।' };
    if (k === 'topics_limit') v = String(clamp(parseInt(v, 10) || 12, 3, 30));
    if ((k === 'site_name' || k === 'site_title') && !v) return { ok: false, error: 'সাইটের নাম ও শিরোনাম ফাঁকা রাখা যাবে না।' };
    out[k] = v;
  }
  await tx(async (qq) => {
    for (const k of Object.keys(out)) {
      await qq('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, out[k]]);
    }
  });
  return { ok: true };
}

async function adminResetSettings(token) {
  await authUser(token, true);
  await q('DELETE FROM settings');
  return { ok: true };
}

async function saveBan(qq, it) {
  const title = clean(it.title, 100);
  if (!title) return { ok: false, error: 'শিরোনাম দিন।' };
  const action = D.SECTIONS.includes(it.action) ? it.action : 'read';
  const btn = clean(it.btn, 40), arg = clean(it.arg, 300);
  if (btn && action === 'link' && !safeLink(arg)) return { ok: false, error: 'বাটনের লিংক http:// বা https:// দিয়ে শুরু হতে হবে।' };
  if (btn && action === 'reviewer' && !arg) return { ok: false, error: 'রিভিউয়ারের নাম লিখুন।' };
  let bid = clean(it.bid, 20);
  if (bid && !/^[\w-]{1,20}$/.test(bid)) return { ok: false, error: 'আইডি ঠিক নয়।' };
  if (!bid) bid = 'b' + hex(4).slice(0, 7);
  await qq(
    `INSERT INTO banners (bid, ord, on_, title, text, btn, action, arg, c1, c2) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (bid) DO UPDATE SET ord=EXCLUDED.ord, on_=EXCLUDED.on_, title=EXCLUDED.title, text=EXCLUDED.text,
       btn=EXCLUDED.btn, action=EXCLUDED.action, arg=EXCLUDED.arg, c1=EXCLUDED.c1, c2=EXCLUDED.c2`,
    [bid, parseInt(it.order, 10) || 0, String(it.on) !== '0', title, clean(it.text, 250), btn, action, arg,
      okColor(it.c1, '#0f3d22'), okColor(it.c2, '#2f6b5e')]
  );
  return { ok: true, bid };
}
async function saveCat(qq, it) {
  const key = clean(it.k, 20).toLowerCase(), isNew = String(it.nw) === '1';
  if (!/^[a-z][a-z0-9_]{1,19}$/.test(key) || key === 'other') return { ok: false, error: 'কোড ইংরেজি ছোট হাতের অক্ষর/সংখ্যায় (২–২০ অক্ষর) দিন। "other" ব্যবহার করা যাবে না।' };
  const name = clean(it.n, 40);
  if (!name) return { ok: false, error: 'ক্যাটাগরির নাম দিন।' };
  const exists = (await qq('SELECT 1 FROM categories WHERE key = $1', [key])).rowCount > 0;
  if (isNew && exists) return { ok: false, error: 'এই কোডে ক্যাটাগরি আগেই আছে।' };
  if (!isNew && !exists) return { ok: false, error: 'ক্যাটাগরিটি পাওয়া যায়নি।' };
  await qq(
    `INSERT INTO categories (key, name, color, ord) VALUES ($1,$2,$3,$4)
     ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name, color=EXCLUDED.color, ord=EXCLUDED.ord`,
    [key, name, okColor(it.c, '#555f5a'), parseInt(it.o, 10) || 0]
  );
  return { ok: true };
}
async function saveBdg(qq, it) {
  const label = clean(it.l, 40);
  if (!label) return { ok: false, error: 'ব্যাজের নাম দিন।' };
  let bid = clean(it.bid, 20);
  if (bid && !/^[\w-]{1,20}$/.test(bid)) return { ok: false, error: 'আইডি ঠিক নয়।' };
  if (!bid) bid = 'g' + hex(4).slice(0, 7);
  await qq(
    `INSERT INTO badges (bid, icon, label) VALUES ($1,$2,$3)
     ON CONFLICT (bid) DO UPDATE SET icon=EXCLUDED.icon, label=EXCLUDED.label`,
    [bid, clean(it.i, 8), label]
  );
  return { ok: true, bid };
}

async function adminSaveItem(token, kind, it) {
  await authUser(token, true);
  it = it || {};
  return tx(async (qq) => {
    if (kind === 'ban') return saveBan(qq, it);
    if (kind === 'cat') return saveCat(qq, it);
    if (kind === 'bdg') return saveBdg(qq, it);
    return { ok: false, error: 'ধরন ঠিক নয়।' };
  });
}

async function adminDeleteItem(token, kind, id) {
  await authUser(token, true);
  id = String(id || '');
  const map = { ban: ['banners', 'bid'], cat: ['categories', 'key'], bdg: ['badges', 'bid'] };
  if (!has(map, kind)) return { ok: false, error: 'ধরন ঠিক নয়।' };
  const [table, col] = map[kind];
  return tx(async (qq) => {
    const r = await qq(`DELETE FROM ${table} WHERE ${col} = $1`, [id]);
    if (!r.rowCount) return { ok: false, error: 'আইটেমটি পাওয়া যায়নি।' };
    if (kind === 'bdg') {   // প্রোফাইল থেকেও ব্যাজটি সরানো
      const pros = (await qq('SELECT key, badges FROM profiles')).rows;
      for (const p of pros) {
        const list = String(p.badges).split(',').filter(Boolean);
        if (list.includes(id)) await saveProfile(qq, p.key, { badges: list.filter((x) => x !== id).join(',') });
      }
    }
    return { ok: true };
  });
}

/** সব রিভিউয়ার (নিবন্ধিত + অ্যাডমিনের যোগ করা/নমুনা) ও তাদের প্রোফাইল */
async function adminProfiles(token) {
  await authUser(token, true);
  const [prRows, users, revs] = await Promise.all([
    q('SELECT key, bio, badges FROM profiles'),
    q('SELECT uid, name FROM users ORDER BY created_at'),
    q('SELECT uid, reviewer, status FROM reviews ORDER BY id')
  ]);
  const pr = {}; prRows.rows.forEach((r) => { pr[r.key] = r; });
  const map = {};
  const add = (key, name, reg) => { if (!map[key]) map[key] = { key, name, reviews: 0, reg }; };
  users.rows.forEach((u) => add(u.uid, u.name, true));
  revs.rows.forEach((r) => {
    const key = r.uid || ('n:' + r.reviewer);
    add(key, r.reviewer, !!r.uid);
    if (r.status === 'approved' && map[key]) map[key].reviews++;
  });
  return Object.keys(map).map((k) => {
    const m = map[k], p = pr[k];
    m.bio = p ? p.bio : '';
    m.badges = p ? String(p.badges).split(',').filter(Boolean) : [];
    return m;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function adminSaveProfile(token, key, name, bio, badges) {
  await authUser(token, true);
  key = clean(key, 80);
  if (!/^(n:.{1,60}|[a-f0-9]{10})$/.test(key)) return { ok: false, error: 'রিভিউয়ার ঠিক নয়।' };
  const valid = (await getBadges()).map((b) => b.bid);
  const list = (Array.isArray(badges) ? badges : []).filter((b) => valid.includes(b));
  await saveProfile(q, key, { name: clean(name, 60), bio: clean(bio, 300), badges: list.join(',') });
  return { ok: true };
}

async function adminResetProfile(token, key) {
  await authUser(token, true);
  await q('DELETE FROM profiles WHERE key = $1', [clean(key, 80)]);
  return { ok: true };
}

module.exports = {
  getReviews, likeReview, getConfig,
  register, verifyRegistration, login, me, requestReset, resetPassword,
  submitReview, getMyReviews, getNotifications, markNotifsRead,
  toggleFollow, myFollows, updateMyProfile,
  adminReviews, adminSaveReview, adminDeleteReview, adminUsers, adminSetUserStatus,
  adminConfig, adminSaveSettings, adminResetSettings, adminSaveItem, adminDeleteItem,
  adminProfiles, adminSaveProfile, adminResetProfile
};
