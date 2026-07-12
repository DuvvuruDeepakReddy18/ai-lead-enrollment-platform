-- EFOS LeadFlow Supabase schema
-- Run this once in Supabase SQL Editor before setting SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.leads (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null,
  city text not null,
  qualification text not null,
  source text not null,
  course_interest text not null,
  age integer not null check (age between 0 and 120),
  downloaded_brochure boolean not null default false,
  website_visits integer not null default 0 check (website_visits >= 0),
  status text not null default 'New' check (status in ('New', 'Contacted', 'Interested', 'Follow-Up', 'Qualified', 'Enrolled', 'Rejected')),
  score integer not null check (score between 0 and 100),
  temperature text not null check (temperature in ('Cold', 'Warm', 'Hot')),
  score_breakdown jsonb not null default '{}'::jsonb,
  counselor jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id text primary key,
  lead_id text not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'webhook')),
  provider text not null,
  status text not null,
  recipient text,
  provider_message_id text,
  detail text,
  message_preview text,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_score_idx on public.leads(score desc);
create index if not exists deliveries_lead_id_idx on public.deliveries(lead_id);
create index if not exists deliveries_created_at_idx on public.deliveries(created_at desc);

alter table public.leads enable row level security;
alter table public.deliveries enable row level security;

-- No browser policies are created here. The Express server uses SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS from the backend only. Never put that key in frontend code.
