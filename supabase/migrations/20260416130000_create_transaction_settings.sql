create table if not exists public.transaction_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  default_payment_method_entrada text not null default 'pix' check (default_payment_method_entrada in ('credito', 'debito', 'pix', 'dinheiro')),
  default_payment_method_saida text not null default 'pix' check (default_payment_method_saida in ('credito', 'debito', 'pix', 'dinheiro')),
  default_confirmed_entrada boolean not null default true,
  default_confirmed_saida boolean not null default true,
  default_monthly_cost_saida boolean not null default false,
  enforce_consistency boolean not null default true,
  allow_credit_without_installments boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transaction_settings_user_id_key
  on public.transaction_settings (user_id);

alter table public.transaction_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_settings'
      and policyname = 'transaction_settings_select_own'
  ) then
    create policy transaction_settings_select_own
      on public.transaction_settings
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_settings'
      and policyname = 'transaction_settings_insert_own'
  ) then
    create policy transaction_settings_insert_own
      on public.transaction_settings
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_settings'
      and policyname = 'transaction_settings_update_own'
  ) then
    create policy transaction_settings_update_own
      on public.transaction_settings
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.set_transaction_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_transaction_settings_updated_at on public.transaction_settings;
create trigger trg_transaction_settings_updated_at
before update on public.transaction_settings
for each row
execute function public.set_transaction_settings_updated_at();
