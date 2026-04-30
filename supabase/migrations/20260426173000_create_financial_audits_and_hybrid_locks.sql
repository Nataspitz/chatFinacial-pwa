create table if not exists public.financial_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month_ref date not null,
  audit_slice smallint not null,
  period_start date not null,
  period_end date not null,
  unlock_at date not null,
  status text not null default 'pending',
  certificate_bucket text null,
  certificate_path text null,
  certificate_mime_type text null,
  certificate_size_bytes bigint null,
  confirmed_at timestamptz null,
  confirmed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_audits_slice_check
    check (audit_slice in (1, 2, 3)),
  constraint financial_audits_status_check
    check (status in ('pending', 'confirmed')),
  constraint financial_audits_period_bounds_check
    check (period_start <= period_end),
  constraint financial_audits_month_ref_start_check
    check (month_ref = date_trunc('month', month_ref)::date),
  constraint financial_audits_mime_check
    check (certificate_mime_type is null or certificate_mime_type = 'application/json'),
  constraint financial_audits_confirmation_consistency_check
    check (
      (status = 'pending' and confirmed_at is null)
      or
      (status = 'confirmed' and confirmed_at is not null)
    ),
  constraint financial_audits_unlock_coherence_check
    check (
      (audit_slice = 1 and period_start = month_ref and period_end = month_ref + 9 and unlock_at = month_ref + 9)
      or
      (audit_slice = 2 and period_start = month_ref + 10 and period_end = month_ref + 19 and unlock_at = month_ref + 19)
      or
      (
        audit_slice = 3
        and period_start = month_ref + 20
        and period_end = (date_trunc('month', month_ref) + interval '1 month - 1 day')::date
        and unlock_at = (date_trunc('month', month_ref) + interval '1 month - 1 day')::date
      )
    )
);

create unique index if not exists financial_audits_user_month_slice_key
  on public.financial_audits (user_id, month_ref, audit_slice);

create index if not exists financial_audits_user_month_idx
  on public.financial_audits (user_id, month_ref);

create index if not exists financial_audits_user_status_month_idx
  on public.financial_audits (user_id, status, month_ref);

alter table public.financial_audits enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_audits'
      and policyname = 'financial_audits_select_own'
  ) then
    create policy financial_audits_select_own
      on public.financial_audits
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_audits'
      and policyname = 'financial_audits_insert_own'
  ) then
    create policy financial_audits_insert_own
      on public.financial_audits
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_audits'
      and policyname = 'financial_audits_update_own'
  ) then
    create policy financial_audits_update_own
      on public.financial_audits
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_audits'
      and policyname = 'financial_audits_delete_own'
  ) then
    create policy financial_audits_delete_own
      on public.financial_audits
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

create or replace function public.set_financial_audits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_financial_audits_updated_at on public.financial_audits;
create trigger trg_financial_audits_updated_at
before update on public.financial_audits
for each row
execute function public.set_financial_audits_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-audit-certificates',
  'financial-audit-certificates',
  false,
  5242880,
  array['application/json']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'financial_audit_objects_select_own'
  ) then
    create policy financial_audit_objects_select_own
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'financial-audit-certificates'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'financial_audit_objects_insert_own'
  ) then
    create policy financial_audit_objects_insert_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'financial-audit-certificates'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'financial_audit_objects_update_own'
  ) then
    create policy financial_audit_objects_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'financial-audit-certificates'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'financial-audit-certificates'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'financial_audit_objects_delete_own'
  ) then
    create policy financial_audit_objects_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'financial-audit-certificates'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end
$$;

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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  v_month_ref := date_trunc('month', coalesce(p_month, timezone('America/Sao_Paulo', now())::date))::date;
  v_last_day := (date_trunc('month', v_month_ref) + interval '1 month - 1 day')::date;

  insert into public.financial_audits (
    user_id,
    month_ref,
    audit_slice,
    period_start,
    period_end,
    unlock_at
  )
  values
    (v_user_id, v_month_ref, 1, v_month_ref, v_month_ref + 9, v_month_ref + 9),
    (v_user_id, v_month_ref, 2, v_month_ref + 10, v_month_ref + 19, v_month_ref + 19),
    (v_user_id, v_month_ref, 3, v_month_ref + 20, v_last_day, v_last_day)
  on conflict (user_id, month_ref, audit_slice) do nothing;

  return query
    select fa.*
    from public.financial_audits fa
    where fa.user_id = v_user_id
      and fa.month_ref = v_month_ref
    order by fa.audit_slice asc;
end;
$$;

create or replace function public.cleanup_previous_month_audit_files(
  p_current_month date
)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user_id uuid;
  v_current_month_ref date;
  v_previous_month_ref date;
  v_rows_cleared integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  v_current_month_ref := date_trunc('month', coalesce(p_current_month, timezone('America/Sao_Paulo', now())::date))::date;
  v_previous_month_ref := (v_current_month_ref - interval '1 month')::date;

  delete from storage.objects o
  using (
    select distinct
      fa.certificate_bucket as bucket_id,
      fa.certificate_path as object_name
    from public.financial_audits fa
    where fa.user_id = v_user_id
      and fa.month_ref = v_previous_month_ref
      and fa.status = 'confirmed'
      and fa.certificate_bucket is not null
      and fa.certificate_path is not null
  ) targets
  where o.bucket_id = targets.bucket_id
    and o.name = targets.object_name;

  update public.financial_audits
  set
    certificate_bucket = null,
    certificate_path = null,
    certificate_mime_type = null,
    certificate_size_bytes = null
  where user_id = v_user_id
    and month_ref = v_previous_month_ref
    and status = 'confirmed'
    and (
      certificate_bucket is not null
      or certificate_path is not null
      or certificate_mime_type is not null
      or certificate_size_bytes is not null
    );

  get diagnostics v_rows_cleared = row_count;
  return v_rows_cleared;
end;
$$;

create or replace function public.confirm_financial_audit_slice(
  p_month date,
  p_audit_slice smallint,
  p_certificate_bucket text,
  p_certificate_path text,
  p_certificate_mime_type text,
  p_certificate_size_bytes bigint
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

  v_month_ref := date_trunc('month', coalesce(p_month, timezone('America/Sao_Paulo', now())::date))::date;
  v_today := timezone('America/Sao_Paulo', now())::date;
  v_expected_path := v_user_id::text || '/' || to_char(v_month_ref, 'YYYY-MM') || '/slice-' || p_audit_slice::text || '.json';

  if p_certificate_path <> v_expected_path then
    raise exception 'Caminho de certificado invalido. Esperado: %', v_expected_path;
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

  update public.financial_audits
  set
    status = 'confirmed',
    certificate_bucket = p_certificate_bucket,
    certificate_path = p_certificate_path,
    certificate_mime_type = p_certificate_mime_type,
    certificate_size_bytes = p_certificate_size_bytes,
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

create or replace function public.is_financial_audit_period_locked_for_user(
  p_user_id uuid,
  p_date text
)
returns boolean
language plpgsql
stable
set search_path = public
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

  if v_normalized_date < v_current_month_start then
    return true;
  end if;

  if p_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.financial_audits fa
    where fa.user_id = p_user_id
      and fa.month_ref = v_current_month_start
      and fa.status = 'confirmed'
      and v_normalized_date between fa.period_start and fa.period_end
  );
end;
$$;

create or replace function public.is_financial_audit_period_locked(p_date text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  return public.is_financial_audit_period_locked_for_user(auth.uid(), p_date);
end;
$$;

create or replace function public.prevent_closed_financial_period_transaction_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and public.is_financial_audit_period_locked_for_user(new.user_id, new.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
  end if;

  if tg_op = 'UPDATE' and (
    public.is_financial_audit_period_locked_for_user(old.user_id, old.date::text)
    or public.is_financial_audit_period_locked_for_user(new.user_id, new.date::text)
  ) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
  end if;

  if tg_op = 'DELETE' and public.is_financial_audit_period_locked_for_user(old.user_id, old.date::text) then
    raise exception 'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior ou faixas auditadas nao podem ser criadas, editadas ou removidas.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_prevent_closed_financial_period_transaction_changes on public.transactions;
create trigger trg_prevent_closed_financial_period_transaction_changes
before insert or update or delete on public.transactions
for each row
execute function public.prevent_closed_financial_period_transaction_changes();
