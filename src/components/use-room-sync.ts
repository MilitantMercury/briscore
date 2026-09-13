"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import { api, RequestError } from "@/lib/api-client";
import type { Room, RoomInvite } from "@/lib/room-types";

export type RoomReference = { id: string; inviteToken?: string };
export function useRoomSync(
  reference: RoomReference | null,
  userId: string | null,
  acceptRoom: (room: Room) => void,
  setInvite: (invite: RoomInvite | null) => void,
  setOnline: (online: boolean) => void,
  setError: (message: string) => void,
) {
  useEffect(() => {
    if (!reference || !userId) return;
    let active = true;
    let loading = false;
    let dirty = false;
    let connected = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const refresh = async () => {
      if (!active) return;
      if (loading) {
        dirty = true;
        return;
      }
      loading = true;
      try {
        const room = await api<Room>(`/api/rooms/${reference.id}`);
        if (!active) return;
        acceptRoom(room);
        setInvite(null);
        setOnline(true);
        if (!channel) subscribe();
      } catch (error) {
        if (!active) return;
        setOnline(false);
        if (
          error instanceof RequestError &&
          error.status === 403 &&
          reference.inviteToken
        ) {
          try {
            const invite = await api<RoomInvite>(
              `/api/rooms/${reference.id}/join`,
              {
                method: "POST",
                body: JSON.stringify({ inviteToken: reference.inviteToken }),
              },
            );
            if (active) {
              setInvite(invite);
              setError("");
            }
          } catch (inviteError) {
            if (active)
              setError(
                inviteError instanceof Error
                  ? inviteError.message
                  : "Invito non disponibile.",
              );
          }
        } else {
          setError(
            error instanceof Error
              ? error.message
              : "Connessione non disponibile.",
          );
        }
      } finally {
        loading = false;
        if (active && dirty) {
          dirty = false;
          void refresh();
        }
      }
    };
    const subscribe = () => {
      channel = supabase
        .channel(`room:${reference.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${reference.id}`,
          },
          () => {
            void refresh();
          },
        )
        .subscribe((status) => {
          connected = status === "SUBSCRIBED";
          if (connected)
            void refresh(); // Covers events between first fetch and subscription.
          else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (active) setOnline(false);
          }
        });
    };
    const recover = () => {
      void refresh();
    };
    const retry = () => {
      if (!active) return;
      if (!connected && document.visibilityState === "visible") void refresh();
      timer = setTimeout(retry, 10000);
    };
    void refresh();
    timer = setTimeout(retry, 10000);
    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", recover);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("online", recover);
      document.removeEventListener("visibilitychange", recover);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [reference, userId, acceptRoom, setInvite, setOnline, setError]);
}
