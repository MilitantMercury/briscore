import { requireUser } from "@/lib/auth-server";
import { apiError, readBody } from "@/lib/api-error";
import { createRoom, listRooms } from "@/lib/rooms";
import type { Player } from "@/lib/game";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const body = await readBody(request);
    return Response.json(
      { room: await createRoom(auth, body.players as Player[]) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(request: Request) {
  try {
    return Response.json(await listRooms(await requireUser(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
