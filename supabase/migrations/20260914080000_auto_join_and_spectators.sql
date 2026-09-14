begin;

-- A logged-in account can enter a room only through its invite token. The
-- first five accounts take the seats in order; subsequent accounts are
-- spectators and retain read-only access to the room.
create or replace function public.briscore_enter_room(p_room uuid, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_room public.rooms;
  v_player uuid;
  v_name text;
begin
  v_user := briscore_private.require_account();
  select * into v_room from public.rooms where id = p_room for update;
  if not found or v_room.invite_token is distinct from p_token then
    raise exception 'INVALID_INVITE' using errcode = 'PT404';
  end if;

  if briscore_private.is_member(p_room) then
    return briscore_private.snapshot(p_room);
  end if;

  select p.id into v_player
  from public.players p
  where p.room_id = p_room
    and not exists (
      select 1 from public.room_members m
      where m.room_id = p_room and m.player_id = p.id
    )
  order by p.seat
  limit 1;

  if v_player is null then
    insert into public.room_members(room_id, user_id, player_id)
    values(p_room, v_user, null);
  else
    v_name := coalesce(
      nullif(trim((select raw_user_meta_data->>'display_name' from auth.users where id = v_user)), ''),
      nullif(trim((select raw_user_meta_data->>'full_name' from auth.users where id = v_user)), ''),
      split_part((select email from auth.users where id = v_user), '@', 1),
      'Giocatore'
    );
    update public.players set name = left(v_name, 30) where id = v_player and room_id = p_room;
    insert into public.room_members(room_id, user_id, player_id)
    values(p_room, v_user, v_player);
  end if;

  update public.rooms set revision = revision + 1, updated_at = now() where id = p_room;
  return briscore_private.snapshot(p_room);
end $$;

create or replace function public.briscore_mutate(p_room uuid, p_revision bigint, p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_room public.rooms; v_hand jsonb; v_current jsonb; v_kind text; v_proposal public.proposals;
begin
  v_user := briscore_private.require_account();
  select * into v_room from public.rooms where id = p_room for update;
  if not found or not briscore_private.is_member(p_room) then raise exception 'FORBIDDEN' using errcode = 'PT403'; end if;
  if not exists(select 1 from public.room_members where room_id = p_room and user_id = v_user and player_id is not null) then raise exception 'SPECTATOR_ONLY' using errcode = 'PT403'; end if;
  if p_revision is distinct from v_room.revision then raise exception 'CONFLICT' using errcode = 'PT409'; end if;
  if p_action is null or p_action not in ('add','edit','delete','reset','propose','resolve') then raise exception 'INVALID_ACTION'; end if;
  if p_action <> 'propose' and v_room.host_id <> v_user then raise exception 'HOST_ONLY' using errcode = 'PT403'; end if;
  if p_action in ('add','edit','delete') then
    perform briscore_private.apply_hand(p_room, p_action, p_payload->'hand');
  elsif p_action = 'reset' then
    delete from public.hands where room_id = p_room;
    update public.proposals set status = 'rejected' where room_id = p_room and status = 'pending';
  elsif p_action = 'propose' then
    v_kind := p_payload->>'kind';
    if v_kind is null or v_kind not in ('add','edit','delete') then raise exception 'INVALID_ACTION'; end if;
    if (select count(*) from public.proposals where room_id = p_room and status = 'pending') >= 30 then raise exception 'RATE_LIMIT' using errcode = 'PT429'; end if;
    v_hand := briscore_private.validate_hand(p_room, p_payload->'hand');
    select briscore_private.hand_json(h) into v_current from public.hands h where h.id = (v_hand->>'id')::uuid and h.room_id = p_room;
    if (v_kind = 'add' and v_current is not null) or (v_kind <> 'add' and v_current is null) then raise exception 'HAND_NOT_FOUND'; end if;
    insert into public.proposals(room_id, author_id, kind, hand_payload, base_hand) values(p_room, v_user, v_kind, v_hand, v_current);
  elsif p_action = 'resolve' then
    if jsonb_typeof(p_payload->'approve') is distinct from 'boolean' then raise exception 'INVALID_ACTION'; end if;
    select * into v_proposal from public.proposals where id = (p_payload->>'proposalId')::uuid and room_id = p_room and status = 'pending';
    if not found then raise exception 'PROPOSAL_RESOLVED' using errcode = 'PT409'; end if;
    if (p_payload->>'approve')::boolean then
      select briscore_private.hand_json(h) into v_current from public.hands h where h.id = (v_proposal.hand_payload->>'id')::uuid and h.room_id = p_room;
      if v_current is distinct from v_proposal.base_hand then raise exception 'STALE_PROPOSAL' using errcode = 'PT409'; end if;
      perform briscore_private.apply_hand(p_room, v_proposal.kind, v_proposal.hand_payload);
    end if;
    update public.proposals set status = case when (p_payload->>'approve')::boolean then 'approved' else 'rejected' end where id = v_proposal.id;
  end if;
  update public.rooms set revision = revision + 1, updated_at = now() where id = p_room;
  return briscore_private.snapshot(p_room);
end $$;

create or replace function public.briscore_mutate(p_room uuid, p_revision bigint, p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_room public.rooms; v_hand jsonb; v_current jsonb; v_kind text; v_proposal public.proposals;
begin
  v_user := briscore_private.require_account();
  select * into v_room from public.rooms where id = p_room for update;
  if not found or not briscore_private.is_member(p_room) then raise exception 'FORBIDDEN' using errcode = 'PT403'; end if;
  if not exists(select 1 from public.room_members where room_id = p_room and user_id = v_user and player_id is not null) then raise exception 'SPECTATOR_ONLY' using errcode = 'PT403'; end if;
  if p_revision is distinct from v_room.revision then raise exception 'CONFLICT' using errcode = 'PT409'; end if;
  if v_room.status = 'completed' then raise exception 'SESSION_COMPLETED' using errcode = 'PT409'; end if;
  if v_room.round_completed and p_action in ('add','edit','delete','propose','resolve') then raise exception 'ROUND_COMPLETED' using errcode = 'PT409'; end if;
  if p_action is null or p_action not in ('add','edit','delete','reset','propose','resolve','continue_round','complete') then raise exception 'INVALID_ACTION'; end if;
  if p_action <> 'propose' and v_room.host_id <> v_user then raise exception 'HOST_ONLY' using errcode = 'PT403'; end if;
  if p_action in ('add','edit','delete') then perform briscore_private.apply_hand(p_room, p_action, p_payload->'hand');
  elsif p_action = 'reset' then delete from public.hands where room_id = p_room; update public.proposals set status = 'rejected' where room_id = p_room and status = 'pending'; update public.rooms set current_round=1, round_completed=false where id=p_room;
  elsif p_action = 'continue_round' then if not v_room.round_completed then raise exception 'ROUND_NOT_COMPLETED'; end if; update public.rooms set current_round=current_round+1, round_completed=false where id=p_room;
  elsif p_action = 'complete' then update public.rooms set status='completed', ended_at=now(), round_completed=true where id=p_room;
  elsif p_action = 'propose' then
    v_kind := p_payload->>'kind'; if v_kind is null or v_kind not in ('add','edit','delete') then raise exception 'INVALID_ACTION'; end if;
    if (select count(*) from public.proposals where room_id = p_room and status = 'pending') >= 30 then raise exception 'RATE_LIMIT' using errcode = 'PT429'; end if;
    v_hand := briscore_private.validate_hand(p_room, p_payload->'hand'); select briscore_private.hand_json(h) into v_current from public.hands h where h.id = (v_hand->>'id')::uuid and h.room_id = p_room;
    if (v_kind = 'add' and v_current is not null) or (v_kind <> 'add' and v_current is null) then raise exception 'HAND_NOT_FOUND'; end if;
    insert into public.proposals(room_id, author_id, kind, hand_payload, base_hand) values(p_room, v_user, v_kind, v_hand, v_current);
  elsif p_action = 'resolve' then
    if jsonb_typeof(p_payload->'approve') is distinct from 'boolean' then raise exception 'INVALID_ACTION'; end if;
    select * into v_proposal from public.proposals where id=(p_payload->>'proposalId')::uuid and room_id=p_room and status='pending'; if not found then raise exception 'PROPOSAL_RESOLVED' using errcode='PT409'; end if;
    if (p_payload->>'approve')::boolean then select briscore_private.hand_json(h) into v_current from public.hands h where h.id=(v_proposal.hand_payload->>'id')::uuid and h.room_id=p_room; if v_current is distinct from v_proposal.base_hand then raise exception 'STALE_PROPOSAL' using errcode='PT409'; end if; perform briscore_private.apply_hand(p_room,v_proposal.kind,v_proposal.hand_payload); end if;
    update public.proposals set status=case when (p_payload->>'approve')::boolean then 'approved' else 'rejected' end where id=v_proposal.id;
  end if;
  if p_action in ('add','edit') and (select count(*) from public.hands where room_id=p_room) > 0 and (select count(*) from public.hands where room_id=p_room) % 5 = 0 then update public.rooms set round_completed=true where id=p_room; end if;
  update public.rooms set revision=revision+1, updated_at=now() where id=p_room;
  return briscore_private.snapshot(p_room);
end $$;

revoke execute on function public.briscore_enter_room(uuid, uuid) from public, anon;
grant execute on function public.briscore_enter_room(uuid, uuid) to authenticated;
revoke execute on function public.briscore_join_room(uuid, uuid, uuid) from authenticated;
revoke execute on function public.briscore_join_room(uuid, uuid, uuid, text) from authenticated;

notify pgrst, 'reload schema';
commit;
