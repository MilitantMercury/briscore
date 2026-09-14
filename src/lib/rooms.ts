import type { AuthContext } from "./auth-server";
import { ApiError } from "./api-error";
import {
  calculateHandScore,
  parseSession,
} from "./game";
import type { Room, RoomInvite } from "./room-types";
export type { Room, Proposal } from "./room-types";

async function rpc(
  auth: AuthContext,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await auth.client.rpc(name, args);
  if (error) throw ApiError.fromDatabase(error);
  return data;
}
function hydrate(data: Room): Room {
  const session = parseSession(JSON.stringify(data.session));
  return {
    ...data,
    session,
    proposals: data.proposals.map((proposal) => ({
      ...proposal,
      hand: {
        ...proposal.hand,
        results: calculateHandScore(session.players, proposal.hand),
      },
    })),
  };
}
export async function createRoom(auth: AuthContext) {
  return hydrate(
    await rpc(auth, "briscore_create_room", {}),
  );
}
export async function getRoom(auth: AuthContext, id: string) {
  return hydrate(await rpc(auth, "briscore_get_room", { p_room: id }));
}
export async function getInvite(
  auth: AuthContext,
  id: string,
  token: string,
): Promise<RoomInvite> {
  return rpc(auth, "briscore_invite", { p_room: id, p_token: token });
}
export async function joinRoom(
  auth: AuthContext,
  id: string,
  token: string,
  playerId: string,
  name: string,
) {
  return hydrate(
    await rpc(auth, "briscore_join_room", {
      p_room: id,
      p_token: token,
      p_player: playerId,
      p_name: name,
    }),
  );
}
export async function mutateRoom(
  auth: AuthContext,
  id: string,
  revision: number,
  action: string,
  payload: Record<string, unknown>,
) {
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw new ApiError("INVALID_ACTION", 400);
  return hydrate(
    await rpc(auth, "briscore_mutate", {
      p_room: id,
      p_revision: revision,
      p_action: action,
      p_payload: payload,
    }),
  );
}
export async function listRooms(auth: AuthContext) {
  const { data, error } = await auth.client
    .from("rooms")
    .select("id,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw ApiError.fromDatabase(error);
  return data;
}
export async function leaderboard(auth: AuthContext) {
  return rpc(auth, "briscore_leaderboard", {});
}
