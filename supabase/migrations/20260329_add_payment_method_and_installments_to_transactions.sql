create or replace function public.set_transactions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter table public.transactions
  add column if not exists payment_method text,
  add column if not exists installment_group_id uuid,
  add column if not exists installment_number integer,
  add column if not exists installment_count integer,
  add column if not exists total_amount numeric(14,2),
  add column if not exists is_installment boolean not null default false,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.transactions
set payment_method = coalesce(payment_method, 'pix')
where payment_method is null;

update public.transactions
set installment_number = coalesce(installment_number, 1)
where installment_number is null;

update public.transactions
set installment_count = coalesce(installment_count, 1)
where installment_count is null;

update public.transactions
set total_amount = coalesce(total_amount, amount)
where total_amount is null;

update public.transactions
set is_installment = coalesce(is_installment, false)
where is_installment is distinct from coalesce(is_installment, false);

alter table public.transactions
  alter column payment_method set default 'pix',
  alter column payment_method set not null,
  alter column installment_number set default 1,
  alter column installment_number set not null,
  alter column installment_count set default 1,
  alter column installment_count set not null,
  alter column total_amount set not null;

alter table public.transactions
  drop constraint if exists transactions_payment_method_check,
  drop constraint if exists transactions_installment_number_check,
  drop constraint if exists transactions_installment_count_check,
  drop constraint if exists transactions_installment_sequence_check,
  drop constraint if exists transactions_total_amount_check,
  drop constraint if exists transactions_installment_group_required_check;

alter table public.transactions
  add constraint transactions_payment_method_check
    check (payment_method in ('credito', 'debito', 'pix', 'dinheiro')),
  add constraint transactions_installment_number_check
    check (installment_number >= 1),
  add constraint transactions_installment_count_check
    check (installment_count >= 1),
  add constraint transactions_installment_sequence_check
    check (installment_number <= installment_count),
  add constraint transactions_total_amount_check
    check (total_amount >= amount),
  add constraint transactions_installment_group_required_check
    check (
      (installment_count = 1 and installment_group_id is null and is_installment = false)
      or
      (installment_count > 1 and installment_group_id is not null and is_installment = true)
    );

create index if not exists transactions_payment_method_idx
  on public.transactions (user_id, payment_method);

create index if not exists transactions_installment_group_idx
  on public.transactions (installment_group_id, installment_number);

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row
execute function public.set_transactions_updated_at();
