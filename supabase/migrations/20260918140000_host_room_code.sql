begin;
create function public.briscore_room_code(p_room uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform briscore_private.require_account();
  if not briscore_private.is_member(p_room) then raise exception 'FORBIDDEN' using errcode = 'PT403'; end if;
  return (select public_code from public.rooms where id = p_room);
end $$;
revoke execute on function public.briscore_room_code(uuid) from public, anon;
grant execute on function public.briscore_room_code(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
