import { requireUser } from "@/lib/auth-server";
import { apiError } from "@/lib/api-error";
import { leaderboard } from "@/lib/rooms";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { try { return Response.json(await leaderboard(await requireUser(request)), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return apiError(error); } }
