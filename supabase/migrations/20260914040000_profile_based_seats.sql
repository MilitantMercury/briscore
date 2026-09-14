begin;
create or replace function public.briscore_create_room() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_room uuid; v_player uuid; v_name text; i integer;
begin
  v_user := briscore_private.require_account();
  v_name := coalesce(nullif(trim((select raw_user_meta_data->>'display_name' from auth.users where id=v_user)),''), nullif(trim((select raw_user_meta_data->>'full_name' from auth.users where id=v_user)),''), split_part((select email from auth.users where id=v_user),'@',1), 'Giocatore');
  insert into public.rooms(host_id) values(v_user) returning id into v_room;
  for i in 1..5 loop
    insert into public.players(room_id,seat,name) values(v_room,i,case when i=1 then left(v_name,30) else 'Posto libero '||i end) returning id into v_player;
    if i=1 then insert into public.room_members(room_id,user_id,player_id) values(v_room,v_user,v_player); end if;
  end loop;
  return briscore_private.snapshot(v_room);
end $$;

create or replace function public.briscore_join_room(p_room uuid, p_token uuid, p_player uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_room public.rooms;
begin
  v_user := briscore_private.require_account();
  if length(trim(coalesce(p_name,''))) not between 1 and 30 then raise exception 'INVALID_PLAYERS'; end if;
  select * into v_room from public.rooms where id=p_room for update;
  if not found or v_room.invite_token is distinct from p_token then raise exception 'INVALID_INVITE' using errcode='PT404'; end if;
  if briscore_private.is_member(p_room) then return briscore_private.snapshot(p_room); end if;
  if not exists(select 1 from public.players where room_id=p_room and id=p_player) then raise exception 'INVALID_PLAYERS'; end if;
  if exists(select 1 from public.room_members where room_id=p_room and player_id=p_player) then raise exception 'SEAT_TAKEN' using errcode='PT409'; end if;
  if exists(select 1 from public.players where room_id=p_room and lower(trim(name))=lower(trim(p_name))) then raise exception 'INVALID_PLAYERS'; end if;
  update public.players set name=trim(p_name) where room_id=p_room and id=p_player;
  insert into public.room_members(room_id,user_id,player_id) values(p_room,v_user,p_player);
  update public.rooms set revision=revision+1,updated_at=now() where id=p_room;
  return briscore_private.snapshot(p_room);
end $$;
grant execute on function public.briscore_create_room() to authenticated;
grant execute on function public.briscore_join_room(uuid,uuid,uuid,text) to authenticated;
commit;
