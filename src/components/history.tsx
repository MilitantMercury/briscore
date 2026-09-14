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
  return (
    <>
      {session.hands.map((hand, i) => (
        <article className="history-hand" key={hand.id}>
          <span className="hand-suit" aria-hidden="true">
            {["DENARI", "COPPE", "SPADE", "BASTONI"][i % 4]}
          </span>
          <div className="section-heading">
            <span className="hand-number">Mano #{i + 1}</span>
            <span
              className={`result-tag ${hand.callerWon ? "positive" : "negative"}`}
            >
              {hand.callerWon ? "Vinta" : "Persa"}
              {hand.capotto ? " · Capotto" : ""} · {calls[hand.callType].label}
            </span>
          </div>
          <p>
            <b>{session.players.find((p) => p.id === hand.callerId)?.name}</b>
            {hand.callType === "carichi" ? (
              " gioca da solo"
            ) : (
              <>
                {" "}
                chiama{" "}
                <b>
                  {
                    session.players.find((p) => p.id === hand.calledPlayerId)
                      ?.name
                  }
                </b>
              </>
            )}
          </p>
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
            <button disabled={busy} onClick={() => onEdit(hand)}>
              Modifica
            </button>
            <button disabled={busy} onClick={() => onDelete(hand)}>
              Elimina
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
