begin;
alter table public.hands drop constraint if exists hands_capotto_check;
update public.hands set capotto = capotto where true;
create or replace function briscore_private.validate_hand(p_room uuid, p_hand jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid; v_caller uuid; v_called uuid; v_type text; v_won boolean; v_capotto boolean;
begin
  if jsonb_typeof(p_hand) is distinct from 'object' or jsonb_typeof(p_hand->'callerWon') is distinct from 'boolean' or (p_hand ? 'capotto' and jsonb_typeof(p_hand->'capotto') is distinct from 'boolean') then raise exception 'INVALID_HAND'; end if;
  v_id := (p_hand->>'id')::uuid; v_caller := (p_hand->>'callerId')::uuid; v_called := (p_hand->>'calledPlayerId')::uuid; v_type := p_hand->>'callType'; v_won := (p_hand->>'callerWon')::boolean; v_capotto := coalesce((p_hand->>'capotto')::boolean, false);
  if v_id is null or v_type is null or v_type not in ('normal','double','triple','carichi') then raise exception 'INVALID_HAND'; end if;
  if (select count(*) from public.players where room_id=p_room) <> 5 or not exists(select 1 from public.players where room_id=p_room and id=v_caller) then raise exception 'INVALID_HAND'; end if;
  if v_type='carichi' then if p_hand ? 'calledPlayerId' then raise exception 'INVALID_HAND'; end if;
  elsif v_called is null or v_called=v_caller or not exists(select 1 from public.players where room_id=p_room and id=v_called) then raise exception 'INVALID_HAND'; end if;
  return jsonb_strip_nulls(jsonb_build_object('id',v_id,'callerId',v_caller,'calledPlayerId',v_called,'callType',v_type,'callerWon',v_won,'capotto',v_capotto,'createdAt',now(),'results','[]'::jsonb));
end $$;
commit;
