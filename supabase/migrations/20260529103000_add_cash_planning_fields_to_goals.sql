alter table public.goals
add column if not exists planning_type text not null default 'goal'
  check (planning_type in ('goal', 'reserve', 'bill_provision')),
add column if not exists reserved_amount numeric(14, 2) not null default 0
  check (reserved_amount >= 0),
add column if not exists counts_as_reserved boolean not null default true,
add column if not exists allocation_type text not null default 'fixed'
  check (allocation_type in ('fixed', 'percentage')),
add column if not exists allocation_value numeric(14, 2) not null default 0
  check (allocation_value >= 0),
add column if not exists linked_categories text[] not null default '{}';

update public.goals
set reserved_amount = target_amount
where is_system = false
  and reserved_amount = 0
  and target_amount > 0;
