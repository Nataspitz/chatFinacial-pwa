alter table public.transactions
  add column if not exists confirmed_at timestamptz null;

drop trigger if exists trg_prevent_closed_financial_period_transaction_changes on public.transactions;

update public.transactions
set confirmed_at = coalesce(created_at, now())
where is_confirmed = true
  and confirmed_at is null;

update public.transactions
set confirmed_at = null
where is_confirmed = false
  and confirmed_at is not null;

create or replace function public.ensure_transaction_confirmation_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_today date;
  v_transaction_date date;
begin
  v_today := timezone('America/Sao_Paulo', now())::date;
  v_transaction_date := new.date::date;

  if tg_op = 'INSERT' then
    if v_transaction_date <= v_today then
      new.is_confirmed := true;
      new.confirmed_at := coalesce(new.confirmed_at, now());
    else
      new.is_confirmed := false;
      new.confirmed_at := null;
    end if;

    return new;
  end if;

  if v_transaction_date <= v_today then
    new.is_confirmed := true;
    new.confirmed_at := coalesce(new.confirmed_at, old.confirmed_at, now());
    return new;
  end if;

  if new.is_confirmed = true then
    new.confirmed_at := coalesce(new.confirmed_at, old.confirmed_at, now());
  else
    new.confirmed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_transaction_confirmation_state on public.transactions;
create trigger trg_ensure_transaction_confirmation_state
before insert or update on public.transactions
for each row
execute function public.ensure_transaction_confirmation_state();

create index if not exists transactions_confirmed_at_idx
  on public.transactions (user_id, confirmed_at);

create trigger trg_prevent_closed_financial_period_transaction_changes
before insert or update or delete on public.transactions
for each row
execute function public.prevent_closed_financial_period_transaction_changes();
