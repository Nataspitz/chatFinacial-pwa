create or replace function public.prevent_closed_financial_period_transaction_changes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_current_month_start date := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_locked_monthly_end_floor date;
  v_is_locked_update boolean := false;
  v_is_confirmation_only_update boolean := false;
begin
  if tg_op = 'INSERT' and public.is_financial_audit_period_locked_for_user(new.user_id, new.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
  end if;

  if tg_op = 'UPDATE' then
    v_is_locked_update :=
      public.is_financial_audit_period_locked_for_user(old.user_id, old.date::text)
      or public.is_financial_audit_period_locked_for_user(new.user_id, new.date::text);

    if v_is_locked_update then
      v_is_confirmation_only_update :=
        old.is_confirmed = false
        and new.is_confirmed = true
        and new.confirmed_at is not null
        and (to_jsonb(new) - array['is_confirmed', 'confirmed_at', 'updated_at'])
          = (to_jsonb(old) - array['is_confirmed', 'confirmed_at', 'updated_at']);

      if v_is_confirmation_only_update then
        return new;
      end if;

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
  end if;

  if tg_op = 'DELETE' and public.is_financial_audit_period_locked_for_user(old.user_id, old.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
  end if;

  return coalesce(new, old);
end;
$$;

update public.transactions t
set
  is_confirmed = true,
  confirmed_at = coalesce(t.confirmed_at, now())
from public.financial_audits fa
where fa.user_id = t.user_id
  and fa.status = 'confirmed'
  and t.date::date between fa.period_start and fa.period_end
  and t.is_confirmed = false
  and coalesce(t.deleted_at, null) is null;

create or replace function public.confirm_financial_audit_slice(
  p_month date,
  p_audit_slice smallint,
  p_certificate_bucket text,
  p_certificate_path text,
  p_certificate_mime_type text,
  p_certificate_size_bytes bigint,
  p_certificate_payload jsonb
)
returns public.financial_audits
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_month_ref date;
  v_today date;
  v_expected_path text;
  v_confirmed_before integer := 0;
  v_target public.financial_audits%rowtype;
  v_payload_version integer;
  v_payload_assertion_id text;
  v_payload_month_ref date;
  v_payload_audit_slice integer;
  v_payload_period_start date;
  v_payload_period_end date;
  v_payload_unlock_at date;
  v_payload_verdict text;
  v_payload_generated_at timestamptz;
  v_payload_agent_id text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_audit_slice not in (1, 2, 3) then
    raise exception 'Faixa de auditoria invalida: %', p_audit_slice;
  end if;

  if p_certificate_bucket is null or btrim(p_certificate_bucket) = '' then
    raise exception 'Bucket do certificado e obrigatorio.';
  end if;

  if p_certificate_path is null or btrim(p_certificate_path) = '' then
    raise exception 'Caminho do certificado e obrigatorio.';
  end if;

  if p_certificate_mime_type <> 'application/json' then
    raise exception 'Tipo de certificado invalido. Apenas application/json e aceito.';
  end if;

  if coalesce(p_certificate_size_bytes, 0) <= 0 then
    raise exception 'Tamanho do certificado invalido.';
  end if;

  if p_certificate_bucket <> 'financial-audit-certificates' then
    raise exception 'Bucket de certificado invalido.';
  end if;

  if p_certificate_payload is null or jsonb_typeof(p_certificate_payload) <> 'object' then
    raise exception 'Payload do certificado invalido.';
  end if;

  v_month_ref := date_trunc('month', coalesce(p_month, timezone('America/Sao_Paulo', now())::date))::date;
  v_today := timezone('America/Sao_Paulo', now())::date;
  v_expected_path := v_user_id::text || '/' || to_char(v_month_ref, 'YYYY-MM') || '/slice-' || p_audit_slice::text || '.json';

  if p_certificate_path <> v_expected_path then
    raise exception 'Caminho de certificado invalido. Esperado: %', v_expected_path;
  end if;

  v_payload_version := nullif(p_certificate_payload->>'version', '')::integer;
  v_payload_assertion_id := nullif(p_certificate_payload->>'assertion_id', '');
  v_payload_month_ref := nullif(p_certificate_payload->>'month_ref', '')::date;
  v_payload_audit_slice := nullif(p_certificate_payload->>'audit_slice', '')::integer;
  v_payload_period_start := nullif(p_certificate_payload->>'period_start', '')::date;
  v_payload_period_end := nullif(p_certificate_payload->>'period_end', '')::date;
  v_payload_unlock_at := nullif(p_certificate_payload->>'unlock_at', '')::date;
  v_payload_verdict := nullif(p_certificate_payload->>'verdict', '');
  v_payload_generated_at := nullif(p_certificate_payload->>'generated_at', '')::timestamptz;
  v_payload_agent_id := nullif(p_certificate_payload->>'agent_id', '');

  if v_payload_version is distinct from 1 then
    raise exception 'Campo version invalido no certificado.';
  end if;

  if v_payload_month_ref is null or v_payload_month_ref <> v_month_ref then
    raise exception 'Campo month_ref invalido no certificado.';
  end if;

  if v_payload_audit_slice is null or v_payload_audit_slice <> p_audit_slice then
    raise exception 'Campo audit_slice invalido no certificado.';
  end if;

  if v_payload_verdict is null or v_payload_verdict <> 'approved' then
    raise exception 'Campo verdict invalido no certificado. Esperado: approved.';
  end if;

  if v_payload_generated_at is null then
    raise exception 'Campo generated_at e obrigatorio no certificado.';
  end if;

  perform public.ensure_monthly_financial_audits(v_month_ref);

  select count(*)
  into v_confirmed_before
  from public.financial_audits fa
  where fa.user_id = v_user_id
    and fa.month_ref = v_month_ref
    and fa.status = 'confirmed';

  select fa.*
  into v_target
  from public.financial_audits fa
  where fa.user_id = v_user_id
    and fa.month_ref = v_month_ref
    and fa.audit_slice = p_audit_slice
  for update;

  if not found then
    raise exception 'Faixa de auditoria nao encontrada.';
  end if;

  if v_target.status = 'confirmed' then
    raise exception 'Esta faixa de auditoria ja foi confirmada.';
  end if;

  if v_today < v_target.unlock_at then
    raise exception 'Esta auditoria so pode ser confirmada a partir de %.', v_target.unlock_at;
  end if;

  if v_payload_period_start is null or v_payload_period_start <> v_target.period_start then
    raise exception 'Campo period_start invalido no certificado.';
  end if;

  if v_payload_period_end is null or v_payload_period_end <> v_target.period_end then
    raise exception 'Campo period_end invalido no certificado.';
  end if;

  if v_payload_unlock_at is null or (v_payload_unlock_at <> v_target.unlock_at and v_payload_unlock_at <> v_target.period_end) then
    raise exception 'Campo unlock_at invalido no certificado.';
  end if;

  update public.transactions t
  set
    is_confirmed = true,
    confirmed_at = coalesce(t.confirmed_at, now())
  where t.user_id = v_user_id
    and t.date::date between v_target.period_start and v_target.period_end
    and t.is_confirmed = false
    and coalesce(t.deleted_at, null) is null;

  update public.financial_audits
  set
    status = 'confirmed',
    certificate_bucket = p_certificate_bucket,
    certificate_path = p_certificate_path,
    certificate_mime_type = p_certificate_mime_type,
    certificate_size_bytes = p_certificate_size_bytes,
    certificate_assertion_id = v_payload_assertion_id,
    certificate_generated_at = v_payload_generated_at,
    certificate_verdict = v_payload_verdict,
    certificate_agent_id = v_payload_agent_id,
    confirmed_at = now(),
    confirmed_by = v_user_id
  where id = v_target.id
  returning *
  into v_target;

  if v_confirmed_before = 0 then
    perform public.cleanup_previous_month_audit_files(v_month_ref);
  end if;

  return v_target;
end;
$$;
