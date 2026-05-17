revoke execute on function public.admin_get_dashboard(text, integer) from anon, authenticated, public;
revoke execute on function public.admin_get_events(text, text, integer, timestamptz, uuid, integer) from anon, authenticated, public;
revoke execute on function public.admin_get_event_analytics(text, integer, text) from anon, authenticated, public;

grant execute on function public.admin_get_dashboard(text, integer) to service_role;
grant execute on function public.admin_get_events(text, text, integer, timestamptz, uuid, integer) to service_role;
grant execute on function public.admin_get_event_analytics(text, integer, text) to service_role;

do $$
begin
  if has_function_privilege('authenticated', 'public.admin_get_dashboard(text, integer)', 'execute') then
    raise exception 'authenticated can still execute admin_get_dashboard';
  end if;

  if has_function_privilege('authenticated', 'public.admin_get_events(text, text, integer, timestamp with time zone, uuid, integer)', 'execute') then
    raise exception 'authenticated can still execute admin_get_events';
  end if;

  if has_function_privilege('authenticated', 'public.admin_get_event_analytics(text, integer, text)', 'execute') then
    raise exception 'authenticated can still execute admin_get_event_analytics';
  end if;

  if not has_function_privilege('service_role', 'public.admin_get_dashboard(text, integer)', 'execute') then
    raise exception 'service_role cannot execute admin_get_dashboard';
  end if;

  if not has_function_privilege('service_role', 'public.admin_get_events(text, text, integer, timestamp with time zone, uuid, integer)', 'execute') then
    raise exception 'service_role cannot execute admin_get_events';
  end if;

  if not has_function_privilege('service_role', 'public.admin_get_event_analytics(text, integer, text)', 'execute') then
    raise exception 'service_role cannot execute admin_get_event_analytics';
  end if;
end $$;
