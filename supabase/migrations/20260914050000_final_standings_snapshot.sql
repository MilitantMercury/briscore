begin;
create or replace function briscore_private.snapshot(p_room uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', r.id, 'hostId', r.host_id, 'revision', r.revision, 'updatedAt', r.updated_at,
    'status', r.status, 'currentRound', r.current_round, 'roundCompleted', r.round_completed, 'endedAt', r.ended_at,
    'inviteToken', case when r.host_id = auth.uid() then r.invite_token else null end,
    'members', (select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'playerId',m.player_id)),'[]'::jsonb) from public.room_members m where m.room_id=r.id),
    'session', jsonb_build_object('version',1,'createdAt',r.created_at,'players',(select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.seat) from public.players p where p.room_id=r.id),'hands',(select coalesce(jsonb_agg(briscore_private.hand_json(h) order by h.position),'[]'::jsonb) from public.hands h where h.room_id=r.id)),
    'finalStandings', case when r.status='completed' then (select jsonb_agg(jsonb_build_object('playerId',p.id,'name',p.name,'score',coalesce((select sum((case when h.caller_id=p.id then case when h.call_type='carichi' then 4 else 2 end when h.called_player_id=p.id then 1 else -1 end) * (case when h.caller_won then 1 else -1 end) * (case when h.call_type='normal' then 1 when h.call_type='double' then 2 when h.call_type='triple' then 3 else 1 end) * (case when h.capotto then 2 else 1 end)) from public.hands h where h.room_id=r.id),0)) order by 3 desc) from public.players p where p.room_id=r.id) else null end,
    'proposals',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'authorId',q.author_id,'author',p.name,'kind',q.kind,'hand',q.hand_payload,'createdAt',q.created_at) order by q.created_at),'[]'::jsonb) from public.proposals q join public.room_members m on m.room_id=q.room_id and m.user_id=q.author_id join public.players p on p.id=m.player_id where q.room_id=r.id and q.status='pending')
  )) from public.rooms r where r.id=p_room;
$$;
commit;
