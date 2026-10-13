class AppError extends Error {}
const fail = (msg) => { throw new AppError(msg); };

const clean = (s, max) =>
  String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
const safeUrl = (u) => {
  u = String(u == null ? '' : u).trim();
  return /^https?:\/\/[^\s<>"']+$/i.test(u) ? u.slice(0, 500) : '';
};
/** ছবির ঠিকানা: https লিংক অথবা আমাদের নিজের আপলোড (/api/img?id=...) */
const safeImg = (u) => {
  u = String(u == null ? '' : u).trim();
  return /^\/api\/img\?id=[a-f0-9]{16,32}$/.test(u) ? u : safeUrl(u);
};
const safeLink = (u) => {
  u = String(u == null ? '' : u).trim();
  return /^(https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+)$/i.test(u) ? u.slice(0, 500) : '';
};
const okColor = (c, d) => { c = String(c || '').trim(); return /^#[0-9a-f]{6}$/i.test(c) ? c : d; };
const iso = (d) => (d instanceof Date ? d.toISOString() : String(d || ''));

const adminList = () =>
  String(process.env.ADMIN_EMAILS || '').split(/[,\n]/).map((e) => e.trim().toLowerCase()).filter(Boolean);
const isAdmin = (email) => adminList().includes(String(email).toLowerCase());

module.exports = { AppError, fail, clean, clamp, normEmail, validEmail, safeUrl, safeImg, safeLink, okColor, iso, isAdmin };
