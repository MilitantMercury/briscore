begin;
alter table public.rooms add column if not exists status text not null default 'active' check (status in ('active','completed'));
alter table public.rooms add column if not exists current_round integer not null default 1 check (current_round > 0);
alter table public.rooms add column if not exists round_completed boolean not null default false;
alter table public.rooms add column if not exists ended_at timestamptz;

create or replace function briscore_private.snapshot(p_room uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', r.id, 'hostId', r.host_id, 'revision', r.revision, 'updatedAt', r.updated_at,
    'status', r.status, 'currentRound', r.current_round, 'roundCompleted', r.round_completed, 'endedAt', r.ended_at,
    'inviteToken', case when r.host_id = auth.uid() then r.invite_token else null end,
    'members', (select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'playerId', m.player_id)), '[]'::jsonb) from public.room_members m where m.room_id = r.id),
    'session', jsonb_build_object('version', 1, 'createdAt', r.created_at,
      'players', (select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.seat) from public.players p where p.room_id = r.id),
      'hands', (select coalesce(jsonb_agg(briscore_private.hand_json(h) order by h.position), '[]'::jsonb) from public.hands h where h.room_id = r.id)),
    'proposals', (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'authorId', q.author_id,
      'author', p.name, 'kind', q.kind, 'hand', q.hand_payload, 'createdAt', q.created_at) order by q.created_at), '[]'::jsonb)
      from public.proposals q join public.room_members m on m.room_id = q.room_id and m.user_id = q.author_id
      join public.players p on p.id = m.player_id where q.room_id = r.id and q.status = 'pending')
  )) from public.rooms r where r.id = p_room;
$$;

create or replace function public.briscore_mutate(p_room uuid, p_revision bigint, p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_room public.rooms; v_hand jsonb; v_current jsonb; v_kind text; v_proposal public.proposals;
begin
  v_user := briscore_private.require_account();
  select * into v_room from public.rooms where id = p_room for update;
  if not found or not briscore_private.is_member(p_room) then raise exception 'FORBIDDEN' using errcode = 'PT403'; end if;
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
commit;
