alter table public.transactions
  add column if not exists is_confirmed boolean;

do $$
declare
  v_date_type text;
begin
  select c.data_type
    into v_date_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'transactions'
    and c.column_name = 'date';

  if v_date_type in ('date', 'timestamp without time zone', 'timestamp with time zone') then
    execute $sql$
      update public.transactions
      set is_confirmed = case
        when date::date > current_date then false
        else true
      end
      where is_confirmed is null
    $sql$;
  else
    execute $sql$
      update public.transactions
      set is_confirmed = case
        when date::text ~ '^\d{4}-\d{2}-\d{2}$' and to_date(date::text, 'YYYY-MM-DD') > current_date then false
        else true
      end
      where is_confirmed is null
    $sql$;
  end if;
end
$$;

alter table public.transactions
  alter column is_confirmed set default false,
  alter column is_confirmed set not null;

create index if not exists transactions_is_confirmed_idx
  on public.transactions (user_id, is_confirmed, date);
