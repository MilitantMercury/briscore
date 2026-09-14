begin;
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check check (status in ('active','completed','cancelled'));

create or replace function public.briscore_cancel_room(p_room uuid, p_revision bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_room public.rooms;
begin
  v_user := briscore_private.require_account();
  select * into v_room from public.rooms where id=p_room for update;
  if not found or not briscore_private.is_member(p_room) then raise exception 'FORBIDDEN' using errcode='PT403'; end if;
  if v_room.host_id <> v_user then raise exception 'HOST_ONLY' using errcode='PT403'; end if;
  if v_room.status <> 'active' then raise exception 'INVALID_ACTION'; end if;
  if p_revision is distinct from v_room.revision then raise exception 'CONFLICT' using errcode='PT409'; end if;
  update public.proposals set status='rejected' where room_id=p_room and status='pending';
  update public.rooms set status='cancelled', ended_at=now(), round_completed=true, revision=revision+1, updated_at=now() where id=p_room;
  return briscore_private.snapshot(p_room);
end $$;
revoke execute on function public.briscore_cancel_room(uuid,bigint) from public, anon;
grant execute on function public.briscore_cancel_room(uuid,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
