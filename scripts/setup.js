/**
 * ডাটাবেসে টেবিল বানায় এবং (প্রথমবার) ডিফল্ট সেটিংস/ক্যাটাগরি/ব্যানার/ব্যাজ বসায়।
 * চালান:  npm run setup   (DATABASE_URL সেট থাকতে হবে)
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const D = require('../lib/defaults');

(async () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) { console.error('DATABASE_URL সেট করা নেই।'); process.exit(1); }
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    console.log('✓ টেবিল তৈরি/হালনাগাদ হয়েছে');

    const done = await pool.query("SELECT 1 FROM kv WHERE k = 'seeded_v1'");
    if (!done.rowCount) {
      for (const c of D.DEFAULT_CATS)
        await pool.query('INSERT INTO categories (key,name,color,ord) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [c.key, c.name, c.color, c.ord]);
      for (const b of D.DEFAULT_BANNERS)
        await pool.query('INSERT INTO banners (bid,ord,on_,title,text,btn,action,arg,c1,c2) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
          [b.bid, b.ord, b.on_, b.title, b.text, b.btn, b.action, b.arg, b.c1, b.c2]);
      for (const g of D.DEFAULT_BADGES)
        await pool.query('INSERT INTO badges (bid,icon,label) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [g.bid, g.icon, g.label]);
      for (const p of D.DEFAULT_PROFILES)
        await pool.query('INSERT INTO profiles (key,name,bio,badges) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [p.key, p.name, p.bio, p.badges]);
      // মেয়াদ ১০০ বছর: ডিফল্ট শুধু একবারই বসবে, অ্যাডমিন কিছু মুছলে আর ফিরে আসবে না
      await pool.query("INSERT INTO kv (k,v,exp) VALUES ('seeded_v1','1', now() + interval '36500 days')");
      console.log('✓ ডিফল্ট ক্যাটাগরি, ব্যানার, ব্যাজ ও প্রোফাইল বসানো হয়েছে');
    } else {
      console.log('• ডিফল্ট ডাটা আগেই বসানো আছে (বাদ দেওয়া হলো)');
    }
    if (!String(process.env.ADMIN_EMAILS || '').trim()) console.log('⚠ ADMIN_EMAILS সেট করা নেই — কেউ অ্যাডমিন হতে পারবে না।');
    console.log('সেটআপ শেষ।');
  } catch (e) {
    console.error('ব্যর্থ:', e.message); process.exitCode = 1;
  } finally { await pool.end(); }
})();
