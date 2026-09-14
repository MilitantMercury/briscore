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
  onJoin: (playerId: string, name: string) => void;
  onBack: () => void;
}) {
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  return (
    <section className="panel setup-panel join-panel">
      <span className="eyebrow">IL TUO POSTO AL TAVOLO</span>
      <h2>Entra nella partita</h2>
      <p className="muted">
        Scegli un posto e indica il nome con cui vuoi comparire al tavolo.
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
              {player.occupied ? player.name : `Posto ${invite.players.indexOf(player) + 1}`}
              {player.occupied ? " · già al tavolo" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>Nome visualizzato<input value={name} maxLength={30} onChange={(event) => setName(event.target.value)} placeholder="Il tuo nome" /></label>
      <button
        className="primary full"
        disabled={busy || !playerId || !name.trim()}
        onClick={() => onJoin(playerId, name.trim())}
      >
        Entra al tavolo
      </button>
      <button className="text-button full" onClick={onBack}>
        Torna alle mie partite
      </button>
    </section>
  );
}
