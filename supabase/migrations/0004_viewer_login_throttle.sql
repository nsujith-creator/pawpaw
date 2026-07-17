-- Migration 0004: Viewer login throttle table.
-- Stores per-key failure counts in Postgres so throttling is consistent
-- across all Vercel instances and cold starts.
-- key_hash is HMAC-SHA-256(normalized_client_id, THROTTLE_KEY_SECRET).
-- Raw client identifiers, passphrases, and passphrase hashes are never stored.

create table public.viewer_login_attempts (
  key_hash        text primary key,
  failure_count   integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until   timestamptz,
  updated_at      timestamptz not null default now()
);

-- RLS enabled. No client-accessible policies.
-- Only the service role (used server-side) can read or write this table.
alter table public.viewer_login_attempts enable row level security;

-- Cleanup: remove expired records. Run periodically via a Supabase cron job
-- or manually from the SQL editor.
--
--   delete from public.viewer_login_attempts
--   where blocked_until < now() - interval '1 hour'
--      or (blocked_until is null and window_started_at < now() - interval '1 hour');
