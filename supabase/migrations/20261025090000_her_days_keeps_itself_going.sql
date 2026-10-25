-- Her days looks in the folder by itself, every couple of minutes.
-- The database's own timer (pg_cron) knocks on the site's /api/her-days/ping door with pg_net.
-- The key for that knock is made here and kept only in her_days_state (service role only); it is
-- never shown or sent anywhere except in that one knock. Additive: two extensions, one row, one timer.

create extension if not exists pg_net;
create extension if not exists pg_cron;

insert into public.her_days_state (key, value)
values ('ping', jsonb_build_object('key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')))
on conflict (key) do nothing;

-- Every 2 minutes. Taking the knock's own turn (take_her_days_turn) keeps two looks from overlapping.
select cron.unschedule('her-days-look') where exists (select 1 from cron.job where jobname = 'her-days-look');
select cron.schedule(
  'her-days-look',
  '*/2 * * * *',
  $$ select net.http_get(
       url := 'https://www.heyvarada.in/api/her-days/ping',
       headers := jsonb_build_object('Authorization', 'Bearer ' || (select value->>'key' from public.her_days_state where key = 'ping')),
       timeout_milliseconds := 10000
     ) $$
);
