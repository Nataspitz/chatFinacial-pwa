alter table public.financial_audits
drop constraint if exists financial_audits_unlock_coherence_check;

update public.financial_audits
set unlock_at =
  case audit_slice
    when 1 then month_ref + 10
    when 2 then month_ref + 20
    else (date_trunc('month', month_ref) + interval '1 month')::date
  end
where status = 'pending';

alter table public.financial_audits
add constraint financial_audits_unlock_coherence_check
check (
  (audit_slice = 1 and period_start = month_ref and period_end = month_ref + 9 and unlock_at = month_ref + 10)
  or
  (audit_slice = 2 and period_start = month_ref + 10 and period_end = month_ref + 19 and unlock_at = month_ref + 20)
  or
  (
    audit_slice = 3
    and period_start = month_ref + 20
    and period_end = (date_trunc('month', month_ref) + interval '1 month - 1 day')::date
    and unlock_at = (date_trunc('month', month_ref) + interval '1 month')::date
  )
);

create or replace function public.ensure_monthly_financial_audits(
  p_month date default timezone('America/Sao_Paulo', now())::date
)
returns setof public.financial_audits
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_month_ref date;
  v_last_day date;
  v_next_month date;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  v_month_ref := date_trunc('month', coalesce(p_month, timezone('America/Sao_Paulo', now())::date))::date;
  v_last_day := (date_trunc('month', v_month_ref) + interval '1 month - 1 day')::date;
  v_next_month := (date_trunc('month', v_month_ref) + interval '1 month')::date;

  insert into public.financial_audits (
    user_id,
    month_ref,
    audit_slice,
    period_start,
    period_end,
    unlock_at
  )
  values
    (v_user_id, v_month_ref, 1, v_month_ref, v_month_ref + 9, v_month_ref + 10),
    (v_user_id, v_month_ref, 2, v_month_ref + 10, v_month_ref + 19, v_month_ref + 20),
    (v_user_id, v_month_ref, 3, v_month_ref + 20, v_last_day, v_next_month)
  on conflict (user_id, month_ref, audit_slice) do nothing;

  return query
    select fa.*
    from public.financial_audits fa
    where fa.user_id = v_user_id
      and fa.month_ref = v_month_ref
    order by fa.audit_slice asc;
end;
$$;
