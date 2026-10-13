const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL সেট করা নেই।');
    pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10000 });
    pool.on('error', (e) => console.error('pg pool error', e));
  }
  return pool;
}

/* পুরনো ডাটাবেসে নতুন কলাম/টেবিল নিজে থেকে যোগ হবে (প্রতি সার্ভার-ইনস্ট্যান্সে একবার) */
const MIGRATIONS = [
  "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS cover TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE banners ADD COLUMN IF NOT EXISTS img TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE banners ADD COLUMN IF NOT EXISTS img_m TEXT NOT NULL DEFAULT ''",
  `CREATE TABLE IF NOT EXISTS images (
     id TEXT PRIMARY KEY,
     mime TEXT NOT NULL,
     data BYTEA NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`
];
let migrated = null;
function ensure() {
  if (!migrated) {
    migrated = (async () => {
      for (const s of MIGRATIONS) await getPool().query(s);
    })().catch((e) => { migrated = null; throw e; });
  }
  return migrated;
}

const q = async (text, params) => { await ensure(); return getPool().query(text, params); };

/** একাধিক কাজ একসাথে (সব সফল হলে তবেই সংরক্ষণ) */
async function tx(fn) {
  await ensure();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

/* --- মেয়াদী কী-ভ্যালু (Apps Script-এর CacheService-এর বদলে) --- */
async function kvGet(k) {
  const r = await q('SELECT v FROM kv WHERE k = $1 AND exp > now()', [k]);
  return r.rows[0] ? r.rows[0].v : null;
}
async function kvPut(k, v, seconds) {
  await q(
    `INSERT INTO kv (k, v, exp) VALUES ($1, $2::jsonb, now() + make_interval(secs => $3::double precision))
     ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, exp = EXCLUDED.exp`,
    [k, JSON.stringify(v), seconds]
  );
  if (Math.random() < 0.05) q('DELETE FROM kv WHERE exp < now()').catch(() => {});
}
async function kvDel(k) { await q('DELETE FROM kv WHERE k = $1', [k]); }

module.exports = { q, tx, kvGet, kvPut, kvDel, getPool };
