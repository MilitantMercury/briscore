begin;
create function public.briscore_enter_room_by_code(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_user uuid; v_player uuid; v_name text; v_guest boolean;
begin
  v_user := briscore_private.require_room_user();
  select * into v_room from public.rooms where public_code = upper(trim(p_code));
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = 'PT404'; end if;
  v_guest := coalesce((select is_anonymous from auth.users where id = v_user), false);
  if briscore_private.is_member(v_room.id) then return briscore_private.snapshot(v_room.id); end if;
  select p.id into v_player from public.players p where p.room_id = v_room.id and not exists (select 1 from public.room_members m where m.room_id = v_room.id and m.player_id = p.id) order by p.seat limit 1;
  if v_player is null then
    insert into public.room_members(room_id, user_id, player_id) values(v_room.id, v_user, null);
  else
    v_name := coalesce(nullif(trim((select raw_user_meta_data->>'display_name' from auth.users where id = v_user)), ''), 'Giocatore');
    update public.players set name = left(v_name, 30), is_bot = v_guest where id = v_player and room_id = v_room.id;
    insert into public.room_members(room_id, user_id, player_id) values(v_room.id, v_user, v_player);
  end if;
  update public.rooms set revision = revision + 1, updated_at = now() where id = v_room.id;
  return briscore_private.snapshot(v_room.id);
end $$;
revoke execute on function public.briscore_enter_room_by_code(text) from public, anon;
grant execute on function public.briscore_enter_room_by_code(text) to authenticated;
notify pgrst, 'reload schema';
commit;
