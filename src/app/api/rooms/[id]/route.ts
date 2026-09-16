import { requireUser } from "@/lib/auth-server";
import { apiError, readBody } from "@/lib/api-error";
import { cancelRoom, getRoom, mutateRoom } from "@/lib/rooms";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    return Response.json(
      await getRoom(await requireUser(request, { allowAnonymous: true }), (await context.params).id),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const auth = await requireUser(request, { allowAnonymous: true });
    const body = await readBody(request);
    return Response.json(
      body.action === "cancel"
        ? await cancelRoom(auth, (await context.params).id, body.revision as number)
        : await mutateRoom(
        auth,
        (await context.params).id,
        body.revision as number,
        body.action as string,
        body,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
