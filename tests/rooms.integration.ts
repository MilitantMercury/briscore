import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateHandScore, type Hand } from "../src/lib/game";
import type { Room } from "../src/lib/room-types";

const base = process.env.BRISCORE_TEST_URL || "http://localhost:3100";
const enabled = process.env.BRISCORE_ALLOW_REMOTE_TESTS === "1";

test(
  "Supabase: cinque account, RLS, host, proposte, conflitti, capotto e Realtime",
  { skip: !enabled, timeout: 180000 },
  async (t) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const ref = new URL(url).hostname.split(".")[0];
    assert.equal(
      ref,
      "aauikdqmbdddnvfyrnhg",
      "test remoto limitato al progetto Briscore autorizzato",
    );
    // CLI credential stays in process memory, never in logs, source or environment files.
    let rawKeys: string;
    try {
      rawKeys = execFileSync(
        "supabase",
        ["projects", "api-keys", "--project-ref", ref, "-o", "json"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch {
      throw new Error(
        "Accesso CLI Supabase richiesto per creare le fixture isolate.",
      );
    }
    const keys = JSON.parse(rawKeys) as { name: string; api_key: string }[];
    const serviceKey = keys.find(
      (entry) => entry.name === "service_role",
    )?.api_key;
    assert.ok(
      serviceKey,
      "credenziale amministrativa disponibile solo per fixture",
    );
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const users: { id: string; token: string; client: SupabaseClient }[] = [];
    const roomIds: string[] = [];
    const channels: {
      client: SupabaseClient;
      channel: ReturnType<SupabaseClient["channel"]>;
    }[] = [];
    t.after(async () => {
      for (const { client, channel } of channels)
        await client.removeChannel(channel);
      for (const user of users) user.client.realtime.disconnect();
      for (const id of roomIds) {
        const { error } = await admin.from("rooms").delete().eq("id", id);
        assert.equal(error, null, "pulizia stanza di test");
      }
      for (const user of users) {
        const { error } = await admin.auth.admin.deleteUser(user.id);
        assert.equal(error, null, "pulizia account di test");
      }
    });
    const runId = randomUUID();
    for (let i = 0; i < 6; i++) {
      const email = `briscore-test-${runId}-${i}@example.invalid`;
      const password = randomBytes(24).toString("base64url");
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { briscore_test: runId },
      });
      assert.equal(error, null);
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const entry = { id: data.user!.id, token: "", client };
      users.push(entry);
      const login = await client.auth.signInWithPassword({ email, password });
      assert.equal(login.error, null);
      entry.token = login.data.session!.access_token;
    }
    async function request(
      path: string,
      method = "GET",
      body?: unknown,
      actor?: number,
    ) {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(actor !== undefined
            ? { Authorization: `Bearer ${users[actor].token}` }
            : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    }
    const players = ["Test Host", "Test B", "Test C", "Test D", "Test E"].map(
      (name, i) => ({ id: `p${i}`, name }),
    );
    assert.equal((await request("/api/rooms")).status, 401);
    assert.equal(
      (await request("/api/rooms", "POST", { players })).status,
      401,
    );
    const invalidToken = await fetch(base + "/api/rooms", {
      headers: { Authorization: "Bearer invalid" },
    });
    assert.equal(invalidToken.status, 401);
    assert.equal(
      (await request("/api/rooms", "POST", { players: players.slice(1) }, 0))
        .status,
      400,
    );
    const created = await request("/api/rooms", "POST", { players }, 0);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    let room = created.data.room as Room;
    roomIds.push(room.id);
    const path = `/api/rooms/${room.id}`;
    const inviteToken = room.inviteToken!;
    assert.equal(room.hostId, users[0].id);
    assert.equal(room.members[0].userId, users[0].id);
    assert.equal(room.members[0].playerId, room.session.players[0].id);
    assert.equal((await request(path, "GET", undefined, 1)).status, 403);
    const hidden = await users[5].client
      .from("rooms")
      .select("*")
      .eq("id", room.id);
    assert.deepEqual(hidden.data, [], "RLS nasconde le stanze agli esterni");
    const unauthorizedWrite = await users[0].client
      .from("rooms")
      .update({ revision: 999 })
      .eq("id", room.id);
    assert.ok(unauthorizedWrite.error, "nemmeno l’host può bypassare le RPC");
    const preview = await request(path + "/join", "POST", { inviteToken }, 1);
    assert.equal(preview.status, 200);
    assert.equal(Object.hasOwn(preview.data, "session"), false);
    assert.equal(
      (await request(path + "/join", "POST", { inviteToken: randomUUID() }, 1))
        .status,
      404,
    );
    for (let i = 1; i < 5; i++) {
      const joined = await request(
        path + "/join",
        "POST",
        { inviteToken, playerId: room.session.players[i].id },
        i,
      );
      assert.equal(joined.status, 200, JSON.stringify(joined.data));
      room = joined.data;
    }
    assert.equal(room.members.length, 5);
    assert.equal(
      (
        await request(
          path + "/join",
          "POST",
          { inviteToken, playerId: room.session.players[1].id },
          5,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          path + "/proposals",
          "POST",
          { revision: room.revision },
          5,
        )
      ).status,
      403,
    );
    for (const [suffix, method] of [
      ["", "GET"],
      ["", "PUT"],
      ["/join", "POST"],
      ["/proposals", "POST"],
      ["/proposals", "PATCH"],
    ]) {
      assert.equal(
        (
          await request(
            path + suffix,
            method,
            method === "GET" ? undefined : {},
          )
        ).status,
        401,
      );
    }
    const member = users[1].client;
    await member.realtime.setAuth(users[1].token);
    let eventCount = 0;
    let nextEvent: (() => void) | undefined;
    const channel = member
      .channel("integration-" + runId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        () => {
          eventCount++;
          nextEvent?.();
        },
      );
    channels.push({ client: member, channel });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Realtime subscription timeout")),
        15000,
      );
      channel.subscribe((status, error) => {
        console.info("Realtime subscription:", status, error?.message || "");
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        } else if (status === "CHANNEL_ERROR") {
          clearTimeout(timeout);
          reject(new Error("Realtime subscription failed"));
        }
      });
    });
    const eventReceived = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Realtime event not delivered")),
        15000,
      );
      nextEvent = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
    // Attach rejection immediately so a failure is reported by the test, not unhandled.
    void eventReceived.catch(() => {});
    const hand: Hand = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      callerId: room.session.players[0].id,
      calledPlayerId: room.session.players[1].id,
      callType: "double",
      callerWon: true,
      capotto: true,
      results: [],
    };
    const proposed = await request(
      path + "/proposals",
      "POST",
      { revision: room.revision, kind: "add", author: "FORGED HOST", hand },
      1,
    );
    assert.equal(proposed.status, 200, JSON.stringify(proposed.data));
    room = proposed.data;
    assert.equal(room.session.hands.length, 0);
    assert.equal(
      room.proposals[0].author,
      "Test B",
      "autore derivato dall’account, non dal payload",
    );
    assert.deepEqual(
      room.proposals[0].hand.results.map((r) => r.delta),
      [8, 4, -4, -4, -4],
    );
    await eventReceived;
    assert.ok(eventCount > 0);
    assert.equal(
      (
        await request(
          path + "/proposals",
          "PATCH",
          {
            revision: room.revision,
            proposalId: room.proposals[0].id,
            approve: true,
          },
          1,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          path,
          "PUT",
          { revision: room.revision, action: "add", hand },
          1,
        )
      ).status,
      403,
    );
    const approved = await request(
      path + "/proposals",
      "PATCH",
      {
        revision: room.revision,
        proposalId: room.proposals[0].id,
        approve: true,
      },
      0,
    );
    assert.equal(approved.status, 200, JSON.stringify(approved.data));
    room = approved.data;
    assert.deepEqual(
      room.session.hands[0].results.map((r) => r.delta),
      [8, 4, -4, -4, -4],
    );
    for (let i = 0; i < 5; i++) {
      const snapshot = await request(path, "GET", undefined, i);
      assert.equal(snapshot.status, 200);
      assert.deepEqual(
        snapshot.data.session,
        room.session,
        "ogni account vede lo stesso storico",
      );
      if (i > 0) assert.equal(snapshot.data.inviteToken, undefined);
    }
    const staleRevision = room.revision;
    const solo: Hand = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      callerId: room.session.players[0].id,
      callType: "carichi",
      callerWon: true,
      capotto: true,
      results: [],
    };
    room = (
      await request(
        path,
        "PUT",
        { revision: room.revision, action: "add", hand: solo },
        0,
      )
    ).data;
    assert.deepEqual(
      room.session.hands[1].results.map((r) => r.delta),
      [8, -2, -2, -2, -2],
    );
    assert.equal(
      (
        await request(
          path,
          "PUT",
          { revision: staleRevision, action: "reset" },
          0,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          path,
          "PUT",
          {
            revision: room.revision,
            action: "add",
            hand: {
              ...solo,
              id: randomUUID(),
              calledPlayerId: hand.calledPlayerId,
            },
          },
          0,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          path,
          "PUT",
          {
            revision: room.revision,
            action: "edit",
            hand: { ...solo, callerWon: false },
          },
          0,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          path,
          "PUT",
          {
            revision: room.revision,
            action: "edit",
            hand: { ...solo, capotto: "yes" },
          },
          0,
        )
      ).status,
      400,
    );
    room = (
      await request(
        path + "/proposals",
        "POST",
        { revision: room.revision, kind: "delete", hand },
        2,
      )
    ).data;
    const staleProposalId = room.proposals[0].id;
    room = (
      await request(
        path,
        "PUT",
        {
          revision: room.revision,
          action: "edit",
          hand: { ...hand, callType: "triple" },
        },
        0,
      )
    ).data;
    assert.equal(
      (
        await request(
          path + "/proposals",
          "PATCH",
          {
            revision: room.revision,
            proposalId: staleProposalId,
            approve: true,
          },
          0,
        )
      ).status,
      409,
    );
    room = (
      await request(
        path + "/proposals",
        "PATCH",
        {
          revision: room.revision,
          proposalId: staleProposalId,
          approve: false,
        },
        0,
      )
    ).data;
    assert.equal(room.proposals.length, 0);
    const competing = await Promise.all([
      request(
        path,
        "PUT",
        {
          revision: room.revision,
          action: "edit",
          hand: { ...solo, capotto: false },
        },
        0,
      ),
      request(
        path,
        "PUT",
        { revision: room.revision, action: "delete", hand: solo },
        0,
      ),
    ]);
    assert.deepEqual(
      competing.map((result) => result.status).sort(),
      [200, 409],
    );
    room = (await request(path, "GET", undefined, 0)).data;
    room = (
      await request(
        path,
        "PUT",
        { revision: room.revision, action: "reset" },
        0,
      )
    ).data;
    assert.equal(room.session.hands.length, 0);
    assert.equal(room.members.length, 5);
    const reopened = await request("/api/rooms", "GET", undefined, 4);
    assert.ok(
      reopened.data.some((entry: { id: string }) => entry.id === room.id),
    );
    // Pure score contract remains independent of server storage.
    assert.deepEqual(
      calculateHandScore(room.session.players, solo).map((r) => r.delta),
      [8, -2, -2, -2, -2],
    );
  },
);
