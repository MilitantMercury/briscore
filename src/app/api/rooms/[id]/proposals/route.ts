import { requireUser } from "@/lib/auth-server";
import { apiError, readBody } from "@/lib/api-error";
import { mutateRoom } from "@/lib/rooms";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireUser(request);
    const body = await readBody(request);
    return Response.json(
      await mutateRoom(
        auth,
        (await context.params).id,
        body.revision as number,
        "propose",
        body,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requireUser(request);
    const body = await readBody(request);
    return Response.json(
      await mutateRoom(
        auth,
        (await context.params).id,
        body.revision as number,
        "resolve",
        body,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
