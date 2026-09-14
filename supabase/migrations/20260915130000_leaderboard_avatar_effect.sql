begin;

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
  select coalesce(jsonb_agg(jsonb_build_object('userId',x.user_id,'name',x.name,'points',x.points,'games',x.games,'wins',x.wins,'rank',x.position,'avatar',coalesce(nullif(u.raw_user_meta_data->>'avatar',''),'bastoni'),'avatarImage',nullif(u.raw_user_meta_data->>'avatarImage',''),'avatarEffect',nullif(u.raw_user_meta_data->>'avatarEffect','')) order by x.position),'[]'::jsonb)
  from ranked x join auth.users u on u.id=x.user_id;
$$;

revoke execute on function public.briscore_leaderboard() from public, anon;
grant execute on function public.briscore_leaderboard() to authenticated;
notify pgrst, 'reload schema';

commit;
