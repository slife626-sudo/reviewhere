/**
 * নমুনা ডাটা (প্রোটোটাইপের ১৫টি রিভিউ) বসায়। রিভিউ টেবিলে আগেই ডাটা থাকলে থেমে যায়।
 * চালান:  npm run seed
 */
const { Pool } = require('pg');

const ROWS = [
  {
    "id": 1,
    "status": "approved",
    "reviewer": "রুমানা",
    "book": "আর-রাহীকুল মাখতূম",
    "topic": "সীরাত",
    "author": "সফিউর রহমান মুবারকপুরী",
    "publisher": "আল-হিকমাহ প্রকাশনী",
    "category": "islamic",
    "type": "text",
    "rating": 5,
    "review": "নবীজির (সা.) জীবনী সহজ ভাষায় ও তথ্যসূত্রসহ। প্রথমবার সীরাত পড়তে চাইলে ভালো শুরু। ঘটনাগুলো কালক্রমে সাজানো, তাই পড়তে গিয়ে হারিয়ে যেতে হয় না।",
    "media": "",
    "likes": 42,
    "stock": 1
  },
  {
    "id": 2,
    "status": "approved",
    "reviewer": "বুকওয়ার্ম তানভীর",
    "book": "রিয়াদুস সালেহীন",
    "topic": "হাদিস",
    "author": "ইমাম নববী (রহ.)",
    "publisher": "আল-হিকমাহ প্রকাশনী",
    "category": "islamic",
    "type": "video",
    "rating": 5,
    "review": "ভিডিওতে দেখিয়েছি কোন সংস্করণের অনুবাদ ও ব্যাখ্যা বেশি সহজ, আর কীভাবে প্রতিদিন কিছু হাদিস পড়ার অভ্যাস করবেন।",
    "media": "",
    "likes": 28,
    "stock": 1
  },
  {
    "id": 3,
    "status": "approved",
    "reviewer": "তাহমিদ",
    "book": "রিয়াদুস সালেহীন",
    "topic": "হাদিস",
    "author": "ইমাম নববী (রহ.)",
    "publisher": "আল-হিকমাহ প্রকাশনী",
    "category": "islamic",
    "type": "text",
    "rating": 4,
    "review": "প্রতিদিন ফজরের পর কয়েকটি হাদিস পড়ি। অনুবাদ সহজ, ব্যাখ্যা ছোট কিন্তু যথেষ্ট। হাদিসের মান নিয়ে আরও টীকা থাকলে ভালো হতো।",
    "media": "",
    "likes": 15,
    "stock": 1
  },
  {
    "id": 4,
    "status": "approved",
    "reviewer": "তাহমিদ",
    "book": "হিসনুল মুসলিম",
    "topic": "দোয়া ও যিকির",
    "author": "সাঈদ আল-কাহতানী",
    "publisher": "দারুল ইলম প্রকাশনী",
    "category": "islamic",
    "type": "text",
    "rating": 5,
    "review": "দৈনন্দিন দোয়ার ছোট সংকলন। আরবি, উচ্চারণ ও অর্থ একসাথে থাকায় ব্যাগে রাখার মতো বই।",
    "media": "",
    "likes": 19,
    "stock": 1
  },
  {
    "id": 5,
    "status": "approved",
    "reviewer": "রুমানা",
    "book": "নবীজির সা. জীবনের গল্প",
    "topic": "সীরাত",
    "author": "ফাতিমা আখতার",
    "publisher": "দারুল ইলম প্রকাশনী",
    "category": "islamic",
    "type": "image",
    "rating": 4,
    "review": "শিশুদের জন্য সাজানো সংস্করণের ছবি দিলাম। ছবি ও ভাষা দুটোই বয়সোপযোগী।",
    "media": "",
    "likes": 19,
    "stock": 0
  },
  {
    "id": 6,
    "status": "approved",
    "reviewer": "আরিফ",
    "book": "বিসিএস প্রিলিমিনারি ও লিখিত গাইড",
    "topic": "বিসিএস",
    "author": "আহসান হাবীব",
    "publisher": "মেধা বিকাশ প্রকাশনী",
    "category": "job",
    "type": "text",
    "rating": 4,
    "review": "পরীক্ষার আগে রিভিশনের জন্য কাজের। বাংলা ও সাধারণ জ্ঞান অংশ গোছানো, গণিতে আরও অনুশীলনী থাকলে ভালো হতো।",
    "media": "",
    "likes": 35,
    "stock": 1
  },
  {
    "id": 7,
    "status": "approved",
    "reviewer": "মিতু",
    "book": "বিসিএস প্রিলিমিনারি ও লিখিত গাইড",
    "topic": "বিসিএস",
    "author": "আহসান হাবীব",
    "publisher": "মেধা বিকাশ প্রকাশনী",
    "category": "job",
    "type": "video",
    "rating": 5,
    "review": "ভিডিওতে আলোচনা করেছি কীভাবে এই বই দিয়ে ৩ মাসে প্রস্তুতি সাজানো যায়।",
    "media": "",
    "likes": 22,
    "stock": 1
  },
  {
    "id": 8,
    "status": "approved",
    "reviewer": "নুসরাত",
    "book": "ব্যাংক নিয়োগ পরীক্ষা সলিউশন",
    "topic": "ব্যাংক জব",
    "author": "মাহফুজা আক্তার",
    "publisher": "চাকরি সহায়ক প্রকাশনী",
    "category": "job",
    "type": "image",
    "rating": 4,
    "review": "বইয়ের কয়েকটি অধ্যায়ের ছবি দিলাম। প্রশ্নব্যাংক সাজানো, তবে উত্তরের ব্যাখ্যা কিছু জায়গায় সংক্ষিপ্ত।",
    "media": "",
    "likes": 19,
    "stock": 1
  },
  {
    "id": 9,
    "status": "approved",
    "reviewer": "সাদিয়া",
    "book": "এইচএসসি পদার্থবিজ্ঞান ১ম পত্র",
    "topic": "এইচএসসি",
    "author": "প্রফেসর কামরুল হাসান",
    "publisher": "জ্ঞানকোষ প্রকাশনী",
    "category": "academic",
    "type": "text",
    "rating": 5,
    "review": "ধারণা পরিষ্কার হয় উদাহরণ দেখে। সৃজনশীল প্রশ্নের অনুশীলন অংশটা কাজে লেগেছে।",
    "media": "",
    "likes": 24,
    "stock": 2
  },
  {
    "id": 10,
    "status": "approved",
    "reviewer": "পড়ুয়া রাফি",
    "book": "বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি",
    "topic": "ভর্তি প্রস্তুতি",
    "author": "ড. নাজমুল হক",
    "publisher": "জ্ঞানকোষ প্রকাশনী",
    "category": "academic",
    "type": "video",
    "rating": 3,
    "review": "ভিডিওতে বলেছি কাদের জন্য বইটি উপযোগী আর কোন অংশ বাদ দিয়ে পড়া যায়।",
    "media": "",
    "likes": 11,
    "stock": 1
  },
  {
    "id": 11,
    "status": "approved",
    "reviewer": "হাসান",
    "book": "নামাজ শিক্ষা: ধাপে ধাপে",
    "topic": "সালাত",
    "author": "আবু বকর সিদ্দিক",
    "publisher": "আল-হিকমাহ প্রকাশনী",
    "category": "islamic",
    "type": "text",
    "rating": 5,
    "review": "অজু থেকে সালাম ফেরানো পর্যন্ত প্রতিটি ধাপ ছবিসহ বোঝানো। নতুনদের জন্য খুব উপযোগী, তবে মাযহাবভিত্তিক মতভেদের অংশটা সংক্ষিপ্ত।",
    "media": "",
    "likes": 31,
    "stock": 1
  },
  {
    "id": 12,
    "status": "approved",
    "reviewer": "সাদিয়া",
    "book": "রমজান ও সিয়ামের মাসায়েল",
    "topic": "সিয়াম",
    "author": "মুফতি আনোয়ার হোসেন",
    "publisher": "দারুল ইলম প্রকাশনী",
    "category": "islamic",
    "type": "image",
    "rating": 4,
    "review": "প্রতি রমজানের আগে এই বইটি আবার পড়ি। প্রশ্নোত্তরের ধরনে সাজানো, দ্রুত উত্তর খুঁজে পাওয়া যায়।",
    "media": "",
    "likes": 17,
    "stock": 1
  },
  {
    "id": 13,
    "status": "approved",
    "reviewer": "বুকওয়ার্ম তানভীর",
    "book": "আকিদা শিক্ষা: প্রাথমিক পাঠ",
    "topic": "আকিদা",
    "author": "শাইখ আব্দুর রহমান",
    "publisher": "দারুল ইলম প্রকাশনী",
    "category": "islamic",
    "type": "video",
    "rating": 5,
    "review": "ভিডিওতে আলোচনা করেছি বইটির ভাষা, প্রমাণের ধরন ও কাদের জন্য উপযোগী, বিশেষ করে যারা প্রথমবার আকিদা পড়ছেন।",
    "media": "",
    "likes": 26,
    "stock": 2
  },
  {
    "id": 14,
    "status": "approved",
    "reviewer": "আরিফ",
    "book": "যাকাতের বিধান ও হিসাব",
    "topic": "যাকাত",
    "author": "মুফতি আনোয়ার হোসেন",
    "publisher": "আল-হিকমাহ প্রকাশনী",
    "category": "islamic",
    "type": "text",
    "rating": 4,
    "review": "নিসাবের হিসাব ও কোন সম্পদে যাকাত আসে, উদাহরণসহ বোঝানো। হিসাবের ছক থাকলে আরও সহজ হতো।",
    "media": "",
    "likes": 14,
    "stock": 1
  },
  {
    "id": 15,
    "status": "approved",
    "reviewer": "মিতু",
    "book": "প্রাথমিক শিক্ষক নিয়োগ গাইড",
    "topic": "প্রাথমিক শিক্ষক",
    "author": "রেজাউল করিম",
    "publisher": "মেধা বিকাশ প্রকাশনী",
    "category": "job",
    "type": "text",
    "rating": 4,
    "review": "গত কয়েক বছরের প্রশ্নের ধরন বিশ্লেষণ করে সাজানো। বাংলা ও ইংরেজি অংশ ভালো, গণিতের ধাপে ধাপে সমাধান আরও দরকার।",
    "media": "",
    "likes": 12,
    "stock": 1
  }
];

(async () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) { console.error('DATABASE_URL সেট করা নেই।'); process.exit(1); }
  const pool = new Pool({ connectionString: url });
  try {
    const n = (await pool.query('SELECT count(*)::int AS n FROM reviews')).rows[0].n;
    if (n > 0) throw new Error('রিভিউ টেবিলে আগেই ডাটা আছে। নমুনা ডাটা বসাতে হলে আগে সেগুলো মুছুন।');
    for (const r of ROWS) {
      await pool.query(
        `INSERT INTO reviews (id,status,reviewer,book,topic,author,publisher,category,type,rating,review,media,likes,stock)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [r.id, r.status, r.reviewer, r.book, r.topic, r.author, r.publisher, r.category, r.type, r.rating, r.review, r.media, r.likes, r.stock]
      );
    }
    await pool.query("SELECT setval(pg_get_serial_sequence('reviews','id'), (SELECT MAX(id) FROM reviews))");
    console.log('✓ ' + ROWS.length + 'টি নমুনা রিভিউ বসানো হয়েছে');
  } catch (e) { console.error('ব্যর্থ:', e.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
