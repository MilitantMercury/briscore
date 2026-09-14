"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomSync, type RoomReference } from "./use-room-sync";
import {
  calculateHandScore,
  type Hand,
  type HandInput,
} from "@/lib/game";
import type { Proposal, Room, RoomInvite } from "@/lib/room-types";
import { supabase } from "@/lib/supabase-browser";
import { api, RequestError } from "@/lib/api-client";

const storageKey = "briscore-room-v2:";
const pendingRoomKey = "briscore-pending-room";
export function useGame() {
  const [room, setRoom] = useState<Room | null>(null);
  const [credentials, setCredentials] = useState<RoomReference | null>(null);
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);
  const [message, setMessage] = useState("");
  const [editor, setEditorState] = useState<Hand | "new" | null>(null);
  const [editorRevision, setEditorRevision] = useState<number | null>(null);
  const [oldest, setOldest] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const host = !!room && room.hostId === userId;
  const playerId = room?.members.find(
    (member) => member.userId === userId,
  )?.playerId;
  const author =
    room?.session.players.find((player) => player.id === playerId)?.name || "";
  function setEditor(next: Hand | "new" | null) {
    setEditorState(next);
    setEditorRevision(next === null ? null : (room?.revision ?? null));
  }
  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) {
          setUserId(session?.user.id ?? null);
          setAuthReady(true);
        }
      },
    );
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setUserId(data.session?.user.id ?? null);
        setAuthReady(true);
        if (error) setMessage("Sessione non disponibile. Accedi di nuovo.");
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    setRoom(null);
    setInvite(null);
    setEditorState(null);
    setEditorRevision(null);
    setCredentials(null);
    setOnline(false);
    if (!userId) {
      setReady(false);
      return;
    }
    let saved: RoomReference | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey + userId) || "null");
    } catch {
      /* Resume is optional. */
    }
    const params = new URLSearchParams(window.location.search);
    const id = params.get("room");
    let pending: RoomReference | null = null;
    try {
      pending = JSON.parse(localStorage.getItem(pendingRoomKey) || "null");
    } catch {
      /* Resume is optional. */
    }
    const reference = id
      ? { id, inviteToken: params.get("invite") || undefined }
      : pending || saved;
    if (reference && /^[a-f0-9-]{36}$/i.test(reference.id)) {
      setCredentials(reference);
    } else if (reference) {
      setMessage(
        "Questa è una vecchia partita locale. Crea una nuova stanza Supabase.",
      );
    }
    if (pending) {
      try {
        localStorage.removeItem(pendingRoomKey);
      } catch {
        /* Optional browser resume. */
      }
    }
    setReady(true);
  }, [userId]);
  useEffect(() => {
    if (
      !message.startsWith("Proposta inviata") &&
      !message.startsWith("Partita aggiornata") &&
      !message.startsWith("Proposta approvata") &&
      !message.startsWith("Proposta rifiutata")
    )
      return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const acceptRoom = useCallback((next: Room) => {
    setRoom((current) =>
      !current || current.id !== next.id || next.revision >= current.revision
        ? next
        : current,
    );
  }, []);
  useRoomSync(
    credentials,
    userId,
    acceptRoom,
    setInvite,
    setOnline,
    setMessage,
  );
  useEffect(() => {
    if (editor && !dialog.current?.open) dialog.current?.showModal();
    if (!editor && dialog.current?.open) dialog.current.close();
  }, [editor]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Operazione non riuscita.",
      );
      if (error instanceof RequestError && error.status === 409 && room) {
        try {
          const latest = await api<Room>(`/api/rooms/${room.id}`);
          acceptRoom(latest);
          setEditorRevision(latest.revision);
        } catch {
          setOnline(false);
        }
      }
    } finally {
      setBusy(false);
    }
  }
  function remember(next: RoomReference) {
    setCredentials(next);
    try {
      localStorage.setItem(storageKey + userId, JSON.stringify(next));
    } catch {
      /* The account still owns the room. */
    }
    const query = new URLSearchParams({ room: next.id });
    if (next.inviteToken) query.set("invite", next.inviteToken);
    window.history.replaceState(null, "", "?" + query.toString());
  }
  async function start() {
    await run(async () => {
      const result = await api<{ room: Room }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({}),
      });
      remember({ id: result.room.id, inviteToken: result.room.inviteToken });
      acceptRoom(result.room);
      setOnline(true);
    });
  }
  async function join(playerId: string, name: string) {
    await run(async () => {
      const next = await api<Room>(`/api/rooms/${credentials!.id}/join`, {
        method: "POST",
        body: JSON.stringify({
          inviteToken: credentials!.inviteToken,
          playerId,
          name,
        }),
      });
      acceptRoom(next);
      setInvite(null);
      setOnline(true);
      remember({ ...credentials! });
    });
  }
  async function change(kind: Proposal["kind"], hand: Hand) {
    if (!room) return;
    await run(async () => {
      const next = await api<Room>(
        `/api/rooms/${room.id}${host ? "" : "/proposals"}`,
        {
          method: host ? "PUT" : "POST",
          body: JSON.stringify({
            revision:
              editor && kind !== "delete" ? editorRevision : room.revision,
            ...(host ? { action: kind } : { kind }),
            hand,
          }),
        },
      );
      acceptRoom(next);
      setEditor(null);
      setMessage(
        host
          ? "Partita aggiornata per tutti."
          : "Proposta inviata. In attesa dell’host.",
      );
    });
  }
  function save(input: HandInput) {
    const initial = editor && editor !== "new" ? editor : undefined;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const hand: Hand = {
      ...input,
      id: initial?.id || id,
      createdAt: initial?.createdAt || new Date().toISOString(),
      results: calculateHandScore(room!.session.players, input),
    };
    void change(initial ? "edit" : "add", hand);
  }
  async function resolve(proposal: Proposal, approve: boolean) {
    await run(async () => {
      acceptRoom(
        await api<Room>(`/api/rooms/${room!.id}/proposals`, {
          method: "PATCH",
          body: JSON.stringify({
            revision: room!.revision,
            proposalId: proposal.id,
            approve,
          }),
        }),
      );
      setMessage(
        approve
          ? "Proposta approvata. Punti aggiornati."
          : "Proposta rifiutata.",
      );
    });
  }
  async function resetRoom() {
    await run(async () => {
      acceptRoom(
        await api<Room>(`/api/rooms/${room!.id}`, {
          method: "PUT",
          body: JSON.stringify({ revision: room!.revision, action: "reset" }),
        }),
      );
    });
  }
  async function continueRound() {
    await run(async () => acceptRoom(await api<Room>(`/api/rooms/${room!.id}`, { method: "PUT", body: JSON.stringify({ revision: room!.revision, action: "continue_round" }) })));
  }
  async function completeRoom() {
    await run(async () => acceptRoom(await api<Room>(`/api/rooms/${room!.id}`, { method: "PUT", body: JSON.stringify({ revision: room!.revision, action: "complete" }) })));
  }
  function leave() {
    if (
      room &&
      !window.confirm(
        "Tornare alle tue partite? Potrai riaprire questo tavolo dal tuo account.",
      )
    )
      return;
    setRoom(null);
    setCredentials(null);
    setInvite(null);
    setEditor(null);
    setMessage("");
    try {
      localStorage.removeItem(storageKey + userId);
    } catch {
      /* Optional browser resume. */
    }
    window.history.replaceState(null, "", "/");
  }
  async function signOut() {
    await run(async () => {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setRoom(null);
      setCredentials(null);
      setInvite(null);
      setEditor(null);
    });
  }
  async function share() {
    const token = room!.inviteToken || credentials?.inviteToken;
    if (!token) {
      setMessage("Chiedi all’host il link di invito.");
      return;
    }
    const query = new URLSearchParams({ room: room!.id, invite: token });
    const url = `${window.location.origin}/?${query}`;
    try {
      if (navigator.share)
        await navigator.share({ title: "Briscore — entra al tavolo", url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copiato. Invialo agli altri giocatori.");
      }
    } catch {
      setMessage(`Link della partita: ${url}`);
    }
  }
  return {
    room,
    credentials,
    invite,
    ready,
    busy,
    online,
    message,
    setMessage,
    editor,
    setEditor,
    oldest,
    setOldest,
    showStats,
    setShowStats,
    userId,
    authReady,
    dialog,
    host,
    author,
    remember,
    start,
    join,
    change,
    save,
    resolve,
    resetRoom,
    continueRound,
    completeRoom,
    leave,
    signOut,
    share,
  };
}
