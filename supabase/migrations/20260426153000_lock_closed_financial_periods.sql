create or replace function public.is_financial_audit_period_locked(p_date text)
returns boolean
language plpgsql
stable
as $$
declare
  v_normalized_date date;
  v_current_month_start date;
begin
  if p_date is null then
    return false;
  end if;

  if left(p_date, 10) !~ '^\d{4}-\d{2}-\d{2}$' then
    return false;
  end if;

  v_normalized_date := left(p_date, 10)::date;
  v_current_month_start := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;

  return v_normalized_date < v_current_month_start;
end;
$$;

create or replace function public.prevent_closed_financial_period_transaction_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and public.is_financial_audit_period_locked(new.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior nao podem ser criadas, editadas ou removidas.';
  end if;

  if tg_op = 'UPDATE' and (
    public.is_financial_audit_period_locked(old.date::text)
    or public.is_financial_audit_period_locked(new.date::text)
  ) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior nao podem ser criadas, editadas ou removidas.';
  end if;

  if tg_op = 'DELETE' and public.is_financial_audit_period_locked(old.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior nao podem ser criadas, editadas ou removidas.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_prevent_closed_financial_period_transaction_changes on public.transactions;
create trigger trg_prevent_closed_financial_period_transaction_changes
before insert or update or delete on public.transactions
for each row
execute function public.prevent_closed_financial_period_transaction_changes();
