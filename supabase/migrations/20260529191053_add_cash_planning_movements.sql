create table if not exists public.cash_planning_movements (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  type text not null check (type in (
    'MANUAL_RESERVE',
    'MONTHLY_RULE',
    'WITHDRAW',
    'ADJUSTMENT',
    'USED_BY_TRANSACTION'
  )),
  amount numeric(14, 2) not null check (amount >= 0),
  direction text not null check (direction in ('IN', 'OUT')),
  reference_month date null,
  transaction_id uuid null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists cash_planning_movements_goal_created_at_idx
  on public.cash_planning_movements (goal_id, created_at desc);

create index if not exists cash_planning_movements_goal_reference_month_idx
  on public.cash_planning_movements (goal_id, reference_month);

alter table public.cash_planning_movements enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cash_planning_movements'
      and policyname = 'cash_planning_movements_select_own'
  ) then
    create policy cash_planning_movements_select_own
      on public.cash_planning_movements
      for select
      using (
        exists (
          select 1
          from public.goals g
          where g.id = cash_planning_movements.goal_id
            and g.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cash_planning_movements'
      and policyname = 'cash_planning_movements_insert_own'
  ) then
    create policy cash_planning_movements_insert_own
      on public.cash_planning_movements
      for insert
      with check (
        exists (
          select 1
          from public.goals g
          where g.id = cash_planning_movements.goal_id
            and g.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cash_planning_movements'
      and policyname = 'cash_planning_movements_update_own'
  ) then
    create policy cash_planning_movements_update_own
      on public.cash_planning_movements
      for update
      using (
        exists (
          select 1
          from public.goals g
          where g.id = cash_planning_movements.goal_id
            and g.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.goals g
          where g.id = cash_planning_movements.goal_id
            and g.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cash_planning_movements'
      and policyname = 'cash_planning_movements_delete_own'
  ) then
    create policy cash_planning_movements_delete_own
      on public.cash_planning_movements
      for delete
      using (
        exists (
          select 1
          from public.goals g
          where g.id = cash_planning_movements.goal_id
            and g.user_id = auth.uid()
        )
      );
  end if;
end
$$;
