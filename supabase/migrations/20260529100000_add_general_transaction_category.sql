do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'trg_prevent_closed_financial_period_transaction_changes'
  ) then
    alter table public.transactions disable trigger trg_prevent_closed_financial_period_transaction_changes;
  end if;
end $$;

update public.transactions
set category = 'Geral'
where category is null
   or char_length(trim(category)) = 0;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'trg_prevent_closed_financial_period_transaction_changes'
  ) then
    alter table public.transactions enable trigger trg_prevent_closed_financial_period_transaction_changes;
  end if;
end $$;

insert into public.transaction_categories (user_id, type, name)
select distinct user_id, type, 'Geral'
from public.transactions
where user_id is not null
  and type in ('entrada', 'saida')
on conflict (user_id, type, name_normalized)
do update set updated_at = now();
