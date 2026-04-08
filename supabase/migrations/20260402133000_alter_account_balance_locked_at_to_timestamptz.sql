do $$
declare
  v_data_type text;
begin
  select c.data_type
    into v_data_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'business_settings'
    and c.column_name = 'account_balance_locked_at';

  if v_data_type = 'date' then
    alter table public.business_settings
      alter column account_balance_locked_at type timestamptz
      using account_balance_locked_at::timestamptz;
  end if;
end
$$;
