/** ইমেইল পাঠানো: RESEND_API_KEY থাকলে Resend, নইলে SMTP_URL থাকলে SMTP */
async function sendMail(to, subject, text) {
  const bad = { ok: false, error: 'ইমেইল পাঠানো যায়নি। ইমেইলটি ঠিক আছে কিনা দেখুন।' };
  const from = process.env.MAIL_FROM || 'রিভিউ হাব <onboarding@resend.dev>';
  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text })
      });
      if (!r.ok) { console.error('resend error', r.status, await r.text()); return bad; }
      return { ok: true };
    }
    if (process.env.SMTP_URL) {
      const nodemailer = require('nodemailer');
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail({ from, to, subject, text });
      return { ok: true };
    }
    console.error('ইমেইল কনফিগ করা নেই (RESEND_API_KEY বা SMTP_URL দিন)');
    return { ok: false, error: 'ইমেইল পাঠানোর ব্যবস্থা এখনো চালু হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।' };
  } catch (e) {
    console.error('mail error', e);
    return bad;
  }
}
module.exports = { sendMail };
