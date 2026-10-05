-- ============================================================================
-- PixelForge — Supabase schema
-- Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============================================================================
-- 1. PROFILES (admin users)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'admin',
  created_at  timestamptz default now()
);

-- login pe profile auto-ban jaye
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- "kya current user admin hai" — saari policies isi ko use karti hain
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- 2. PLANS + ADDONS
-- ============================================================================
create table if not exists public.plans (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  price         integer not null default 0,
  old_price     integer,
  delivery_days integer default 3,
  pages         integer default 1,
  features      jsonb default '[]'::jsonb,
  is_popular    boolean default false,
  is_active     boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

create table if not exists public.addons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       integer not null default 0,
  description text,
  is_active   boolean default true,
  sort_order  integer default 0
);

-- ============================================================================
-- 3. LEADS (order form submissions) — sabse important table
-- ============================================================================
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  tracking_id     text unique not null,

  -- contact
  full_name       text not null,
  email           text not null,
  whatsapp        text not null,
  city            text,
  contact_time    text,
  source          text,

  -- plan + money
  plan_id         uuid references public.plans(id) on delete set null,
  plan_snapshot   jsonb,
  addons          jsonb default '[]'::jsonb,
  referral_code   text,
  total_amount    integer default 0,
  advance_amount  integer default 0,
  final_amount    integer default 0,
  advance_paid    boolean default false,
  advance_paid_at timestamptz,
  final_paid      boolean default false,
  final_paid_at   timestamptz,

  -- portfolio content
  profession_title text,
  bio              text,
  skills           jsonb default '[]'::jsonb,
  education        jsonb default '[]'::jsonb,
  experience       jsonb default '[]'::jsonb,
  projects         jsonb default '[]'::jsonb,
  certifications   jsonb default '[]'::jsonb,
  social_links     jsonb default '{}'::jsonb,
  theme_pref       text,
  style_pref       text,
  domain_pref      text,
  notes            text,
  needs_content    boolean default false,

  -- files
  resume_url    text,
  avatar_url    text,
  extra_images  jsonb default '[]'::jsonb,

  -- pipeline
  status        text not null default 'new',
  -- new | contacted | in_progress | demo_sent | advance_paid | revisions | approved | live | cancelled
  demo_url      text,
  admin_notes   jsonb default '[]'::jsonb,
  priority      integer default 0,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
for each row execute function public.touch_updated_at();

create index if not exists leads_created_idx  on public.leads (created_at desc);
create index if not exists leads_status_idx   on public.leads (status);
create index if not exists leads_tracking_idx on public.leads (tracking_id);

-- ============================================================================
-- 4. PROJECTS (public portfolio showcase)
-- ============================================================================
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text unique,
  category      text,
  client_type   text,
  description   text,
  tech          jsonb default '[]'::jsonb,
  thumbnail_url text,
  gallery       jsonb default '[]'::jsonb,
  demo_url      text,
  is_featured   boolean default false,
  is_published  boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

-- ============================================================================
-- 5. REVIEWS
-- ============================================================================
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  rating       smallint not null check (rating between 1 and 5),
  comment      text not null,
  photo_url    text,
  project_link text,
  plan_name    text,
  status       text not null default 'pending',  -- pending | approved | rejected
  is_featured  boolean default false,
  created_at   timestamptz default now(),
  approved_at  timestamptz
);
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

-- ============================================================================
-- 6. MESSAGES / CALLBACKS / SUBSCRIBERS
-- ============================================================================
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  whatsapp   text,
  subject    text,
  message    text not null,
  is_read    boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.callbacks (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  whatsapp       text not null,
  preferred_time text,
  note           text,
  status         text default 'pending',
  created_at     timestamptz default now()
);

create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- 6.5. SPAM PROTECTION (RATE LIMITING)
-- ============================================================================
create or replace function public.check_rate_limit()
returns trigger
language plpgsql security definer as $$
declare
  recent_count int;
  check_email text;
begin
  if TG_TABLE_NAME = 'leads' or TG_TABLE_NAME = 'messages' or TG_TABLE_NAME = 'reviews' then
    check_email := NEW.email;
    if check_email is not null and check_email <> '' then
      execute format('select count(*) from public.%I where email = $1 and created_at > now() - interval ''24 hours''', TG_TABLE_NAME)
      into recent_count
      using check_email;
      
      if recent_count >= 5 then
        raise exception 'Rate limit exceeded: Please try again after 24 hours.';
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists leads_rate_limit on public.leads;
create trigger leads_rate_limit before insert on public.leads
for each row execute function public.check_rate_limit();

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
for each row execute function public.check_rate_limit();

drop trigger if exists reviews_rate_limit on public.reviews;
create trigger reviews_rate_limit before insert on public.reviews
for each row execute function public.check_rate_limit();

-- ============================================================================
-- 7. SITE CONTENT + SETTINGS + LOGS
-- ============================================================================
create table if not exists public.site_content (
  id          uuid primary key default gen_random_uuid(),
  page_key    text not null,
  section_key text not null,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now(),
  unique (page_key, section_key)
);
drop trigger if exists content_touch on public.site_content;
create trigger content_touch before update on public.site_content
for each row execute function public.touch_updated_at();

create table if not exists public.settings (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
for each row execute function public.touch_updated_at();

create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text,
  entity     text,
  entity_id  text,
  meta       jsonb,
  created_at timestamptz default now()
);

-- ============================================================================
-- 7.5 PUBLIC TRACKING LOOKUP (track.html)
--     Public 'leads' table read RLS allow nahi karta (sirf admin).
--     Isliye ek security-definer function: sirf exact tracking_id + email
--     match hone par limited, safe columns return karta hai.
-- ============================================================================
create or replace function public.get_lead_status(p_tracking_id text, p_email text)
returns table (
  tracking_id     text,
  full_name       text,
  status          text,
  demo_url        text,
  advance_amount  integer,
  final_amount    integer,
  advance_paid    boolean,
  final_paid      boolean,
  plan_name       text,
  created_at      timestamptz
)
language sql security definer set search_path = public as $$
  select l.tracking_id, l.full_name, l.status, l.demo_url,
         l.advance_amount, l.final_amount, l.advance_paid, l.final_paid,
         coalesce(l.plan_snapshot->>'name', ''), l.created_at
  from public.leads l
  where l.tracking_id = p_tracking_id
    and lower(l.email) = lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.get_lead_status(text, text) to anon, authenticated;

-- ============================================================================
-- 8. ROW LEVEL SECURITY
--    Rule: public sirf wahi padh sakta hai jo publish hua ho.
--          Likhna sirf forms me (insert), aur admin ko sab.
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.plans         enable row level security;
alter table public.addons        enable row level security;
alter table public.leads         enable row level security;
alter table public.projects      enable row level security;
alter table public.reviews       enable row level security;
alter table public.messages      enable row level security;
alter table public.callbacks     enable row level security;
alter table public.subscribers   enable row level security;
alter table public.site_content  enable row level security;
alter table public.settings      enable row level security;
alter table public.activity_logs enable row level security;

-- profiles: apna record khud padh sake
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (auth.uid() = id);

-- plans / addons: public read (active only), admin write
drop policy if exists "plans read" on public.plans;
create policy "plans read" on public.plans for select using (is_active = true or public.is_admin());
drop policy if exists "plans write" on public.plans;
create policy "plans write" on public.plans for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "addons read" on public.addons;
create policy "addons read" on public.addons for select using (is_active = true or public.is_admin());
drop policy if exists "addons write" on public.addons;
create policy "addons write" on public.addons for all using (public.is_admin()) with check (public.is_admin());

-- projects: sirf published public ko
drop policy if exists "projects read" on public.projects;
create policy "projects read" on public.projects for select using (is_published = true or public.is_admin());
drop policy if exists "projects write" on public.projects;
create policy "projects write" on public.projects for all using (public.is_admin()) with check (public.is_admin());

-- reviews: approved public ko, koi bhi submit kar sakta hai (pending hi banega)
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews
  for select using (status = 'approved' or public.is_admin());
drop policy if exists "reviews insert" on public.reviews;
create policy "reviews insert" on public.reviews
  for insert with check (status = 'pending');   -- koi khud ko approve nahi kar sakta
drop policy if exists "reviews manage" on public.reviews;
create policy "reviews manage" on public.reviews
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "reviews delete" on public.reviews;
create policy "reviews delete" on public.reviews for delete using (public.is_admin());

-- leads: anyone insert, sirf admin read/update/delete
drop policy if exists "leads insert" on public.leads;
create policy "leads insert" on public.leads for insert with check (true);
drop policy if exists "leads admin" on public.leads;
create policy "leads admin" on public.leads for select using (public.is_admin());
drop policy if exists "leads update" on public.leads;
create policy "leads update" on public.leads for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "leads delete" on public.leads;
create policy "leads delete" on public.leads for delete using (public.is_admin());

-- messages / callbacks / subscribers: insert sabko, read admin ko
drop policy if exists "msg insert" on public.messages;
create policy "msg insert" on public.messages for insert with check (true);
drop policy if exists "msg admin" on public.messages;
create policy "msg admin" on public.messages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cb insert" on public.callbacks;
create policy "cb insert" on public.callbacks for insert with check (true);
drop policy if exists "cb admin" on public.callbacks;
create policy "cb admin" on public.callbacks for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sub insert" on public.subscribers;
create policy "sub insert" on public.subscribers for insert with check (true);
drop policy if exists "sub admin" on public.subscribers;
create policy "sub admin" on public.subscribers for all using (public.is_admin()) with check (public.is_admin());

-- content / settings: public read, admin write
drop policy if exists "content read" on public.site_content;
create policy "content read" on public.site_content for select using (true);
drop policy if exists "content write" on public.site_content;
create policy "content write" on public.site_content for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings for select using (true);
drop policy if exists "settings write" on public.settings;
create policy "settings write" on public.settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "logs admin" on public.activity_logs;
create policy "logs admin" on public.activity_logs for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 9. STORAGE BUCKETS
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('resumes','resumes',false, 5242880, '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'),
  ('avatars','avatars',false, 3145728, '{"image/jpeg","image/png","image/webp"}'),
  ('project-media','project-media',true, 10485760, '{"image/jpeg","image/png","image/webp","video/mp4"}'),
  ('site-assets','site-assets',true, null, null)
on conflict (id) do update set 
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- upload sabko allowed (order form), padhna sirf admin (signed URL se)
drop policy if exists "upload private" on storage.objects;
create policy "upload private" on storage.objects
  for insert with check (bucket_id in ('resumes','avatars'));

drop policy if exists "read private admin" on storage.objects;
create policy "read private admin" on storage.objects
  for select using (
    bucket_id in ('project-media','site-assets')
    or (bucket_id in ('resumes','avatars') and public.is_admin())
  );

drop policy if exists "admin manage media" on storage.objects;
create policy "admin manage media" on storage.objects
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 10. SEED DATA
-- ============================================================================
insert into public.plans (slug,name,price,old_price,delivery_days,pages,features,is_popular,sort_order) values
('basic','Basic',2499,3999,3,1,
 '["Single page portfolio","Mobile + desktop responsive","About, skills, projects, contact","WhatsApp button","Free SSL + Vercel hosting setup","2 revision rounds"]'::jsonb,
 false,1),
('standard','Standard',4999,7499,4,4,
 '["4 pages (Home, About, Projects, Contact)","Custom colour theme","Working contact form","Resume download button","Basic SEO + Google indexing","Scroll animations","Unlimited demo revisions"]'::jsonb,
 true,2),
('pro','Pro',8999,12999,6,8,
 '["Up to 8 pages","Custom design from scratch","Blog or case-study section","Admin panel to edit content","Advanced SEO + analytics","Custom domain setup","1 year free small changes"]'::jsonb,
 false,3)
on conflict (slug) do nothing;

insert into public.addons (name,price,description,sort_order) values
('Extra page',699,'Ek additional page design + build',1),
('Custom domain setup',499,'Domain buy karne me help + DNS setup',2),
('Blog section',1499,'Blog list + post pages',3),
('Google Analytics',399,'Analytics + search console setup',4),
('Rush delivery',999,'48 ghante me demo',5)
on conflict do nothing;

insert into public.settings (key,value) values
('socials','{"instagram":"https://instagram.com/yourhandle","facebook":"https://facebook.com/yourpage","github":"https://github.com/yourhandle","linkedin":"https://linkedin.com/in/yourhandle"}'::jsonb),
('business','{"whatsapp":"919999999999","email":"hello@pixelforge.in","hours":"Mon-Sat, 10am-9pm IST"}'::jsonb),
('maintenance','{"enabled":false,"message":"We are updating the site. Back in a bit."}'::jsonb),
('theme','{"canvas":true,"animations":"full"}'::jsonb)
on conflict (key) do nothing;

-- ============================================================================
-- 11. TRACK ORDER — public ko poori leads table nahi dikhti (RLS blocks it).
--     Ye function tracking_id + email match hone par SIRF limited fields deta hai.
--     SECURITY DEFINER = RLS bypass karta hai, par sirf apna data return karta hai.
-- ============================================================================
create or replace function public.track_order(p_tracking_id text, p_email text)
returns table (
  tracking_id  text,
  status       text,
  demo_url     text,
  plan_name    text,
  total_amount integer,
  advance_paid boolean,
  final_paid   boolean,
  created_at   timestamptz
)
language sql security definer set search_path = public as $$
  select l.tracking_id, l.status, l.demo_url,
         coalesce(l.plan_snapshot->>'name', ''), l.total_amount,
         l.advance_paid, l.final_paid, l.created_at
  from public.leads l
  where l.tracking_id = p_tracking_id
    and lower(l.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ============================================================================
-- DONE. Ab admin user banayein:
--   Authentication → Users → Add user (email + password)
--   Phir: update public.profiles set role='admin' where email='aapka@email.com';
-- ============================================================================

-- ============================================================================
-- 11. EMAIL NOTIFICATIONS VIA PG_NET (WEBHOOK)
-- ============================================================================
create extension if not exists "pg_net";

create or replace function public.send_order_email()
returns trigger
language plpgsql security definer as $$
declare
  payload_admin jsonb;
  payload_client jsonb;
begin
  -- To Admin
  payload_admin := jsonb_build_object(
    'service_id', 'service_8ln5mu9',
    'template_id', 'template_ihpt477',
    'user_id', 'GIbeIviQo1ehc1gxX',
    'accessToken', 'kmRDWNELq0281Hffb-fDi',
    'template_params', jsonb_build_object(
      'tracking_id', NEW.tracking_id,
      'name', NEW.full_name,
      'email', NEW.email,
      'whatsapp', NEW.whatsapp,
      'plan', coalesce(NEW.plan_snapshot->>'name', ''),
      'total', NEW.total_amount,
      'advance', NEW.advance_amount,
      'final', NEW.final_amount,
      'details_text', row_to_json(NEW)::text
    )
  );

  perform net.http_post(
    url := 'https://api.emailjs.com/api/v1.0/email/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload_admin
  );

  -- To Client
  payload_client := jsonb_build_object(
    'service_id', 'service_8ln5mu9',
    'template_id', 'template_ihpt477',
    'user_id', 'GIbeIviQo1ehc1gxX',
    'accessToken', 'kmRDWNELq0281Hffb-fDi',
    'template_params', jsonb_build_object(
      'tracking_id', NEW.tracking_id,
      'name', NEW.full_name,
      'email', NEW.email,
      'whatsapp', NEW.whatsapp,
      'plan', coalesce(NEW.plan_snapshot->>'name', ''),
      'total', NEW.total_amount,
      'advance', NEW.advance_amount,
      'final', NEW.final_amount,
      'track_url', 'https://yourdomain.com/track.html?id=' || NEW.tracking_id
    )
  );

  perform net.http_post(
    url := 'https://api.emailjs.com/api/v1.0/email/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload_client
  );

  return NEW;
end;
$$;

drop trigger if exists send_order_email_trigger on public.leads;
create trigger send_order_email_trigger
after insert on public.leads
for each row execute function public.send_order_email();

