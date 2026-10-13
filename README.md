# রিভিউ হাব — Vercel সংস্করণ

Google Sheet + Apps Script থেকে রূপান্তরিত: **Vercel (ওয়েবসাইট + API) + Postgres (ডাটাবেস)**।
ডিজাইন ও ফিচার আগের মতোই (লগইন, ইমেইল ভেরিফিকেশন, অ্যাডমিন প্যানেল, ব্যানার, ফলো, নোটিফিকেশন)।

```
public/index.html   ফ্রন্টএন্ড (আগের Index.html; শুধু সার্ভার-কল বদলানো হয়েছে)
api/rpc.js          একমাত্র API এন্ডপয়েন্ট (Vercel Function)
lib/handlers.js     সব ব্যাকএন্ড লজিক (আগের Code.gs)
lib/*.js            ডাটাবেস, লগইন/টোকেন, ইমেইল, ডিফল্ট কনফিগ
db/schema.sql       ডাটাবেসের টেবিল
scripts/setup.js    টেবিল + ডিফল্ট ডাটা বসায়
scripts/seed.js     ১৫টি নমুনা রিভিউ বসায় (ঐচ্ছিক)
```

---

## ডিপ্লয়ের ধাপ

### ১. GitHub-এ আপলোড
```bash
git init
git add .
git commit -m "Review Hub"
git branch -M main
git remote add origin https://github.com/আপনার-নাম/review-hub.git
git push -u origin main
```
(আগে github.com-এ একটি খালি রিপোজিটরি বানিয়ে নিন।)

### ২. Vercel-এ প্রজেক্ট ইমপোর্ট
1. vercel.com → **Add New… → Project** → আপনার `review-hub` রিপোজিটরি **Import** করুন।
2. **Framework Preset: Other** রাখুন। Build Command বা Output Directory কিছু দিতে হবে না।
3. এখনই Deploy চাপবেন না। আগে ডাটাবেস ও ভেরিয়েবল বসাতে হবে (পরের ধাপ)। চাপলেও সমস্যা নেই, পরে আবার Redeploy করবেন।

### ৩. ডাটাবেস যোগ করুন (ফ্রি)
প্রজেক্টের **Storage** ট্যাব → **Create Database / Marketplace → Neon (Postgres)** → Free প্ল্যান বেছে প্রজেক্টে **Connect** করুন।
এতে `DATABASE_URL` ভেরিয়েবল নিজে থেকেই প্রজেক্টে বসে যাবে।

### ৪. Environment Variables
প্রজেক্ট → **Settings → Environment Variables** এ যোগ করুন:

| নাম | মান |
|---|---|
| `SESSION_SECRET` | লম্বা র‍্যান্ডম লেখা। বানাতে: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAILS` | আপনার ইমেইল (একাধিক হলে কমা দিয়ে)। এই ইমেইলে নিবন্ধন করলেই অ্যাডমিন |
| `RESEND_API_KEY` | resend.com থেকে পাওয়া কী (ইমেইল পাঠানোর জন্য, নিচে দেখুন) |
| `MAIL_FROM` | `রিভিউ হাব <noreply@আপনার-ডোমেইন.com>` |
| `NOTIFY_EMAIL` | (ঐচ্ছিক) নতুন রিভিউ এলে মেইল পেতে |

### ৫. ডাটাবেসের টেবিল বানান (একবারই)
নিজের কম্পিউটারে প্রজেক্ট ফোল্ডারে (Node.js ২০+ লাগবে):
```bash
npm install
npm i -g vercel
vercel login
vercel link                      # প্রজেক্টটি বেছে নিন
vercel env pull .env.local       # DATABASE_URL নামিয়ে আনে
node --env-file=.env.local scripts/setup.js
node --env-file=.env.local scripts/seed.js     # ঐচ্ছিক: ১৫টি নমুনা রিভিউ
```
`vercel` CLI না চাইলে Neon ড্যাশবোর্ড থেকে কানেকশন স্ট্রিং কপি করে চালান:
- Mac/Linux: `DATABASE_URL="postgres://..." npm run setup`
- Windows PowerShell: `$env:DATABASE_URL="postgres://..."; npm run setup`

### ৬. Redeploy
Vercel → **Deployments** → সর্বশেষটির ⋯ মেনু → **Redeploy** (নতুন ভেরিয়েবল নিতে এটা জরুরি)।

### ৭. পরীক্ষা
সাইট খুলে `ADMIN_EMAILS`-এর ইমেইল দিয়ে নিবন্ধন করুন। ইমেইলে ৬ ডিজিটের কোড আসবে। ঢুকলে অ্যাডমিন প্যানেল পাবেন।

---

## ইমেইল সেটআপ (গুরুত্বপূর্ণ)
নিবন্ধন ও পাসওয়ার্ড রিসেটে কোড ইমেইলে যায়। Apps Script-এর `MailApp` এখানে নেই, তাই একটি সার্ভিস লাগবে।

- **Resend (প্রস্তাবিত):** resend.com-এ অ্যাকাউন্ট খুলে নিজের ডোমেইন Verify করুন, তারপর API Key নিন।
  ডোমেইন Verify না করলে শুধু আপনার নিজের ইমেইলেই মেইল যাবে, অন্য পাঠকদের কাছে যাবে না।
- **Gmail SMTP (ডোমেইন না থাকলে):** `RESEND_API_KEY` ফাঁকা রেখে `SMTP_URL` দিন:
  `smtps://আপনি@gmail.com:অ্যাপ-পাসওয়ার্ড@smtp.gmail.com:465`
  (Google অ্যাকাউন্টে ২-ধাপ যাচাই চালু করে "অ্যাপ পাসওয়ার্ড" বানাতে হবে। দিনে প্রায় ৫০০টি মেইলের সীমা।)

## নিজের ডোমেইন
Vercel → Settings → **Domains** → ডোমেইন যোগ করে DNS-এ দেখানো রেকর্ড বসান।

## ডাটা কোথায় দেখবেন?
Google Sheet-এর বদলে Neon ড্যাশবোর্ডের **Tables** ট্যাবে সব টেবিল (reviews, users…) দেখা ও এডিট করা যায়। সাধারণ কাজ অ্যাডমিন প্যানেল থেকেই হয়।

## আগের Apps Script সংস্করণ থেকে যা বদলেছে
- পাসওয়ার্ড হ্যাশ এখন `scrypt` (আগে SHA-256 লুপ)। তাই **পুরনো ইউজার/পাসওয়ার্ড সরাসরি আনা যায় না**; সবাইকে নতুন করে নিবন্ধন করতে হবে। পুরনো রিভিউ Sheet থেকে CSV আকারে ইমপোর্ট করা সম্ভব (দরকার হলে বলুন)।
- ২ মিনিটের ক্যাশ বাদ। প্রতিবার সরাসরি ডাটাবেস থেকে পড়ে, তাই অ্যাডমিনের পরিবর্তন সাথে সাথে দেখা যায়।
- ভেরিফিকেশন কোড ও লগইন-ব্যর্থতার হিসাব ডাটাবেসের `kv` টেবিলে (মেয়াদসহ) থাকে।

## আগের মতোই থাকা সীমাবদ্ধতা
- হেল্পফুল (লাইক) ডুপ্লিকেট আটকানো হয় শুধু ব্রাউজারে (localStorage); চাইলে কেউ বারবার লাইক পাঠাতে পারে।
- নিবন্ধন/লগইনে IP-ভিত্তিক সীমা নেই, শুধু ইমেইলভিত্তিক।

## লোকালি চালানো
```bash
vercel dev      # .env.local থাকলে http://localhost:3000
```
