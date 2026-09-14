import { requireUser } from "@/lib/auth-server";
import { apiError, readBody } from "@/lib/api-error";
import { createRoom, listRooms } from "@/lib/rooms";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await readBody(request);
    return Response.json(
      { room: await createRoom(auth) },
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
