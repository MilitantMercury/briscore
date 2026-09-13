import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateHandScore,
  parseSession,
  standings,
  validatePlayers,
  type CallType,
  type HandInput,
  type Session,
} from "../src/lib/game";
const players = ["Andrea", "Luca", "Marco", "Ale", "Matteo"].map((name, i) => ({
  id: String(i),
  name,
}));
const cases: [CallType, boolean, number[]][] = [
  ["normal", true, [2, 1, -1, -1, -1]],
  ["normal", false, [-2, -1, 1, 1, 1]],
  ["double", true, [4, 2, -2, -2, -2]],
  ["double", false, [-4, -2, 2, 2, 2]],
  ["triple", true, [6, 3, -3, -3, -3]],
  ["triple", false, [-6, -3, 3, 3, 3]],
  ["carichi", true, [4, -1, -1, -1, -1]],
  ["carichi", false, [-4, 1, 1, 1, 1]],
];
for (const [callType, callerWon, expected] of cases)
  test(`${callType}: ${callerWon ? "vinta" : "persa"}`, () => {
    const input = {
      callerId: "0",
      ...(callType !== "carichi" ? { calledPlayerId: "1" } : {}),
      callType,
      callerWon,
    };
    const result = calculateHandScore(players, input);
    assert.deepEqual(
      result.map((r) => r.delta),
      expected,
    );
    assert.equal(
      result.reduce((s, r) => s + r.delta, 0),
      0,
    );
  });
test("somma zero per ogni combinazione di ruoli ed esiti", () => {
  for (const [callType, callerWon] of cases)
    for (const caller of players)
      for (const called of players.filter((p) => p.id !== caller.id)) {
        const result = calculateHandScore(players, {
          callerId: caller.id,
          ...(callType === "carichi" ? {} : { calledPlayerId: called.id }),
          callType,
          callerWon,
        });
        assert.equal(
          result.reduce((sum, r) => sum + r.delta, 0),
          0,
        );
      }
});
const valid: HandInput = {
  callerId: "0",
  calledPlayerId: "1",
  callType: "normal",
  callerWon: true,
};
test("rifiuta stesso chiamante/chiamato, chiamante assente e chiamato in Carichi", () => {
  assert.throws(() =>
    calculateHandScore(players, { ...valid, calledPlayerId: "0" }),
  );
  assert.throws(() =>
    calculateHandScore(players, { ...valid, callerId: "missing" }),
  );
  assert.throws(() =>
    calculateHandScore(players, { ...valid, callType: "carichi" }),
  );
  assert.throws(() =>
    calculateHandScore(players, { ...valid, calledPlayerId: undefined }),
  );
});
test("rifiuta numero giocatori errato, nomi vuoti e duplicati normalizzati", () => {
  assert.throws(() => validatePlayers(players.slice(1)));
  assert.throws(() =>
    validatePlayers(
      players.map((p, i) => (i === 1 ? { ...p, name: "  " } : p)),
    ),
  );
  assert.throws(() =>
    validatePlayers(
      players.map((p, i) => (i === 1 ? { ...p, name: " ANDREA " } : p)),
    ),
  );
});
test("non accetta esiti mancanti e tipi sconosciuti", () => {
  assert.throws(() =>
    calculateHandScore(players, {
      ...valid,
      callerWon: undefined,
    } as unknown as HandInput),
  );
  assert.throws(() =>
    calculateHandScore(players, {
      ...valid,
      callType: "invalid",
    } as unknown as HandInput),
  );
});
test("raddoppia la mano vinta a capotto", () => {
  assert.deepEqual(
    calculateHandScore(players, {
      ...valid,
      callType: "triple",
      capotto: true,
    }).map((r) => r.delta),
    [12, 6, -6, -6, -6],
  );
  assert.deepEqual(
    calculateHandScore(players, { ...valid, capotto: true }).map(
      (r) => r.delta,
    ),
    [4, 2, -2, -2, -2],
  );
  assert.deepEqual(
    calculateHandScore(players, {
      ...valid,
      callType: "double",
      capotto: true,
    }).map((r) => r.delta),
    [8, 4, -4, -4, -4],
  );
  assert.deepEqual(
    calculateHandScore(players, {
      callerId: "0",
      callType: "carichi",
      callerWon: true,
      capotto: true,
    }).map((r) => r.delta),
    [8, -2, -2, -2, -2],
  );
  assert.throws(() =>
    calculateHandScore(players, { ...valid, callerWon: false, capotto: true }),
  );
  assert.throws(() =>
    calculateHandScore(players, {
      ...valid,
      capotto: "true",
    } as unknown as HandInput),
  );
});
test("ricalcola dal contenuto delle mani anche con delta salvati alterati", () => {
  const session: Session = {
    version: 1,
    players,
    createdAt: new Date().toISOString(),
    hands: [
      {
        ...valid,
        id: "h1",
        createdAt: new Date().toISOString(),
        results: [{ playerId: "0", delta: 999 }],
      },
    ],
  };
  assert.equal(standings(session)[0].score, 2);
  const restored = parseSession(JSON.stringify(session));
  assert.equal(restored.hands[0].results[0].delta, 2);
  const modified = {
    ...session,
    hands: [{ ...session.hands[0], callerWon: false }],
  };
  assert.equal(standings(modified).find((p) => p.id === "0")?.score, -2);
  assert.ok(standings({ ...session, hands: [] }).every((p) => p.score === 0));
});
