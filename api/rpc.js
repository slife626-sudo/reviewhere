/**
 * একটাই API এন্ডপয়েন্ট: POST /api/rpc  { "fn": "getReviews", "args": [...] }
 * সফল হলে { data }, ব্যর্থ হলে { error } ফেরত দেয়।
 */
const handlers = require('../lib/handlers');
const { AppError } = require('../lib/util');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'শুধু POST চলবে।' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const fn = body && body.fn, args = body && body.args;
  if (typeof fn !== 'string' || !Array.isArray(args) || !Object.prototype.hasOwnProperty.call(handlers, fn)) {
    return res.status(400).json({ error: 'অনুরোধ ঠিক নয়।' });
  }

  try {
    const data = await handlers[fn](...args.slice(0, 6));
    return res.status(200).json({ data: data === undefined ? null : data });
  } catch (e) {
    if (e instanceof AppError) return res.status(400).json({ error: e.message });
    console.error(fn, e);
    return res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।' });
  }
};
