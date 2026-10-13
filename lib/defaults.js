/** সাইটের ডিফল্ট কনফিগ (Code.gs থেকে হুবহু) */
const DEFAULT_SETTINGS = {
  site_title: 'রিভিউ হাব — পাঠকদের বই রিভিউ',
  site_name: 'রিভিউ হাব',
  site_icon: '📚',
  top_text: 'প্রোটোটাইপ · নমুনা ডাটা',
  top_link_text: '← wahidiya.com',
  top_link_url: 'https://wahidiya.com',
  trust1: '🤝 সবার জন্য উন্মুক্ত',
  trust2: '⚖️ সমালোচনাও প্রকাশিত হয়',
  trust3: '📖 কেনার কোনো বাধ্যবাধকতা নেই',
  menu_topics: 'সালাত,সিয়াম,যাকাত,আকিদা,হাদিস,বিসিএস',
  topics_limit: '12',
  req_url: '',
  foot_text: 'এই হাব পাঠকদের একটি উন্মুক্ত আলোচনার জায়গা। রিভিউ প্রকাশের আগে আমাদের টিম শুধু ভাষা, তথ্য ও নিয়ম যাচাই করে। কোনো বই বিক্রির জন্য রিভিউ বাছাই বা প্রচার করা হয় না।',
  foot_link_text: '← মূল ওয়েবসাইটে ফিরুন',
  foot_link_url: 'https://wahidiya.com'
};

const DEFAULT_CATS = [
  { key: 'islamic', name: 'ইসলামিক', color: '#0f3d22', ord: 1 },
  { key: 'academic', name: 'একাডেমিক', color: '#2f5f8a', ord: 2 },
  { key: 'job', name: 'চাকরি প্রস্তুতি', color: '#a8481f', ord: 3 }
];

const DEFAULT_BANNERS = [
  { bid: 'd1', ord: 1, on_: true, title: 'ভালো বই খুঁজে পেতে পাঠকেরা একে অপরের পাশে', text: 'পড়ুন, জানুন, নিজের অভিজ্ঞতা শেয়ার করুন। ইসলামিক, একাডেমিক ও চাকরি প্রস্তুতির বই নিয়ে।', btn: 'রিভিউ পড়ুন', action: 'read', arg: '', c1: '#0f3d22', c2: '#2f6b5e' },
  { bid: 'd2', ord: 2, on_: true, title: 'আপনার পড়া বই নিয়ে লিখুন', text: 'আপনার একটি রিভিউ আরেকজন পাঠকের সঠিক বই বেছে নেওয়ার পথ দেখাতে পারে।', btn: 'রিভিউ লিখুন', action: 'write', arg: '', c1: '#2f5f8a', c2: '#3d4a8a' },
  { bid: 'd3', ord: 3, on_: true, title: 'বই নিয়ে ভিডিও আলোচনা', text: 'পাঠকদের নিজের কণ্ঠে বইয়ের আলোচনা শুনুন ও দেখুন।', btn: 'ভিডিও রিভিউ দেখুন', action: 'video', arg: '', c1: '#a8481f', c2: '#8a3d6b' },
  { bid: 'd4', ord: 4, on_: true, title: 'এই মাসের সেরা রিভিউয়ার: রুমানা', text: 'সীরাত ও হাদিসের বই নিয়ে তাঁর সহজ ও তথ্যসমৃদ্ধ রিভিউ পাঠকদের সবচেয়ে বেশি কাজে লেগেছে।', btn: 'তাঁর রিভিউ দেখুন', action: 'reviewer', arg: 'রুমানা', c1: '#6b4a8a', c2: '#0f3d22' }
];

const DEFAULT_BADGES = [
  { bid: 'verified', icon: '✓', label: 'ক্রয় যাচাইকৃত' },
  { bid: 'best', icon: '⭐', label: 'মাসের সেরা রিভিউয়ার' },
  { bid: 'seerat', icon: '🕌', label: 'সীরাত বিশেষজ্ঞ' }
];

const DEFAULT_PROFILES = [
  { key: 'n:রুমানা', name: 'রুমানা', bio: 'সীরাত, হাদিস ও ইসলামি সাহিত্যের নিয়মিত পাঠক। বই কেনার আগে কী জানা দরকার, সেটাই সহজভাবে লেখার চেষ্টা করি।', badges: 'verified,best,seerat' }
];

const SECTIONS = ['read', 'write', 'video', 'image', 'reviewer', 'link'];

module.exports = { DEFAULT_SETTINGS, DEFAULT_CATS, DEFAULT_BANNERS, DEFAULT_BADGES, DEFAULT_PROFILES, SECTIONS };
