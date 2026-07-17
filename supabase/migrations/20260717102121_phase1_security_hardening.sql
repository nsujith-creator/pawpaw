-- Phase 1 security hardening: enforce the canonical Home singleton and make
-- viewer-login failure accounting atomic. Forward-only; Pawpaw objects only.

do $$
begin
  if (select count(*) from public.content_items where type = 'home') > 1 then
    raise exception 'Cannot enforce Home singleton while duplicate Home rows exist';
  end if;
end;
$$;

create unique index content_items_one_home
  on public.content_items ((type))
  where type = 'home';

create or replace function public.record_viewer_login_failure(p_key_hash text)
returns table(failure_count integer, blocked_until timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid throttle key';
  end if;

  return query
  insert into public.viewer_login_attempts as attempts (
    key_hash, failure_count, window_started_at, blocked_until, updated_at
  )
  values (p_key_hash, 1, v_now, null, v_now)
  on conflict (key_hash) do update
  set
    failure_count = case
      when v_now - attempts.window_started_at > interval '15 minutes' then 1
      else attempts.failure_count + 1
    end,
    window_started_at = case
      when v_now - attempts.window_started_at > interval '15 minutes' then v_now
      else attempts.window_started_at
    end,
    blocked_until = case
      when (
        case
          when v_now - attempts.window_started_at > interval '15 minutes' then 1
          else attempts.failure_count + 1
        end
      ) >= 10 then v_now + interval '30 minutes'
      else null
    end,
    updated_at = v_now
  returning attempts.failure_count, attempts.blocked_until;
end;
$$;

revoke execute on function public.record_viewer_login_failure(text) from public;
revoke execute on function public.record_viewer_login_failure(text) from anon;
revoke execute on function public.record_viewer_login_failure(text) from authenticated;
grant execute on function public.record_viewer_login_failure(text) to service_role;
