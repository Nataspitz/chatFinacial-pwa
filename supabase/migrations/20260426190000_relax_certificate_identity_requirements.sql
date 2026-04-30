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

  if v_payload_unlock_at is null or v_payload_unlock_at <> v_target.unlock_at then
    raise exception 'Campo unlock_at invalido no certificado.';
  end if;

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
