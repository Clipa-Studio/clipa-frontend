-- Keep profile self-updates scoped to non-privileged profile fields.
revoke update on table public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;
revoke update (id, email, role, created_at, updated_at) on table public.profiles from authenticated;

create or replace function private.can_call_admin_rpc()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select auth.role() = 'service_role' or private.is_admin();
$$;

grant execute on function private.can_call_admin_rpc() to authenticated, service_role;

do $$
declare
  target_function regprocedure;
  function_ddl text;
begin
  foreach target_function in array array[
    'public.admin_get_dashboard(text, integer)'::regprocedure,
    'public.admin_get_events(text, text, integer, timestamptz, uuid, integer)'::regprocedure,
    'public.admin_get_event_analytics(text, integer, text)'::regprocedure
  ]
  loop
    function_ddl := pg_get_functiondef(target_function);

    if position('if not private.is_admin() then' in function_ddl) = 0 then
      raise exception 'Expected admin guard not found in %', target_function;
    end if;

    execute replace(
      function_ddl,
      'if not private.is_admin() then',
      'if not private.can_call_admin_rpc() then'
    );
  end loop;
end $$;

grant execute on function public.admin_get_dashboard(text, integer) to authenticated, service_role;
grant execute on function public.admin_get_events(text, text, integer, timestamptz, uuid, integer) to authenticated, service_role;
grant execute on function public.admin_get_event_analytics(text, integer, text) to authenticated, service_role;

do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'role', 'update') then
    raise exception 'authenticated must not be able to update public.profiles.role';
  end if;
end $$;
