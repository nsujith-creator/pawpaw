-- Migration 0006: Lock the search_path of public.set_updated_at().
--
-- Fixes the Supabase advisor warning "function_search_path_mutable":
-- without a fixed search_path, a function's unqualified references can be
-- hijacked by objects planted in schemas earlier on the caller's path.
--
-- The function body (see 0001) uses only NEW (a plpgsql record variable,
-- not resolved via search_path) and now() (pg_catalog, always implicitly
-- searched), so an empty search_path is safe and no re-creation is needed.

alter function public.set_updated_at() set search_path = '';
