drop index if exists public.cash_planning_movements_transaction_unique_idx;

create unique index if not exists cash_planning_movements_used_transaction_unique_idx
  on public.cash_planning_movements (transaction_id)
  where transaction_id is not null
    and type = 'USED_BY_TRANSACTION';

create unique index if not exists cash_planning_movements_monthly_rule_unique_idx
  on public.cash_planning_movements (transaction_id, goal_id, type)
  where transaction_id is not null
    and type = 'MONTHLY_RULE';
