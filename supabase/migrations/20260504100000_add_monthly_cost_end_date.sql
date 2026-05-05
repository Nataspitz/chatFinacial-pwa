alter table public.transactions
add column if not exists monthly_end_date date default null;

alter table public.transactions
  drop constraint if exists transactions_monthly_end_date_check,
  add constraint transactions_monthly_end_date_check
    check (
      monthly_end_date is null
      or (
        type = 'saida'
        and is_monthly_cost = true
        and monthly_end_date >= date::date
      )
    );

create or replace function public.prevent_closed_financial_period_transaction_changes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_current_month_start date := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_locked_monthly_end_floor date;
begin
  if tg_op = 'INSERT' and public.is_financial_audit_period_locked_for_user(new.user_id, new.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
  end if;

  if tg_op = 'UPDATE' and (
    public.is_financial_audit_period_locked_for_user(old.user_id, old.date::text)
    or public.is_financial_audit_period_locked_for_user(new.user_id, new.date::text)
  ) then
    select greatest(
      v_current_month_start - 1,
      coalesce(max(fa.period_end), v_current_month_start - 1)
    )
    into v_locked_monthly_end_floor
    from public.financial_audits fa
    where fa.user_id = old.user_id
      and fa.month_ref = v_current_month_start
      and fa.status = 'confirmed';

    if not (
      old.type = 'saida'
      and old.is_monthly_cost = true
      and new.type = old.type
      and new.category = old.category
      and new.amount = old.amount
      and new.description = old.description
      and new.date = old.date
      and new.user_id = old.user_id
      and new.is_confirmed = old.is_confirmed
      and new.is_monthly_cost = old.is_monthly_cost
      and new.payment_method = old.payment_method
      and new.installment_group_id is not distinct from old.installment_group_id
      and new.installment_number = old.installment_number
      and new.installment_count = old.installment_count
      and new.total_amount = old.total_amount
      and new.is_installment = old.is_installment
      and new.deleted_at is not distinct from old.deleted_at
      and new.monthly_end_date is distinct from old.monthly_end_date
      and new.monthly_end_date >= old.date::date
      and new.monthly_end_date >= v_locked_monthly_end_floor
    ) then
      raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
    end if;
  end if;

  if tg_op = 'DELETE' and public.is_financial_audit_period_locked_for_user(old.user_id, old.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
  end if;

  return coalesce(new, old);
end;
$$;

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
      and (t.monthly_end_date is null or occurrence.occurrence_date <= t.monthly_end_date)
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
