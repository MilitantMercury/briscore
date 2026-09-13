import test from "node:test";
import assert from "node:assert/strict";
import { calculateHandScore, type Hand, type Session } from "../src/lib/game";
import type { Room } from "../src/lib/rooms";
const base = process.env.BRISCORE_TEST_URL || "http://localhost:3000";
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}
test("stanza condivisa: approvazioni host, conflitti, edit, delete e ripristino", async () => {
  const session: Session = {
    version: 1,
    createdAt: new Date().toISOString(),
    players: ["Test A", "Test B", "Test C", "Test D", "Test E"].map(
      (name, i) => ({ id: `p${i}`, name }),
    ),
    hands: [],
  };
  const created = await request("/api/rooms", "POST", session);
  assert.equal(created.status, 201);
  let room: Room = created.data.room;
  const token: string = created.data.token;
  const url = `/api/rooms/${room.id}`;
  const hand: Hand = {
    id: "integration-hand",
    createdAt: new Date().toISOString(),
    callerId: "p0",
    calledPlayerId: "p1",
    callType: "double",
    callerWon: true,
    results: [],
  };
  hand.results = calculateHandScore(session.players, hand);
  const proposed = await request(`${url}/proposals`, "POST", {
    author: "Test B",
    kind: "add",
    hand,
  });
  assert.equal(proposed.status, 200);
  assert.equal(
    proposed.data.session.hands.length,
    0,
    "una proposta non cambia i punti",
  );
  const proposalId = proposed.data.proposals[0].id;
  assert.equal(
    (await request(`${url}/proposals`, "PATCH", { proposalId, approve: true }))
      .status,
    400,
  );
  assert.equal(
    (await request(url, "PUT", { revision: 1, session })).status,
    403,
  );
  room = (
    await request(
      `${url}/proposals`,
      "PATCH",
      { proposalId, approve: true },
      token,
    )
  ).data;
  assert.equal(room.session.hands.length, 1);
  assert.deepEqual(
    room.session.hands[0].results.map((r) => r.delta),
    [4, 2, -2, -2, -2],
  );
  const observer = await request(url);
  assert.deepEqual(
    observer.data,
    room,
    "un altro client vede la stessa snapshot",
  );
  assert.equal(Object.hasOwn(observer.data, "editorHash"), false);
  assert.equal(Object.hasOwn(observer.data, "token"), false);
  assert.equal(
    (await request(url, "PUT", { revision: 0, session }, token)).status,
    409,
  );
  const edited = { ...hand, callerWon: false };
  room = (
    await request(`${url}/proposals`, "POST", {
      author: "Test C",
      kind: "edit",
      hand: edited,
    })
  ).data;
  const editId = room.proposals[0].id;
  room = (
    await request(
      `${url}/proposals`,
      "PATCH",
      { proposalId: editId, approve: true },
      token,
    )
  ).data;
  assert.equal(room.session.hands[0].results[0].delta, -4);
  room = (
    await request(`${url}/proposals`, "POST", {
      author: "Test D",
      kind: "delete",
      hand: edited,
    })
  ).data;
  const deleteId = room.proposals[0].id;
  // A direct host edit invalidates an older participant proposal.
  const updatedHand = { ...edited, callType: "triple" as const };
  room = (
    await request(
      url,
      "PUT",
      {
        revision: room.revision,
        session: { ...room.session, hands: [updatedHand] },
      },
      token,
    )
  ).data;
  assert.equal(
    (
      await request(
        `${url}/proposals`,
        "PATCH",
        { proposalId: deleteId, approve: true },
        token,
      )
    ).status,
    400,
  );
  room = (
    await request(
      `${url}/proposals`,
      "PATCH",
      { proposalId: deleteId, approve: false },
      token,
    )
  ).data;
  assert.equal(room.proposals.length, 0);
  room = (
    await request(`${url}/proposals`, "POST", {
      author: "Test E",
      kind: "delete",
      hand: updatedHand,
    })
  ).data;
  room = (
    await request(
      `${url}/proposals`,
      "PATCH",
      { proposalId: room.proposals[0].id, approve: true },
      token,
    )
  ).data;
  assert.equal(room.session.hands.length, 0);
  const concurrent = await Promise.all([
    request(
      url,
      "PUT",
      { revision: room.revision, session: room.session },
      token,
    ),
    request(
      url,
      "PUT",
      { revision: room.revision, session: room.session },
      token,
    ),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await request(url)).data.session.hands.length, 0);
  const invalid = await request(`${url}/proposals`, "POST", {
    author: "Test E",
    kind: "add",
    hand: { ...hand, callType: "carichi" },
  });
  assert.equal(
    invalid.status,
    400,
    "Carichi con un chiamato è rifiutata anche dal server",
  );
});
