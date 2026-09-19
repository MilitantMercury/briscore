import { requireUser } from "@/lib/auth-server";
import { ApiError, apiError, readBody } from "@/lib/api-error";
import { kickPlayer } from "@/lib/rooms";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireUser(request, { allowAnonymous: true });
    const body = await readBody(request);
    if (typeof body.playerId !== "string") throw new ApiError("INVALID_ACTION", 400);
    return Response.json(await kickPlayer(auth, (await context.params).id, body.playerId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
