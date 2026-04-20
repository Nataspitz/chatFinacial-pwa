create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  target_amount numeric(14, 2) not null check (target_amount >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'deleted')),
  is_system boolean not null default false,
  system_key text null check (system_key is null or char_length(trim(system_key)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_system_consistency_check check (
    (is_system = true and system_key is not null)
    or (is_system = false and system_key is null)
  )
);

create unique index if not exists goals_unique_user_system_key
  on public.goals (user_id, system_key);

create index if not exists goals_user_status_idx
  on public.goals (user_id, status);

create index if not exists goals_user_created_at_idx
  on public.goals (user_id, created_at desc);

alter table public.goals enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'goals'
      and policyname = 'goals_select_own'
  ) then
    create policy goals_select_own
      on public.goals
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'goals'
      and policyname = 'goals_insert_own'
  ) then
    create policy goals_insert_own
      on public.goals
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'goals'
      and policyname = 'goals_update_own'
  ) then
    create policy goals_update_own
      on public.goals
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'goals'
      and policyname = 'goals_delete_own'
  ) then
    create policy goals_delete_own
      on public.goals
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.set_goals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
before update on public.goals
for each row
execute function public.set_goals_updated_at();

