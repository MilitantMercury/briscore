begin;
create or replace function public.briscore_find_room(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms;
begin
  select * into v_room from public.rooms where public_code = upper(trim(p_code));
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = 'PT404'; end if;
  return jsonb_build_object('id', v_room.id, 'publicCode', v_room.public_code,
    'status', v_room.status, 'createdAt', v_room.created_at);
end $$;
grant execute on function public.briscore_find_room(text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
