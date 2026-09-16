-- Anonymous Auth guests can join invited rooms without entering the global ranking.
create or replace function public.briscore_enter_room(p_room uuid, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_room public.rooms;
  v_player uuid;
  v_name text;
  v_guest boolean;
begin
  v_user := briscore_private.require_account();
  v_guest := coalesce((select is_anonymous from auth.users where id = v_user), false);
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.invite_token is distinct from p_token then
    raise exception 'INVALID_INVITE' using errcode = 'PT404';
  end if;
  if briscore_private.is_member(p_room) then return briscore_private.snapshot(p_room); end if;
  select p.id into v_player
    from public.players p
   where p.room_id = p_room
     and not exists (select 1 from public.room_members m where m.room_id = p_room and m.player_id = p.id)
   order by p.seat limit 1;
  if v_player is null then
    insert into public.room_members(room_id, user_id, player_id) values(p_room, v_user, null);
  else
    v_name := coalesce(
      nullif(trim((select raw_user_meta_data->>'display_name' from auth.users where id = v_user)), ''),
      nullif(trim((select raw_user_meta_data->>'full_name' from auth.users where id = v_user)), ''),
      split_part((select email from auth.users where id = v_user), '@', 1),
      'Giocatore'
    );
    update public.players set name = left(v_name, 30), is_bot = v_guest where id = v_player and room_id = p_room;
    insert into public.room_members(room_id, user_id, player_id) values(p_room, v_user, v_player);
  end if;
  update public.rooms set revision = revision + 1, updated_at = now() where id = p_room;
  return briscore_private.snapshot(p_room);
end $$;

grant execute on function public.briscore_enter_room(uuid, uuid) to anon, authenticated;
