import { formatScore, standings, type Session } from "@/lib/game";
export function Scoreboard({ session }: { session: Session }) {
  const rows = standings(session);
  return (
    <section className="panel scoreboard">
      <div className="section-heading">
        <div>
          <span className="eyebrow">IL TAVOLO</span>
          <h2>Classifica</h2>
        </div>
        <span className="pill">
          {session.hands.length} {session.hands.length === 1 ? "mano" : "mani"}
        </span>
      </div>
      <div className="table-labels">
        <span>POS. / GIOCATORE</span>
        <span>PUNTI</span>
      </div>
      {rows.map((p) => (
        <div
          key={p.id}
          className={`score-row ${p.score > 0 && p.score === rows[0].score ? "leader" : ""}`}
        >
          <span className="rank">
            {rows.findIndex((r) => r.score === p.score) + 1}
          </span>
          <span
            className={`avatar color-${session.players.findIndex((player) => player.id === p.id)}`}
          >
            {p.name.slice(0, 1).toLocaleUpperCase("it")}
          </span>
          <span className="player-name">
            {p.name}
            {p.score > 0 && p.score === rows[0].score && (
              <small>IN TESTA ♛</small>
            )}
          </span>
          <strong
            className={
              p.score > 0 ? "positive" : p.score < 0 ? "negative" : "neutral"
            }
          >
            {formatScore(p.score)}
          </strong>
        </div>
      ))}
      <div className="score-footer">
        <span>Ognuno per sé. Tutti al tavolo.</span>
        <span>Σ 0</span>
      </div>
    </section>
  );
}
