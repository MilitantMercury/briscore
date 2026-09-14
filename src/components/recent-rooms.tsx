"use client";
import { useEffect, useState } from "react";
import { api, RequestError } from "@/lib/api-client";
type RecentRoom = { id: string; created_at: string; updated_at: string };
export function RecentRooms({ onOpen }: { onOpen: (id: string) => void }) {
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = async (attempt = 0) => {
      try {
        const data = await api<RecentRoom[]>("/api/rooms");
        if (active) setRooms(data);
      } catch (reason) {
        // After an OAuth redirect, the browser can receive the session just after
        // this component mounts. Retry the one transient unauthorized request.
        if (
          active &&
          attempt === 0 &&
          reason instanceof RequestError &&
          reason.status === 401
        ) {
          retry = setTimeout(() => void load(1), 800);
          return;
        }
        if (active)
          setError("Non riesco a recuperare le tue partite. Riprova tra poco.");
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(retry);
    };
  }, []);
  if (!rooms.length && !error) return null;
  return (
    <section className="panel recent-rooms">
      <h2>Le tue partite</h2>
      {error && <p role="status">{error}</p>}
      {rooms.map((room) => (
        <button
          key={room.id}
          className="secondary"
          onClick={() => onOpen(room.id)}
        >
          Partita del{" "}
          {new Date(room.created_at).toLocaleString("it-IT", {
            dateStyle: "short",
            timeStyle: "short",
          })}{" "}
          →
        </button>
      ))}
    </section>
  );
}
