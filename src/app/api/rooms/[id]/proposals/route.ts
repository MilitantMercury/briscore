import { propose, resolveProposal } from "@/lib/rooms";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const text = await request.text();
    if (text.length > 10_000) throw new Error("Richiesta troppo grande.");
    return Response.json(
      await propose((await context.params).id, JSON.parse(text)),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Richiesta non riuscita.",
      },
      { status: 400 },
    );
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { proposalId, approve } = await request.json();
    if (typeof approve !== "boolean" || typeof proposalId !== "string")
      throw new Error("Richiesta non valida.");
    return Response.json(
      await resolveProposal(
        (await context.params).id,
        request.headers.get("authorization")?.replace(/^Bearer /, "") || "",
        proposalId,
        approve,
      ),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Operazione non riuscita.",
      },
      { status: 400 },
    );
  }
}
