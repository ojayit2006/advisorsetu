-- MIA Wealth — Supabase schema
-- Domain: Financial Twin for a bank/RM wealth-management demo.
-- Pattern (RLS/audit/realtime) reused from kumbhsaathi-shared/supabase-schema.sql.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ── Core entities ────────────────────────────────────────────────────────────

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dob date,
  risk_profile text not null default 'moderate' check (risk_profile in ('conservative', 'moderate', 'aggressive')),
  monthly_income_est numeric,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  institution text not null,
  source text not null default 'aa' check (source in ('idbi', 'aa')),
  type text not null check (type in ('savings', 'current', 'fixed_deposit', 'mutual_fund', 'equity', 'insurance', 'credit_card', 'loan')),
  balance numeric not null default 0,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  asset_class text not null check (asset_class in ('equity', 'debt', 'hybrid', 'gold', 'real_estate', 'cash', 'insurance')),
  name text not null,
  units numeric,
  value numeric not null,
  as_of date not null default current_date
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  ts timestamptz not null,
  amount numeric not null,
  direction text not null check (direction in ('credit', 'debit')),
  category text not null,
  merchant text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  target_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  funded_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  type text not null check (type in ('invest', 'rebalance', 'protect', 'save', 'alert', 'opportunity')),
  title text not null,
  body text not null,
  action_payload jsonb not null default '{}'::jsonb,
  suitability_tag text not null default 'suitable' check (suitability_tag in ('suitable', 'needs_review', 'not_suitable')),
  rationale jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'viewed', 'accepted', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists twin_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  as_of timestamptz not null default now(),
  net_worth numeric not null,
  investable_surplus numeric not null,
  health_score numeric not null,
  cashflow_forecast jsonb not null default '[]'::jsonb,
  goal_probabilities jsonb not null default '[]'::jsonb
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  aa_handle text not null,
  fip_list jsonb not null default '[]'::jsonb,
  scope text not null default 'profile,summary,transactions',
  status text not null default 'active' check (status in ('pending', 'active', 'revoked', 'expired')),
  expiry timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists product_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('mutual_fund', 'equity', 'debt_fund', 'insurance', 'fixed_deposit', 'gold_bond')),
  risk_level text not null check (risk_level in ('low', 'moderate', 'high')),
  min_amount numeric not null default 500,
  expected_return numeric,
  doc_ref text,
  embedding vector(1536)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text not null,
  entity_type text not null,
  entity_id text,
  pii_accessed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_customer_ts on transactions(customer_id, ts desc);
create index if not exists idx_transactions_category on transactions(category);
create index if not exists idx_recommendations_customer on recommendations(customer_id, created_at desc);
create index if not exists idx_twin_snapshots_customer on twin_snapshots(customer_id, as_of desc);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);

-- ── Audit RPC (reused pattern) ───────────────────────────────────────────────

create or replace function create_audit_log(
  p_actor text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_pii_accessed boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into audit_logs(actor, action, entity_type, entity_id, pii_accessed, metadata)
  values (p_actor, p_action, p_entity_type, p_entity_id, p_pii_accessed, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Row level security (demo-open policies, same posture as kumbhsaathi) ─────

alter table customers enable row level security;
alter table accounts enable row level security;
alter table holdings enable row level security;
alter table transactions enable row level security;
alter table goals enable row level security;
alter table recommendations enable row level security;
alter table twin_snapshots enable row level security;
alter table consents enable row level security;
alter table product_catalog enable row level security;
alter table audit_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'accounts', 'holdings', 'transactions', 'goals',
    'recommendations', 'twin_snapshots', 'consents', 'product_catalog', 'audit_logs'
  ]
  loop
    execute format('drop policy if exists "demo_read_%1$s" on %1$I', t);
    execute format('drop policy if exists "demo_insert_%1$s" on %1$I', t);
    execute format('drop policy if exists "demo_update_%1$s" on %1$I', t);
    execute format('create policy "demo_read_%1$s" on %1$I for select to anon, authenticated using (true)', t);
    execute format('create policy "demo_insert_%1$s" on %1$I for insert to anon, authenticated with check (true)', t);
    execute format('create policy "demo_update_%1$s" on %1$I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- ── Realtime (web console recommendation feed + audit trail) ────────────────

do $$
begin
  alter publication supabase_realtime add table recommendations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table audit_logs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table twin_snapshots;
exception when duplicate_object then null;
end $$;
