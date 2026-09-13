"use client";
import { useState } from "react";
import type { RoomInvite } from "@/lib/room-types";
export function JoinRoom({
  invite,
  busy,
  onJoin,
  onBack,
}: {
  invite: RoomInvite;
  busy: boolean;
  onJoin: (playerId: string) => void;
  onBack: () => void;
}) {
  const [playerId, setPlayerId] = useState("");
  return (
    <section className="panel setup-panel join-panel">
      <span className="eyebrow">IL TUO POSTO AL TAVOLO</span>
      <h2>Entra nella partita</h2>
      <p className="muted">
        Scegli il tuo nome. Questo posto verrà associato al tuo account.
      </p>
      <label>
        Giocatore
        <select
          value={playerId}
          onChange={(event) => setPlayerId(event.target.value)}
        >
          <option value="">Scegli il tuo nome</option>
          {invite.players.map((player) => (
            <option
              key={player.id}
              value={player.id}
              disabled={player.occupied}
            >
              {player.name}
              {player.occupied ? " · già al tavolo" : ""}
            </option>
          ))}
        </select>
      </label>
      <button
        className="primary full"
        disabled={busy || !playerId}
        onClick={() => onJoin(playerId)}
      >
        Entra al tavolo
      </button>
      <button className="text-button full" onClick={onBack}>
        Torna alle mie partite
      </button>
    </section>
  );
}
