begin;

create or replace function briscore_private.global_rank(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  with session_scores as (
    select r.id as room_id, m.user_id, p.name,
      coalesce(sum(
        (case when h.caller_id = p.id then case when h.call_type = 'carichi' then 4 else 2 end when h.called_player_id = p.id then 1 else -1 end)
        * (case when h.caller_won then 1 else -1 end)
        * (case h.call_type when 'normal' then 1 when 'double' then 2 when 'triple' then 3 else 1 end)
        * (case when h.capotto then 2 else 1 end)
      ), 0)::bigint as points
    from public.rooms r
    join public.room_members m on m.room_id = r.id and m.player_id is not null
    join public.players p on p.room_id = r.id and p.id = m.player_id
    left join public.hands h on h.room_id = r.id
    where r.status = 'completed'
    group by r.id, m.user_id, p.id, p.name
  ), ranked_scores as (
    select *, dense_rank() over (partition by room_id order by points desc) as place
    from session_scores
  ), totals as (
    select user_id, min(name) as name, sum(points)::bigint as points,
      count(*) filter (where place = 1)::integer as wins
    from ranked_scores
    group by user_id
  ), ranked as (
    select user_id, row_number() over (order by points desc, wins desc, name) as position
    from totals
  )
  select position::integer from ranked where user_id = p_user;
$$;

create or replace function briscore_private.snapshot(p_room uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id',r.id,'hostId',r.host_id,'revision',r.revision,'updatedAt',r.updated_at,
    'status',r.status,'currentRound',r.current_round,'roundCompleted',r.round_completed,'endedAt',r.ended_at,
    'inviteToken',case when r.host_id=auth.uid() then r.invite_token else null end,
    'members',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'userId',m.user_id,'playerId',m.player_id,
      'avatar',coalesce(nullif(u.raw_user_meta_data->>'avatar',''),'bastoni'),
      'globalRank',case when briscore_private.global_rank(m.user_id) <= 3 then briscore_private.global_rank(m.user_id) else null end
    )) order by p.seat nulls last),'[]'::jsonb)
      from public.room_members m
      join auth.users u on u.id=m.user_id
      left join public.players p on p.id=m.player_id
      where m.room_id=r.id),
    'session',jsonb_build_object('version',1,'createdAt',r.created_at,
      'players',(select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.seat) from public.players p where p.room_id=r.id),
      'hands',(select coalesce(jsonb_agg(briscore_private.hand_json(h) order by h.position),'[]'::jsonb) from public.hands h where h.room_id=r.id)),
    'proposals',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'authorId',q.author_id,'author',p.name,'kind',q.kind,'hand',q.hand_payload,'createdAt',q.created_at) order by q.created_at),'[]'::jsonb) from public.proposals q join public.room_members m on m.room_id=q.room_id and m.user_id=q.author_id join public.players p on p.id=m.player_id where q.room_id=r.id and q.status='pending')
  )) from public.rooms r where r.id=p_room;
$$;

create or replace function public.briscore_leaderboard() returns jsonb
language sql stable security definer set search_path = '' as $$
  with account as (select briscore_private.require_account() as user_id),
  session_scores as (
    select r.id as room_id,m.user_id,p.name,
      coalesce(sum((case when h.caller_id=p.id then case when h.call_type='carichi' then 4 else 2 end when h.called_player_id=p.id then 1 else -1 end)*(case when h.caller_won then 1 else -1 end)*(case h.call_type when 'normal' then 1 when 'double' then 2 when 'triple' then 3 else 1 end)*(case when h.capotto then 2 else 1 end)),0)::bigint as points
    from public.rooms r cross join account join public.room_members m on m.room_id=r.id and m.player_id is not null join public.players p on p.room_id=r.id and p.id=m.player_id left join public.hands h on h.room_id=r.id where r.status='completed' group by r.id,m.user_id,p.id,p.name
  ), ranked_scores as (select *,dense_rank() over(partition by room_id order by points desc) as place from session_scores),
  totals as (select user_id,min(name) as name,sum(points)::bigint as points,count(*)::integer as games,count(*) filter(where place=1)::integer as wins from ranked_scores group by user_id),
  ranked as (select *,row_number() over(order by points desc,wins desc,name) as position from totals)
  select coalesce(jsonb_agg(jsonb_build_object('userId',x.user_id,'name',x.name,'points',x.points,'games',x.games,'wins',x.wins,'rank',x.position,'avatar',coalesce(nullif(u.raw_user_meta_data->>'avatar',''),'bastoni')) order by x.position),'[]'::jsonb)
  from ranked x join auth.users u on u.id=x.user_id;
$$;

revoke all on function briscore_private.global_rank(uuid) from public, anon, authenticated;
revoke execute on function public.briscore_leaderboard() from public, anon;
grant execute on function public.briscore_leaderboard() to authenticated;
notify pgrst, 'reload schema';
commit;
