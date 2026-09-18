-- Human-readable room codes used to find and join a shared game.
begin;

create or replace function briscore_private.generate_room_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_index integer;
begin
  loop
    v_code := '';
    for v_index in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where public_code = v_code);
  end loop;
  return v_code;
end $$;

alter table public.rooms add column if not exists public_code text;
update public.rooms set public_code = briscore_private.generate_room_code() where public_code is null;
alter table public.rooms alter column public_code set not null;
alter table public.rooms add constraint rooms_public_code_format check (public_code ~ '^[A-Z2-9]{8}$');
create unique index if not exists rooms_public_code_idx on public.rooms(public_code);

alter table public.rooms alter column public_code set default briscore_private.generate_room_code();

create or replace function public.briscore_find_room(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms;
begin
  perform briscore_private.require_account();
  select * into v_room from public.rooms where public_code = upper(trim(p_code));
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = 'PT404'; end if;
  return jsonb_build_object('id', v_room.id, 'publicCode', v_room.public_code,
    'inviteToken', v_room.invite_token, 'status', v_room.status, 'createdAt', v_room.created_at);
end $$;

revoke execute on function public.briscore_find_room(text) from public, anon;
grant execute on function public.briscore_find_room(text) to authenticated;
notify pgrst, 'reload schema';
commit;
