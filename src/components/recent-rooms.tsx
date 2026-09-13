"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
type RecentRoom = { id: string; created_at: string; updated_at: string };
export function RecentRooms({ onOpen }: { onOpen: (id: string) => void }) {
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<RecentRoom[]>("/api/rooms")
      .then((data) => {
        if (active) setRooms(data);
      })
      .catch(() => {
        if (active)
          setError("Non riesco a recuperare le tue partite. Riprova tra poco.");
      });
    return () => {
      active = false;
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
