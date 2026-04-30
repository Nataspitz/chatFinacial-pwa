create or replace function public.refresh_financial_monthly_summaries_for_user(
  p_user_id uuid,
  p_year integer default extract(year from timezone('America/Sao_Paulo', now()))::integer
)
returns setof public.financial_monthly_summaries
language plpgsql
security definer
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
  v_user_id := p_user_id;
  if v_user_id is null then
    raise exception 'Usuario obrigatorio para atualizar resumo financeiro.';
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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  return query
    select *
    from public.refresh_financial_monthly_summaries_for_user(v_user_id, p_year);
end;
$$;

create or replace function public.refresh_financial_monthly_summaries_after_transaction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_start_year integer;
  v_end_year integer;
  v_current_year integer := extract(year from timezone('America/Sao_Paulo', now()))::integer;
  v_old_year integer := null;
  v_new_year integer := null;
  v_year integer;
begin
  if tg_op = 'INSERT' then
    v_user_id := new.user_id;
    v_new_year := extract(year from new.date::date)::integer;
  elsif tg_op = 'UPDATE' then
    v_user_id := coalesce(new.user_id, old.user_id);
    v_old_year := extract(year from old.date::date)::integer;
    v_new_year := extract(year from new.date::date)::integer;
  elsif tg_op = 'DELETE' then
    v_user_id := old.user_id;
    v_old_year := extract(year from old.date::date)::integer;
  end if;

  if v_user_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_start_year := least(coalesce(v_old_year, v_new_year, v_current_year), v_current_year);

  v_end_year := greatest(coalesce(v_old_year, v_new_year, v_current_year), v_current_year);

  for v_year in v_start_year..v_end_year loop
    perform public.refresh_financial_monthly_summaries_for_user(v_user_id, v_year);
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_refresh_financial_monthly_summaries_after_transaction_change on public.transactions;
create trigger trg_refresh_financial_monthly_summaries_after_transaction_change
after insert or update or delete on public.transactions
for each row
execute function public.refresh_financial_monthly_summaries_after_transaction_change();

revoke all on function public.refresh_financial_monthly_summaries_for_user(uuid, integer) from public;
revoke all on function public.refresh_financial_monthly_summaries_after_transaction_change() from public;
grant execute on function public.refresh_financial_monthly_summaries(integer) to authenticated;
