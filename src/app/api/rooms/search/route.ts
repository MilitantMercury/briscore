import { apiError } from "@/lib/api-error";
import { findPublicRoom } from "@/lib/rooms";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() || "";
    return Response.json(await findPublicRoom(code), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
