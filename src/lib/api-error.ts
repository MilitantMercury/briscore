const messages: Record<string, string> = {
  UNAUTHORIZED: "Accedi per continuare.",
  FORBIDDEN: "Non fai parte di questa stanza. Usa il link di invito.",
  HOST_ONLY: "Solo l’host può approvare o modificare lo storico.",
  CONFLICT: "La partita è stata aggiornata. Controlla i nuovi dati e riprova.",
  STALE_PROPOSAL:
    "La mano è cambiata: rifiuta la proposta e chiedine una nuova.",
  PROPOSAL_RESOLVED: "Questa proposta è già stata gestita.",
  SEAT_TAKEN: "Questo posto è già occupato. Scegline un altro.",
  INVALID_INVITE: "Link di invito non valido.",
  INVALID_HAND:
    "La mano non è valida. Controlla chiamante, chiamato, esito e capotto.",
  INVALID_PLAYERS: "Inserisci cinque nomi diversi, da 1 a 30 caratteri.",
  INVALID_ACTION: "Operazione non valida.",
  HAND_NOT_FOUND: "Mano non disponibile o già inserita.",
  RATE_LIMIT: "Troppe richieste. Attendi prima di riprovare.",
  SERVER_CONFIG: "Supabase non è configurato sul server.",
};
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(messages[code] || "Operazione non riuscita.");
  }
  static fromDatabase(error: { code?: string; message: string }) {
    const status = error.code?.startsWith("PT")
      ? Number(error.code.slice(2))
      : error.code === "23505"
        ? 409
        : 400;
    return new ApiError(error.message, status);
  }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return Response.json(
      { code: error.code, error: error.message },
      { status: error.status },
    );
  return Response.json(
    {
      code: "INVALID_REQUEST",
      error: "Richiesta non valida o servizio non disponibile.",
    },
    { status: 400 },
  );
}
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 20_000) throw new ApiError("INVALID_ACTION", 413);
  const body = JSON.parse(text);
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError("INVALID_ACTION", 400);
  return body;
}
