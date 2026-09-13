import { requireUser } from "@/lib/auth-server";
import { apiError, readBody } from "@/lib/api-error";
import { getInvite, joinRoom } from "@/lib/rooms";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireUser(request);
    const body = await readBody(request);
    const id = (await context.params).id;
    const result = body.playerId
      ? await joinRoom(
          auth,
          id,
          body.inviteToken as string,
          body.playerId as string,
        )
      : await getInvite(auth, id, body.inviteToken as string);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
