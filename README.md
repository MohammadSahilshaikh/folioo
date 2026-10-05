# PixelForge — setup guide

Pure HTML + CSS + JS. No build step. Supabase (data + files), EmailJS (mail), Vercel (hosting).

---

## Part 1 — Supabase

1. [supabase.com](https://supabase.com) pe project banayein.
2. **SQL Editor** kholein → `sql/schema.sql` ka poora content paste karein → **Run**.
   Isse saari tables, RLS policies, 4 storage buckets aur seed plans ban jayenge.
3. **Authentication → Users → Add user** — apna email + strong password daalein.
4. Wapas SQL Editor me jaakar chalayein:
   ```sql
   update public.profiles set role = 'admin' where email = 'aapka@email.com';
   ```
   Ye zaroori hai — iske bina admin panel kuch nahi dikhayega.
5. **Settings → API** se copy karein:
   - Project URL
   - `anon` `public` key

> ⚠️ `service_role` key kabhi frontend me mat daalein. Wo poori database ka master key hai.

---

## Part 2 — EmailJS

1. [emailjs.com](https://emailjs.com) pe account + email service connect karein.
2. Ye 5 templates banayein (variable names exactly ye rakhein):

| Template | Variables |
|---|---|
| `template_order_admin` | `tracking_id, name, email, whatsapp, plan, total, advance, details_text, resume_url` |
| `template_order_client` | `name, tracking_id, plan, advance, final, track_url` |
| `template_contact_admin` | `name, email, whatsapp, subject, message` |
| `template_demo_ready` | `name, demo_url, advance, upi_id` |
| `template_review_admin` | `name, rating, comment` |

3. **Account → General** se Public Key copy karein.

---

## Part 3 — Keys daalna

`js/config.js` kholein aur bharein:

```js
SUPABASE_URL: 'https://xxxxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJ...',
EMAILJS_PUBLIC_KEY: '...',
EMAILJS_SERVICE_ID: 'service_xxx',
WHATSAPP: '919876543210',   // country code, koi + ya space nahi
EMAIL: 'aapka@email.com',
BRAND: 'AapkaBrand',
```

---

## Part 4 — Vercel deploy

```bash
git init
git add .
git commit -m "first"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Phir [vercel.com](https://vercel.com) → **Add New → Project** → repo import karein.
Framework preset: **Other**. Build command: khali chhod dein. Output directory: `./`
Deploy dabayein — 30 second me live.

Local test ke liye (module imports ko server chahiye):
```bash
npx serve .
```
`file://` se mat kholein, ES modules block ho jayenge.

---

## Part 5 — Supabase me site URL allow karna

Supabase → **Authentication → URL Configuration** → Site URL me apna Vercel URL daalein,
aur **Redirect URLs** me `https://your-app.vercel.app/admin/dashboard.html` add karein.

---

## File map

```
index.html            Home — hero, 50/50 offer, plans, work, reviews, FAQ
js/config.js          Saari keys aur constants (yahi edit karna hai)
js/supabase-client.js Shared client + cached fetchers + safe() wrapper
js/common.js          Navbar, footer, theme, toast, cursor, utils (esc, validators)
js/canvas-bg.js       8 canvas modes — har page alag mode use karta hai
js/lazy.js            Reveal, section lazy-fetch, counters, prefetch, skeletons
js/index.js           Home page logic
sql/schema.sql        Poora database + RLS + buckets + seed data
vercel.json           Security headers + caching
```

---

## Navigation (simple rakha gaya hai)

**Phone (< 768px):** neeche fixed tab bar — Home · Work · **Start** · Pricing · Contact.
Koi hamburger nahi. Thumb ke paas rehta hai, hamesha dikhta hai, ek tap me page change.
Upar sirf ek chhoti header (brand + theme toggle).

**Tablet / PC (≥ 768px):** normal top nav + "Start your site" button + WhatsApp bubble.

Pages 7 se 4 kar diye gaye: **Home, Work, Pricing, Contact**.
Services home ke plans me, About/Reviews footer aur home sections me mil gaye.

## Ban chuke pages

| Page | Kya karta hai |
|---|---|
| `index.html` | Home — hero, 50/50 offer, plans, work, reviews, FAQ |
| `work.html` | Live demos — filter chips + "load more" pagination |
| `pricing.html` | Poori plans list + live add-on calculator |
| `contact.html` | Contact form (Supabase `messages`) + WhatsApp card + socials |
| `order.html` | **"Start your site"** — 3-step wizard (Plan → Details+Uploads → Confirm) |
| `thank-you.html` | Order ke baad — Tracking ID + next steps |
| `track.html` | Tracking ID + email se apna order status dekhein |
| `reviews.html` | Sab approved reviews + rating summary + "write a review" form |
| `privacy.html` / `terms.html` | Simple padhne layak legal pages |

### ⚠️ SQL dobara run karna hai
`sql/schema.sql` me ek naya section aaya hai — **`get_lead_status`** function, jo `track.html`
ko safely (poori `leads` table expose kiye bina) sirf tracking ID + email match hone par
limited status dikhane deta hai. Poori file dobara Supabase SQL Editor me paste + Run karein —
baaki sab `create or replace` / `on conflict do nothing` hai, isliye purana data safe rahega.

### `order.html` ke andar kya hai
- **Step 1:** Plan radio-select + add-ons + live 50/50 split
- **Step 2:** Contact details, portfolio content (title, bio, skills, projects, socials, style),
  resume upload (pdf/doc, 5MB limit), photo upload (**client-side canvas compression**, max 1200px)
- **Step 3:** Full review with "Edit" links wapas us step pe, terms checkbox, submit
- Har field me **autosave** (localStorage) — refresh hone pe form khali nahi hota
- Submit pe: files Supabase Storage me jaati hain → `leads` table me insert →
  2 EmailJS mail (admin + client) → `thank-you.html?id=TRACKING_ID` pe redirect
- Duplicate-submission guard: same email/WhatsApp se 24h me dusra order block

## Admin panel (`/admin/`) — poora control

| Page | Kya control karta hai |
|---|---|
| `login.html` | Supabase Auth — email + password, sirf `role='admin'` allowed |
| `dashboard.html` | Total leads, is week ke leads, pending reviews, live sites, collected/pending payment, recent leads + messages |
| `leads.html` | Sab orders — search, status filter, pagination, CSV export. Row click → drawer: status change, demo URL set, payment (advance/final) toggle, timestamped notes, CV/photo **signed-URL** view (private buckets), delete |
| `projects.html` | Portfolio manager — add/edit demos jo `work.html` pe dikhte hain: thumbnail upload (client-compressed), demo link, category, tech tags, featured/published toggle |
| `reviews.html` | Pending reviews approve/reject, feature-on-homepage toggle, delete |
| `plans.html` | Plans aur add-ons ka poora CRUD — price, features, popular badge, active toggle |
| `content.html` | Home page ka FAQ aur "Why us" section — bina code chhue text edit |
| `messages.html` | Contact form submissions + callback requests — read/unread, delete |
| `settings.html` | Social links, business info (WhatsApp/email/hours), maintenance mode toggle, activity log |

Sab pages ek shared `js/admin/shell.js` use karte hain: auth guard (non-admin ko turant `login.html` bhej deta hai), sidebar+topbar, toast, confirm-modal, CSV export, date formatting — taaki har page halka rahe.

### Admin panel try karne se pehle
1. `sql/schema.sql` run ho chuka ho
2. Supabase Auth me apna user bana ke uska `role` `profiles` table me `admin` set kiya ho (README ke Part 1 me steps hain)
3. `js/config.js` me keys bhari ho
4. Browser me kholein: `admin/login.html`

## Abhi banna baaki hai

Sirf `about.html` aur `404.html` — do chhoti static pages. Baaki poora site (public pages +
poora admin panel) functional hai.


Foundation (`common.js`, `lazy.js`, `canvas-bg.js`, `supabase-client.js`) sab pages
share karte hain, isliye har naye page me sirf uska HTML + apna ek JS file chahiye.
