begin;

-- PostgreSQL grants EXECUTE to PUBLIC by default. These RPCs use SECURITY
-- DEFINER intentionally, but every one must require a signed-in account.
revoke execute on function public.briscore_create_room() from public, anon;
revoke execute on function public.briscore_create_room(jsonb) from public, anon;
revoke execute on function public.briscore_get_room(uuid) from public, anon;
revoke execute on function public.briscore_invite(uuid, uuid) from public, anon;
revoke execute on function public.briscore_join_room(uuid, uuid, uuid) from public, anon;
revoke execute on function public.briscore_join_room(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.briscore_mutate(uuid, bigint, text, jsonb) from public, anon;
revoke execute on function public.briscore_leaderboard() from public, anon;

grant execute on function public.briscore_create_room() to authenticated;
grant execute on function public.briscore_create_room(jsonb) to authenticated;
grant execute on function public.briscore_get_room(uuid) to authenticated;
grant execute on function public.briscore_invite(uuid, uuid) to authenticated;
grant execute on function public.briscore_join_room(uuid, uuid, uuid) to authenticated;
grant execute on function public.briscore_join_room(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.briscore_mutate(uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.briscore_leaderboard() to authenticated;

notify pgrst, 'reload schema';

commit;
