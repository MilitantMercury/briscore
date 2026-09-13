import { getRoom, updateRoom } from "@/lib/rooms";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) {
  try {
    return Response.json(await getRoom((await context.params).id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Partita non trovata." }, { status: 404 });
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const text = await request.text();
    if (text.length > 500_000)
      return Response.json(
        { error: "Sessione troppo grande." },
        { status: 413 },
      );
    const { revision, session } = JSON.parse(text);
    return Response.json(
      await updateRoom(
        (await context.params).id,
        request.headers.get("authorization")?.replace(/^Bearer /, "") || "",
        revision,
        session,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status =
      message === "FORBIDDEN"
        ? 403
        : message === "CONFLICT"
          ? 409
          : message === "NOT_FOUND"
            ? 404
            : 400;
    return Response.json(
      {
        error:
          status === 409
            ? "La partita è stata aggiornata. Riprova sulla versione più recente."
            : status === 403
              ? "Solo il segnapunti può modificare la partita."
              : "Salvataggio non riuscito.",
      },
      { status },
    );
  }
}
