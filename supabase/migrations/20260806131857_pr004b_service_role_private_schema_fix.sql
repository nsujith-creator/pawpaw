-- PR-004B: permit only the server's service-role path to enter the private
-- schema used by the existing public security-invoker wrappers. This does not
-- change wrapper security, table access, RLS, or Data API exposure.

grant usage on schema private to service_role;

revoke execute on function private.publish_content_revision(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function private.unpublish_content_revision(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function private.is_active_admin(uuid)
  from public, anon, authenticated;

grant execute on function private.publish_content_revision(uuid, uuid)
  to service_role;
grant execute on function private.unpublish_content_revision(uuid, uuid)
  to service_role;
grant execute on function private.is_active_admin(uuid)
  to service_role;
