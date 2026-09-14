import { formatScore, standings, type Session } from "@/lib/game";
import { PlayerAvatar } from "./player-avatar";

type Member = {
  userId: string;
  playerId: string | null;
  avatar?: string;
  avatarImage?: string;
  globalRank?: number;
};

export function Scoreboard({ session, members }: { session: Session; members: Member[] }) {
  const rows = standings(session);
  const leaderScore = rows[0]?.score;
  return (
    <section className="live-table">
      <div className="table-glow" aria-hidden="true" />
      <div className="table-heading">
        <div>
          <span className="eyebrow">TAVOLO IN DIRETTA</span>
          <h2>Il punteggio vive qui.</h2>
        </div>
        <span className="hands-counter"><b>{session.hands.length}</b> mani</span>
      </div>
      <div className="player-cards">
        {rows.map((player, index) => {
          const member = members.find((item) => item.playerId === player.id);
          const isLeader = player.score > 0 && player.score === leaderScore;
          return (
            <article className={`player-card ${isLeader ? "is-leading" : ""}`} key={player.id}>
              <span className="seat-number">{index + 1}</span>
              <PlayerAvatar name={player.name} avatar={member?.avatar} imagePath={member?.avatarImage} rank={member?.globalRank} size="large" />
              <div className="player-card-name">
                <b>{player.name}</b>
                {isLeader && <small>IN TESTA</small>}
              </div>
              <strong className={player.score > 0 ? "positive" : player.score < 0 ? "negative" : "neutral"}>{formatScore(player.score)}</strong>
            </article>
          );
        })}
      </div>
      <p className="table-mantra"><span>♣</span> Cinque giocatori. Un solo tavolo. <span>♦</span></p>
    </section>
  );
}
