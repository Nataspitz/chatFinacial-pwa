alter table public.business_settings
  add column if not exists account_balance_locked_at date;
