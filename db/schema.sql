-- রিভিউ হাব: ডাটাবেস স্কিমা (একাধিকবার চালালেও ক্ষতি নেই)

CREATE TABLE IF NOT EXISTS users (
  uid        TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  hash       TEXT NOT NULL,
  salt       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status     TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  reviewer   TEXT NOT NULL DEFAULT '',
  book       TEXT NOT NULL DEFAULT '',
  topic      TEXT NOT NULL DEFAULT '',
  author     TEXT NOT NULL DEFAULT '',
  publisher  TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'text',      -- text | image | video
  rating     INT  NOT NULL DEFAULT 5,
  review     TEXT NOT NULL DEFAULT '',
  media      TEXT NOT NULL DEFAULT '',
  likes      INT  NOT NULL DEFAULT 0,
  stock      INT  NOT NULL DEFAULT 3,
  uid        TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  link       TEXT NOT NULL DEFAULT '',
  cover      TEXT NOT NULL DEFAULT ''           -- বইয়ের কভার ছবি (লিংক বা /api/img?id=...)
);
CREATE INDEX IF NOT EXISTS reviews_status_idx ON reviews (status);
CREATE INDEX IF NOT EXISTS reviews_uid_idx ON reviews (uid);

CREATE TABLE IF NOT EXISTS notifications (
  nid        TEXT PRIMARY KEY,
  uid        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  text       TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS notifications_uid_idx ON notifications (uid);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS banners (
  bid    TEXT PRIMARY KEY,
  ord    INT  NOT NULL DEFAULT 0,
  on_    BOOLEAN NOT NULL DEFAULT true,
  title  TEXT NOT NULL,
  text   TEXT NOT NULL DEFAULT '',
  btn    TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT 'read',
  arg    TEXT NOT NULL DEFAULT '',
  c1     TEXT NOT NULL DEFAULT '#0f3d22',
  c2     TEXT NOT NULL DEFAULT '#2f6b5e',
  img    TEXT NOT NULL DEFAULT '',          -- ডিজাইনকৃত ব্যানার ছবি (ডেস্কটপ)
  img_m  TEXT NOT NULL DEFAULT ''           -- মোবাইলের ছবি (ঐচ্ছিক)
);

-- অ্যাডমিনের আপলোড করা ছবি
CREATE TABLE IF NOT EXISTS images (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  key   TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#555f5a',
  ord   INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS badges (
  bid   TEXT PRIMARY KEY,
  icon  TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  key     TEXT PRIMARY KEY,                 -- ইউজারের uid অথবা "n:নাম"
  name    TEXT NOT NULL DEFAULT '',
  bio     TEXT NOT NULL DEFAULT '',
  badges  TEXT NOT NULL DEFAULT '',         -- কমা দিয়ে আলাদা ব্যাজ আইডি
  updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follows (
  uid     TEXT NOT NULL,
  target  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, target)
);

-- ভেরিফিকেশন কোড, লগইন ব্যর্থতার গণনা, ধীরগতির সীমা (মেয়াদসহ ছোট কী-ভ্যালু)
CREATE TABLE IF NOT EXISTS kv (
  k   TEXT PRIMARY KEY,
  v   JSONB NOT NULL,
  exp TIMESTAMPTZ NOT NULL
);
