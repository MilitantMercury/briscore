"use client";
import { useState } from "react";
import {
  calls,
  calculateHandScore,
  formatScore,
  type Hand,
  type Session,
} from "@/lib/game";
export function History({
  session,
  onEdit,
  onDelete,
  busy,
}: {
  session: Session;
  onEdit: (hand: Hand) => void;
  onDelete: (hand: Hand) => void;
  busy: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    session.hands.at(-1)?.id ?? null,
  );
  return (
    <>
      {session.hands.map((hand, i) => {
        const expanded = expandedId === hand.id;
        const caller = session.players.find((p) => p.id === hand.callerId)?.name;
        const called = session.players.find((p) => p.id === hand.calledPlayerId)?.name;
        return (
        <article className={`history-hand ${expanded ? "is-expanded" : "is-collapsed"}`} key={hand.id}>
          <span className="hand-suit" aria-hidden="true">
            {["DENARI", "COPPE", "SPADE", "BASTONI"][i % 4]}
          </span>
          <button
            className="history-toggle"
            onClick={() => setExpandedId(expanded ? null : hand.id)}
            aria-expanded={expanded}
          >
            <span className="hand-number">Mano #{i + 1}</span>
            <span className="hand-summary">
              <b>{caller}</b>{hand.callType === "carichi" ? " gioca da solo" : <> chiama <b>{called}</b></>}
            </span>
            <span
              className={`result-tag ${hand.callerWon ? "positive" : "negative"}`}
            >
              {hand.callerWon ? "Vinta" : "Persa"}
              {hand.capotto ? " · Capotto" : ""} · {calls[hand.callType].label}
            </span>
            <span className="history-chevron" aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
          {expanded && (
            <div className="hand-detail">
              <div className="point-grid">
                {calculateHandScore(session.players, hand).map((r) => (
                  <div key={r.playerId}>
                    <span>
                      {session.players.find((p) => p.id === r.playerId)?.name}
                    </span>
                    <strong className={r.delta > 0 ? "positive" : "negative"}>
                      {formatScore(r.delta)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="hand-actions">
                <button className="hand-action hand-edit" disabled={busy} onClick={() => onEdit(hand)}>
                  ✎ Modifica
                </button>
                <button className="hand-action hand-delete" disabled={busy} onClick={() => onDelete(hand)}>
                  × Elimina
                </button>
              </div>
            </div>
          )}
        </article>
        );
      })}
    </>
  );
}
