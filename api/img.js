/**
 * GET /api/img?id=...  — অ্যাডমিনের আপলোড করা ছবি ডাটাবেস থেকে দেয়।
 * আইডি র‍্যান্ডম ও অপরিবর্তনীয়, তাই ব্রাউজার/CDN দীর্ঘ সময় ক্যাশ করে রাখতে পারে।
 */
const { q } = require('../lib/db');

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '');
  if (!/^[a-f0-9]{16,32}$/.test(id)) return res.status(404).end();
  try {
    const r = await q('SELECT mime, data FROM images WHERE id = $1', [id]);
    if (!r.rows[0]) return res.status(404).end();
    res.setHeader('Content-Type', r.rows[0].mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(r.rows[0].data);
  } catch (e) {
    console.error('img', e);
    return res.status(500).end();
  }
};
