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
