begin;
create or replace function public.briscore_kick_player(p_room uuid, p_player uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_room public.rooms; v_member public.room_members; v_seat smallint;
begin
  v_user := briscore_private.require_room_user();
  select * into v_room from public.rooms where id=p_room for update;
  if not found or v_room.host_id <> v_user then raise exception 'HOST_ONLY' using errcode='PT403'; end if;
  select m.* into v_member from public.room_members m where m.room_id=p_room and m.player_id=p_player;
  if not found then raise exception 'PLAYER_NOT_FOUND' using errcode='PT404'; end if;
  if v_member.user_id = v_user then raise exception 'INVALID_ACTION'; end if;
  select seat into v_seat from public.players where room_id=p_room and id=p_player;
  delete from public.proposals where room_id=p_room and author_id=v_member.user_id and status='pending';
  delete from public.room_members where room_id=p_room and player_id=p_player;
  update public.players set name='Posto libero ' || v_seat, is_bot=true where room_id=p_room and id=p_player;
  update public.rooms set revision=revision+1, updated_at=now() where id=p_room;
  return briscore_private.snapshot(p_room);
end $$;
revoke all on function public.briscore_kick_player(uuid,uuid) from public, anon;
grant execute on function public.briscore_kick_player(uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
