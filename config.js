// config.js - saari keys aur constants ek jagah.
// IMPORTANT: yahan sirf PUBLIC keys daalein. service_role key kabhi mat daalein.

export const CONFIG = {
  // ---- Supabase ----
  SUPABASE_URL: 'https://ywuonhlgdhkwbygkpoza.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_GNfarciMzhkuaSFcTf5wtA_JoRtxsbA',

  // ---- EmailJS ----
  EMAILJS_PUBLIC_KEY: 'GIbeIviQo1ehc1gxX',
  EMAILJS_SERVICE_ID: 'service_8ln5mu9',
  EMAILJS_TEMPLATES: {
    orderToAdmin: 'template_ihpt477',
    orderToClient: 'template_ihpt477',
    contactToAdmin: 'template_ihpt477',
    demoReady: 'template_ihpt477',
    reviewToAdmin: 'template_ihpt477',
  },

  // ---- Business ----
  BRAND: 'PixelForge',
  WHATSAPP: '919263602455',          // country code ke saath, + ya space nahi
  EMAIL: 'sahilfact549@gmail.com',
  HOURS: 'Mon–Sat, 10am – 9pm IST',

  // ---- Storage buckets ----
  BUCKETS: {
    resumes: 'resumes',
    avatars: 'avatars',
    projectMedia: 'project-media',
    siteAssets: 'site-assets',
  },

  // ---- Limits ----
  MAX_RESUME_MB: 5,
  MAX_IMAGE_MB: 3,
  MAX_EXTRA_IMAGES: 5,

  // ---- Fallback socials (admin settings se override ho jayenge) ----
  SOCIALS: {
    whatsapp: '',   // common.js khud WHATSAPP se bana leta hai
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/in/',
    x: '',
    telegram: '',
    youtube: '',
  },
};

// WhatsApp deep link with pre-filled message
export function waLink(message = 'Hi! I would like to get a portfolio website built.') {
  return `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export const money = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN');
