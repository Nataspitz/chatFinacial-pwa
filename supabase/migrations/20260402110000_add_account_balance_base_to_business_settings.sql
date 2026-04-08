alter table public.business_settings
  add column if not exists account_balance_base_amount numeric(14,2),
  add column if not exists account_balance_base_date date;

update public.business_settings
set account_balance_base_amount = coalesce(account_balance_base_amount, 0)
where account_balance_base_amount is null;

update public.business_settings
set account_balance_base_date = coalesce(account_balance_base_date, current_date)
where account_balance_base_date is null;

alter table public.business_settings
  alter column account_balance_base_amount set default 0,
  alter column account_balance_base_amount set not null,
  alter column account_balance_base_date set default current_date,
  alter column account_balance_base_date set not null;
