begin;
create or replace function briscore_private.snapshot(p_room uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id',r.id,'hostId',r.host_id,'revision',r.revision,'updatedAt',r.updated_at,'status',r.status,'currentRound',r.current_round,'roundCompleted',r.round_completed,'endedAt',r.ended_at,'inviteToken',case when r.host_id=auth.uid() then r.invite_token else null end,
    'members',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('userId',m.user_id,'playerId',m.player_id,'avatar',coalesce(nullif(u.raw_user_meta_data->>'avatar',''),'bastoni'),'avatarImage',nullif(u.raw_user_meta_data->>'avatarImage',''),'avatarEffect',nullif(u.raw_user_meta_data->>'avatarEffect',''),'globalRank',case when briscore_private.global_rank(m.user_id)<=3 then briscore_private.global_rank(m.user_id) else null end)) order by p.seat nulls last),'[]'::jsonb) from public.room_members m join auth.users u on u.id=m.user_id left join public.players p on p.id=m.player_id where m.room_id=r.id),
    'session',jsonb_build_object('version',1,'createdAt',r.created_at,'players',(select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.seat) from public.players p where p.room_id=r.id),'hands',(select coalesce(jsonb_agg(briscore_private.hand_json(h) order by h.position),'[]'::jsonb) from public.hands h where h.room_id=r.id)),
    'proposals',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'authorId',q.author_id,'author',p.name,'kind',q.kind,'hand',q.hand_payload,'createdAt',q.created_at) order by q.created_at),'[]'::jsonb) from public.proposals q join public.room_members m on m.room_id=q.room_id and m.user_id=q.author_id join public.players p on p.id=m.player_id where q.room_id=r.id and q.status='pending')
  )) from public.rooms r where r.id=p_room;
$$;
notify pgrst, 'reload schema';
commit;
