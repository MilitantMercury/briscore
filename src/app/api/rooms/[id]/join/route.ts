import { requireUser } from "@/lib/auth-server";
import { ApiError, apiError, readBody } from "@/lib/api-error";
import { enterRoom } from "@/lib/rooms";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireUser(request, { allowAnonymous: true });
    const body = await readBody(request);
    const id = (await context.params).id;
    if (typeof body.inviteToken !== "string")
      throw new ApiError("INVALID_INVITE", 400);
    const result = await enterRoom(auth, id, body.inviteToken);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
