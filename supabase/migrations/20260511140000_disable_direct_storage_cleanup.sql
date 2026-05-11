create or replace function public.cleanup_previous_month_audit_files(
  p_current_month date
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
begin
  return 0;
end;
$$;
