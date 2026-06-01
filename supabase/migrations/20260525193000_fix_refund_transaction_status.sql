alter table public.transactions
  add column if not exists status text default 'active',
  add column if not exists ignored_in_reports boolean not null default false,
  add column if not exists refunded_at timestamptz null,
  add column if not exists refund_reason text null,
  add column if not exists refund_scope text null,
  add column if not exists canceled_at timestamptz null,
  add column if not exists cancel_reason text null;

alter table public.transactions
  drop constraint if exists transactions_status_check;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'trg_prevent_closed_financial_period_transaction_changes'
  ) then
    alter table public.transactions disable trigger trg_prevent_closed_financial_period_transaction_changes;
  end if;
end $$;

update public.transactions
set status = case lower(coalesce(status, 'active'))
  when 'active' then 'active'
  when 'confirmed' then 'confirmed'
  when 'scheduled' then 'scheduled'
  when 'reimbursed' then 'refunded'
  when 'refunded' then 'refunded'
  when 'canceled' then 'canceled'
  else 'active'
end
where status is null
  or status <> case lower(coalesce(status, 'active'))
    when 'active' then 'active'
    when 'confirmed' then 'confirmed'
    when 'scheduled' then 'scheduled'
    when 'reimbursed' then 'refunded'
    when 'refunded' then 'refunded'
    when 'canceled' then 'canceled'
    else 'active'
  end;

update public.transactions
set ignored_in_reports = true
where lower(coalesce(status, 'active')) in ('refunded', 'canceled', 'reimbursed');

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'trg_prevent_closed_financial_period_transaction_changes'
  ) then
    alter table public.transactions enable trigger trg_prevent_closed_financial_period_transaction_changes;
  end if;
end $$;

alter table public.transactions
  alter column status set default 'active';

alter table public.transactions
  drop constraint if exists transactions_status_check,
  add constraint transactions_status_check
    check (status in ('active', 'confirmed', 'scheduled', 'refunded', 'canceled'));

alter table public.transactions
  drop constraint if exists transactions_refund_scope_check,
  add constraint transactions_refund_scope_check
    check (refund_scope is null or refund_scope in ('single', 'future', 'group'));

create index if not exists transactions_user_status_idx
  on public.transactions (user_id, status);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date);

create index if not exists transactions_installment_group_id_idx
  on public.transactions (installment_group_id);

create or replace function public.calculate_financial_period_totals_for_user(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  total_entries numeric,
  total_outcomes numeric
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select
      p_start_date as start_date,
      p_end_date as end_date,
      timezone('America/Sao_Paulo', now())::date as today
  ),
  direct_transactions as (
    select
      t.type,
      t.amount::numeric as amount
    from public.transactions t
    cross join bounds b
    where t.user_id = p_user_id
      and coalesce(t.deleted_at, null) is null
      and coalesce(t.ignored_in_reports, false) = false
      and lower(coalesce(t.status, 'active')) not in ('refunded', 'canceled', 'reimbursed')
      and not (t.type = 'saida' and t.is_monthly_cost = true)
      and t.date::date between b.start_date and b.end_date
      and (t.date::date <= b.today or t.is_confirmed = true)
  ),
  recurring_months as (
    select generate_series(
      date_trunc('month', b.start_date)::date,
      date_trunc('month', b.end_date)::date,
      interval '1 month'
    )::date as month_ref,
    b.start_date,
    b.end_date,
    b.today
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
      and coalesce(t.ignored_in_reports, false) = false
      and lower(coalesce(t.status, 'active')) not in ('refunded', 'canceled', 'reimbursed')
      and t.type = 'saida'
      and t.is_monthly_cost = true
      and t.is_confirmed = true
      and (t.monthly_end_date is null or occurrence.occurrence_date <= t.monthly_end_date)
      and occurrence.occurrence_date between rm.start_date and rm.end_date
      and (
        occurrence.occurrence_date <= rm.today
        or occurrence.occurrence_date = t.date::date
      )
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
