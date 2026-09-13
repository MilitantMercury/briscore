export type Player = { id: string; name: string };
export type CallType = "normal" | "double" | "triple" | "carichi";
export type HandResult = { playerId: string; delta: number };
export type HandInput = {
  callerId: string;
  calledPlayerId?: string;
  callType: CallType;
  callerWon: boolean;
  capotto?: boolean;
};
export type Hand = HandInput & {
  id: string;
  createdAt: string;
  results: HandResult[];
};
export type Session = {
  version: 1;
  players: Player[];
  hands: Hand[];
  createdAt: string;
};
export const calls: Record<
  CallType,
  { label: string; multiplier: number; description: string }
> = {
  normal: { label: "Normale", multiplier: 1, description: "Meno di 70" },
  double: { label: "70–79", multiplier: 2, description: "Si raddoppia" },
  triple: { label: "80+", multiplier: 3, description: "Si triplica" },
  carichi: { label: "Carichi", multiplier: 1, description: "Uno contro tutti" },
};
export function validatePlayers(players: Player[]) {
  if (players.length !== 5 || players.some((p) => !p.id || !p.name.trim()))
    throw new Error("Inserisci tutti e 5 i giocatori.");
  if (
    new Set(players.map((p) => p.name.trim().toLocaleLowerCase("it"))).size !==
    5
  )
    throw new Error("I nomi dei giocatori devono essere diversi.");
  if (new Set(players.map((p) => p.id)).size !== 5)
    throw new Error("Identificativi dei giocatori non validi.");
}
export function calculateHandScore(
  players: Player[],
  input: HandInput,
): HandResult[] {
  validatePlayers(players);
  if (
    !Object.hasOwn(calls, input.callType) ||
    typeof input.callerWon !== "boolean"
  )
    throw new Error("Completa chiamata ed esito.");
  if (!players.some((p) => p.id === input.callerId))
    throw new Error("Scegli il chiamante.");
  if (input.callType === "carichi") {
    if (input.calledPlayerId !== undefined)
      throw new Error("Carichi non prevede un chiamato.");
  } else if (
    !players.some((p) => p.id === input.calledPlayerId) ||
    input.callerId === input.calledPlayerId
  ) {
    throw new Error("Scegli un chiamato diverso dal chiamante.");
  }
  if (input.capotto !== undefined && typeof input.capotto !== "boolean")
    throw new Error("Il capotto deve essere un valore booleano.");
  if (input.capotto && !input.callerWon)
    throw new Error("Il capotto vale solo con una vittoria.");
  const sign = input.callerWon ? 1 : -1;
  const capottoMultiplier = input.capotto ? 2 : 1;
  const multiplier = calls[input.callType].multiplier;
  const results = players.map((p) => ({
    playerId: p.id,
    delta:
      sign *
      multiplier *
      capottoMultiplier *
      (p.id === input.callerId
        ? input.callType === "carichi"
          ? 4
          : 2
        : p.id === input.calledPlayerId
          ? 1
          : -1),
  }));
  if (results.reduce((sum, r) => sum + r.delta, 0) !== 0)
    throw new Error("Totale variazioni diverso da 0: mano bloccata.");
  return results;
}
export function standings(session: Session) {
  const totals = new Map(session.players.map((p) => [p.id, 0]));
  session.hands.forEach((h) =>
    calculateHandScore(session.players, h).forEach((r) =>
      totals.set(r.playerId, totals.get(r.playerId)! + r.delta),
    ),
  );
  return session.players
    .map((p) => ({ ...p, score: totals.get(p.id)! }))
    .sort((a, b) => b.score - a.score);
}
export function parseSession(raw: string): Session {
  const s = JSON.parse(raw) as Session;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.players) ||
    !Array.isArray(s.hands) ||
    !s.createdAt ||
    !Number.isFinite(Date.parse(s.createdAt))
  )
    throw new Error("Sessione salvata non valida.");
  validatePlayers(s.players);
  const ids = new Set<string>();
  s.hands = s.hands.map((h) => {
    if (
      !h.id ||
      ids.has(h.id) ||
      !h.createdAt ||
      !Number.isFinite(Date.parse(h.createdAt))
    )
      throw new Error("Storico non valido.");
    ids.add(h.id);
    return { ...h, results: calculateHandScore(s.players, h) };
  });
  return s;
}
export const formatScore = (score: number) =>
  score > 0 ? `+${score}` : `${score}`;
