create table if not exists public.financial_monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month_ref date not null,
  total_entries numeric(14,2) not null default 0,
  total_outcomes numeric(14,2) not null default 0,
  result_balance numeric(14,2) generated always as (total_entries - total_outcomes) stored,
  account_balance numeric(14,2) not null default 0,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_monthly_summaries_month_ref_start_check
    check (month_ref = date_trunc('month', month_ref)::date),
  constraint financial_monthly_summaries_entries_check
    check (total_entries >= 0),
  constraint financial_monthly_summaries_outcomes_check
    check (total_outcomes >= 0)
);

create unique index if not exists financial_monthly_summaries_user_month_key
  on public.financial_monthly_summaries (user_id, month_ref);

create index if not exists financial_monthly_summaries_user_month_idx
  on public.financial_monthly_summaries (user_id, month_ref desc);

alter table public.financial_monthly_summaries enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_monthly_summaries'
      and policyname = 'financial_monthly_summaries_select_own'
  ) then
    create policy financial_monthly_summaries_select_own
      on public.financial_monthly_summaries
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_monthly_summaries'
      and policyname = 'financial_monthly_summaries_insert_own'
  ) then
    create policy financial_monthly_summaries_insert_own
      on public.financial_monthly_summaries
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_monthly_summaries'
      and policyname = 'financial_monthly_summaries_update_own'
  ) then
    create policy financial_monthly_summaries_update_own
      on public.financial_monthly_summaries
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_monthly_summaries'
      and policyname = 'financial_monthly_summaries_delete_own'
  ) then
    create policy financial_monthly_summaries_delete_own
      on public.financial_monthly_summaries
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.set_financial_monthly_summaries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_financial_monthly_summaries_updated_at on public.financial_monthly_summaries;
create trigger trg_financial_monthly_summaries_updated_at
before update on public.financial_monthly_summaries
for each row
execute function public.set_financial_monthly_summaries_updated_at();

create or replace function public.calculate_financial_period_totals_for_user(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table(total_entries numeric, total_outcomes numeric)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select
      p_start_date as start_date,
      least(p_end_date, timezone('America/Sao_Paulo', now())::date) as end_date
  ),
  direct_transactions as (
    select
      t.type,
      t.amount::numeric as amount
    from public.transactions t
    cross join bounds b
    where t.user_id = p_user_id
      and coalesce(t.deleted_at, null) is null
      and t.is_confirmed = true
      and not (t.type = 'saida' and t.is_monthly_cost = true)
      and t.date::date between b.start_date and b.end_date
  ),
  recurring_months as (
    select generate_series(
      date_trunc('month', b.start_date)::date,
      date_trunc('month', b.end_date)::date,
      interval '1 month'
    )::date as month_ref,
    b.start_date,
    b.end_date
    from bounds b
    where b.start_date <= b.end_date
  ),
  recurring_transactions as (
    select
      'saida'::text as type,
      t.amount::numeric as amount
    from public.transactions t
    join recurring_months rm
      on t.date::date <= (date_trunc('month', rm.month_ref) + interval '1 month - 1 day')::date
    cross join lateral (
      select make_date(
        extract(year from rm.month_ref)::integer,
        extract(month from rm.month_ref)::integer,
        least(
          extract(day from t.date::date)::integer,
          extract(day from (date_trunc('month', rm.month_ref) + interval '1 month - 1 day')::date)::integer
        )
      ) as occurrence_date
    ) occurrence
    where t.user_id = p_user_id
      and coalesce(t.deleted_at, null) is null
      and t.is_confirmed = true
      and t.type = 'saida'
      and t.is_monthly_cost = true
      and occurrence.occurrence_date between rm.start_date and rm.end_date
  ),
  all_transactions as (
    select * from direct_transactions
    union all
    select * from recurring_transactions
  )
  select
    coalesce(sum(amount) filter (where type = 'entrada'), 0)::numeric(14,2) as total_entries,
    coalesce(sum(amount) filter (where type = 'saida'), 0)::numeric(14,2) as total_outcomes
  from all_transactions;
$$;

create or replace function public.refresh_financial_monthly_summaries(
  p_year integer default extract(year from timezone('America/Sao_Paulo', now()))::integer
)
returns setof public.financial_monthly_summaries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_year integer;
  v_year_start date;
  v_month_ref date;
  v_month_end date;
  v_previous_month date;
  v_base_amount numeric(14,2) := 0;
  v_base_date date := null;
  v_first_confirmed_date date := null;
  v_running_balance numeric(14,2) := 0;
  v_entries numeric(14,2) := 0;
  v_outcomes numeric(14,2) := 0;
  v_month_offset integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  v_year := coalesce(p_year, extract(year from timezone('America/Sao_Paulo', now()))::integer);
  if v_year < 1900 or v_year > 2200 then
    raise exception 'Ano invalido: %', v_year;
  end if;

  v_year_start := make_date(v_year, 1, 1);
  v_previous_month := (v_year_start - interval '1 month')::date;

  select fms.account_balance
  into v_running_balance
  from public.financial_monthly_summaries fms
  where fms.user_id = v_user_id
    and fms.month_ref = date_trunc('month', v_previous_month)::date
  limit 1;

  if v_running_balance is null then
    select
      coalesce(bs.account_balance_base_amount, 0)::numeric(14,2),
      coalesce(bs.account_balance_base_date, v_year_start)::date
    into v_base_amount, v_base_date
    from public.business_settings bs
    where bs.company_id = v_user_id
    limit 1;

    v_base_amount := coalesce(v_base_amount, 0);
    v_base_date := coalesce(v_base_date, v_year_start);

    select min(t.date::date)
    into v_first_confirmed_date
    from public.transactions t
    where t.user_id = v_user_id
      and coalesce(t.deleted_at, null) is null
      and t.is_confirmed = true;

    if v_base_amount = 0
      and v_first_confirmed_date is not null
      and v_base_date > v_first_confirmed_date
    then
      v_base_date := v_first_confirmed_date;
    end if;

    v_running_balance := v_base_amount;

    if v_base_date < v_year_start then
      select totals.total_entries, totals.total_outcomes
      into v_entries, v_outcomes
      from public.calculate_financial_period_totals_for_user(
        v_user_id,
        v_base_date,
        (v_year_start - interval '1 day')::date
      ) totals;

      v_running_balance := v_running_balance + coalesce(v_entries, 0) - coalesce(v_outcomes, 0);
    end if;
  end if;

  for v_month_offset in 0..11 loop
    v_month_ref := (v_year_start + make_interval(months => v_month_offset))::date;
    v_month_end := (date_trunc('month', v_month_ref) + interval '1 month - 1 day')::date;

    select totals.total_entries, totals.total_outcomes
    into v_entries, v_outcomes
    from public.calculate_financial_period_totals_for_user(v_user_id, v_month_ref, v_month_end) totals;

    v_entries := coalesce(v_entries, 0);
    v_outcomes := coalesce(v_outcomes, 0);
    v_running_balance := v_running_balance + v_entries - v_outcomes;

    insert into public.financial_monthly_summaries (
      user_id,
      month_ref,
      total_entries,
      total_outcomes,
      account_balance,
      calculated_at
    )
    values (
      v_user_id,
      v_month_ref,
      v_entries,
      v_outcomes,
      v_running_balance,
      now()
    )
    on conflict (user_id, month_ref) do update
    set
      total_entries = excluded.total_entries,
      total_outcomes = excluded.total_outcomes,
      account_balance = excluded.account_balance,
      calculated_at = excluded.calculated_at;
  end loop;

  return query
    select fms.*
    from public.financial_monthly_summaries fms
    where fms.user_id = v_user_id
      and fms.month_ref between v_year_start and make_date(v_year, 12, 1)
    order by fms.month_ref asc;
end;
$$;

create or replace function public.get_financial_monthly_summaries_year(
  p_year integer default extract(year from timezone('America/Sao_Paulo', now()))::integer
)
returns setof public.financial_monthly_summaries
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
    select *
    from public.refresh_financial_monthly_summaries(p_year);
end;
$$;

revoke all on function public.calculate_financial_period_totals_for_user(uuid, date, date) from public;
revoke all on function public.refresh_financial_monthly_summaries(integer) from public;
revoke all on function public.get_financial_monthly_summaries_year(integer) from public;

grant execute on function public.refresh_financial_monthly_summaries(integer) to authenticated;
grant execute on function public.get_financial_monthly_summaries_year(integer) to authenticated;
grant execute on function public.calculate_financial_period_totals_for_user(uuid, date, date) to authenticated;
