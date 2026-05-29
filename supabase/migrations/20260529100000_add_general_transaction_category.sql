update public.transactions
set category = 'Geral'
where category is null
   or char_length(trim(category)) = 0;

insert into public.transaction_categories (user_id, type, name)
select distinct user_id, type, 'Geral'
from public.transactions
where user_id is not null
  and type in ('entrada', 'saida')
on conflict (user_id, type, name_normalized)
do update set updated_at = now();
