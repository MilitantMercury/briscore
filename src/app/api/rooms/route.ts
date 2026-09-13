import { createRoom } from "@/lib/rooms";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 500_000)
      return Response.json(
        { error: "Sessione troppo grande." },
        { status: 413 },
      );
    return Response.json(await createRoom(JSON.parse(text)), { status: 201 });
  } catch {
    return Response.json(
      {
        error: "Impossibile creare la stanza. Controlla i giocatori e riprova.",
      },
      { status: 400 },
    );
  }
}
