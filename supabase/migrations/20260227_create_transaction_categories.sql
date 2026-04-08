create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('entrada', 'saida')),
  name text not null check (char_length(trim(name)) > 0),
  name_normalized text generated always as (lower(trim(name))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transaction_categories_unique_user_type_name
  on public.transaction_categories (user_id, type, name_normalized);

create index if not exists transaction_categories_user_id_idx
  on public.transaction_categories (user_id);

alter table public.transaction_categories enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_categories'
      and policyname = 'transaction_categories_select_own'
  ) then
    create policy transaction_categories_select_own
      on public.transaction_categories
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_categories'
      and policyname = 'transaction_categories_insert_own'
  ) then
    create policy transaction_categories_insert_own
      on public.transaction_categories
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_categories'
      and policyname = 'transaction_categories_update_own'
  ) then
    create policy transaction_categories_update_own
      on public.transaction_categories
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transaction_categories'
      and policyname = 'transaction_categories_delete_own'
  ) then
    create policy transaction_categories_delete_own
      on public.transaction_categories
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.set_transaction_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_transaction_categories_updated_at on public.transaction_categories;
create trigger trg_transaction_categories_updated_at
before update on public.transaction_categories
for each row
execute function public.set_transaction_categories_updated_at();

create or replace function public.ensure_transaction_category(
  p_name text,
  p_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_category_id uuid;
  v_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  v_name := trim(p_name);
  if v_name is null or char_length(v_name) = 0 then
    raise exception 'Nome da categoria invalido';
  end if;

  if p_type not in ('entrada', 'saida') then
    raise exception 'Tipo invalido: %', p_type;
  end if;

  insert into public.transaction_categories (user_id, type, name)
  values (v_user_id, p_type, v_name)
  on conflict (user_id, type, name_normalized)
  do update set updated_at = now()
  returning id into v_category_id;

  return v_category_id;
end;
$$;

revoke all on function public.ensure_transaction_category(text, text) from public;
grant execute on function public.ensure_transaction_category(text, text) to authenticated;
