"use client";
import { useState } from "react";
import { NewSession } from "@/components/new-session";
import { AuthPanel } from "@/components/auth-panel";
import { Scoreboard } from "@/components/scoreboard";
import { HandForm } from "@/components/hand-form";
import { History } from "@/components/history";
import { ConfirmDialog, type Confirmation } from "@/components/confirm-dialog";
import { useGame } from "@/components/use-game";
import { calls, formatScore } from "@/lib/game";
export default function Home() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const {
    room,
    credentials,
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
    spectator,
    start,
    change,
    save,
    resolve,
    continueRound,
    completeRoom,
    cancelRoom,
    leave,
    share,
  } = useGame();
  return (
    <div className="app-shell">
      <main>
        {message && (
          <div className="notice" role="status">
            {message}
            <button
              onClick={() => setMessage("")}
              aria-label="Chiudi messaggio"
            >
              ×
            </button>
          </div>
        )}
        {!authReady || (userId && !ready) ? (
          <p className="loading">Prepariamo il tavolo…</p>
        ) : !userId ? (
          <AuthPanel />
        ) : !room && credentials ? (
          <section className="panel waiting">
            <h1>Raggiungiamo il tavolo…</h1>
            <p>
              Se la stanza non si apre, controlla la connessione o il link
              ricevuto.
            </p>
            <button className="secondary" onClick={leave}>
              Nuova partita
            </button>
          </section>
        ) : !room ? (
          <>
            <NewSession busy={busy} onStart={start} />
          </>
        ) : (
          <>
            <div className="game-heading game-hero briscola-hero game-hud">
              <div>
                <span className="eyebrow">
                  PARTITA DEL{" "}
                  {new Date(room.session.createdAt)
                    .toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                    })
                    .toUpperCase()}
                </span>
                <h1>Partita in corso<span className="lime">.</span></h1>
              </div>
              <div className="game-heading-actions">
                {host && room.publicCode && <button className="game-code" onClick={async () => { await navigator.clipboard.writeText(room.publicCode!); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2200); }}><span>CODICE PARTITA</span><b>{codeCopied ? "Copiato!" : room.publicCode}</b></button>}
                <button className="secondary" onClick={share}>↗ Invita giocatori</button>
              </div>
            </div>
            <div className="identity-bar live-identity briscola-ribbon">
              <p>
                {spectator ? (
                  "Stai assistendo alla partita"
                ) : (
                  <>
                    Giochi come <b>{author}</b>
                    {host
                      ? " · Sei l’host"
                      : " · Le tue proposte saranno approvate dall’host"}
                  </>
                )}{" "}
                · {room.members.filter((member) => member.playerId).length}/5 al tavolo
              </p>
            </div>
            {room.roundCompleted && room.status === "active" && (
              <section className="panel notice">
                <b>Giro {room.currentRound} completato.</b>{" "}
                {host && <><button className="primary" onClick={() => void continueRound()}>Nuovo giro</button>{" "}<button className="secondary" onClick={() => void completeRoom()}>Concludi sessione</button></>}
              </section>
            )}
            {room.status === "completed" && <section className="panel notice"><b>Sessione conclusa.</b> Risultato finale: {new Date(room.endedAt!).toLocaleString("it-IT")} <a className="secondary" href={`/session/${room.id}`}>Vedi riepilogo →</a></section>}
            {room.status === "cancelled" && <section className="panel notice"><b>Partita annullata dall’host.</b> Questa sessione non conta per la classifica.</section>}
            {!!room.proposals.length && (
              <a className="pending-banner" href="#requests">
                {room.proposals.length}{" "}
                {room.proposals.length === 1
                  ? "proposta in attesa"
                  : "proposte in attesa"}{" "}
                {host ? "· Controlla e approva →" : "· Da approvare"}
              </a>
            )}
            <section className="table-stage">
              <Scoreboard session={room.session} members={room.members} />
              <section className="panel action-panel dealer-card dealer-strip">
                <div className="dealer-copy">
                  <span className="eyebrow">IL MAZZIERE È PRONTO</span>
                  <h2>Com’è andata?</h2>
                  <p>Registra la mano: il tavolo si aggiorna per tutti.</p>
                </div>
                <div className="dealer-actions">
                  <button
                    className="primary"
                    disabled={busy || !online || spectator || room.status !== "active" || room.roundCompleted}
                    onClick={() => {
                      setMessage("");
                      setEditor("new");
                    }}
                  >
                    ＋ Aggiungi mano
                  </button>
                  {!spectator && room.session.hands.length > 0 && (
                    <button
                      disabled={busy || !online}
                      className="text-button undo"
                      onClick={() => setConfirmation({ title: "Annullare l’ultima mano?", message: host ? "I punti della mano verranno ricalcolati per tutto il tavolo." : "L’host riceverà la tua richiesta di annullamento.", confirmLabel: host ? "Annulla la mano" : "Invia richiesta", tone: "danger", onConfirm: () => void change("delete", room.session.hands.at(-1)!) })}
                    >
                      ↶ {host ? "Annulla ultima mano" : "Proponi annullamento"}
                    </button>
                  )}
                </div>
              </section>
            </section>
            <div className="after-table-grid">
              <div>
                <section className="history-section briscola-history">
                  <div className="section-heading">
                    <h2>
                      Mano dopo mano{" "}
                      <span className="count">{room.session.hands.length}</span>
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => setOldest(!oldest)}
                    >
                      {oldest ? "↑ Meno recenti" : "↓ Più recenti"}
                    </button>
                  </div>
                  {!room.session.hands.length ? (
                    <div className="empty-history">
                      <span>♧</span>
                      <h3>La storia inizia dalla prima mano.</h3>
                      <p>
                        Aggiungete il primo risultato: ai conti pensiamo noi.
                      </p>
                    </div>
                  ) : (
                    <div className="history-list">
                      <History
                        session={room.session}
                        newestFirst={!oldest}
                        busy={busy || !online}
                        onEdit={(h) => {
                          setMessage("");
                          setEditor(h);
                        }}
                        onDelete={(h) => setConfirmation({ title: host ? "Eliminare questa mano?" : "Proporre l’eliminazione?", message: host ? "I punteggi saranno ricalcolati per tutti i giocatori." : "L’host dovrà approvare la proposta prima di modificare il tavolo.", confirmLabel: host ? "Elimina mano" : "Invia proposta", tone: "danger", onConfirm: () => void change("delete", h) })}
                      />
                    </div>
                  )}
                </section>
              </div>
              <aside>
                <section className="rules-card briscola-rules">
                  <span className="eyebrow">UN RIPASSO AL VOLO</span>
                  <h3>Ogni chiamata ha il suo peso.</h3>
                  {Object.values(calls).map((c) => (
                    <div key={c.label}>
                      <span>
                        {c.label}
                        <small>{c.description}</small>
                      </span>
                      <b>{c.pointsLabel}</b>
                    </div>
                  ))}
                  <p>
                    Chi vince prende. Gli altri lasciano.
                    <br />
                    La somma fa sempre zero.
                  </p>
                </section>
              </aside>
            </div>
            {!!room.proposals.length && (
              <section id="requests" className="panel proposals">
                <div className="section-heading">
                  <h2>In attesa dell’host</h2>
                  <span className="pill">
                    {room.proposals.length} richieste
                  </span>
                </div>
                {room.proposals.map((p) => (
                  <article key={p.id}>
                    <p>
                      <b>{p.author}</b> propone:{" "}
                      {p.kind === "add"
                        ? "nuova mano"
                        : p.kind === "edit"
                          ? "modifica mano"
                          : "elimina mano"}{" "}
                      · {calls[p.hand.callType].label} ·{" "}
                      {p.hand.callerWon ? "Vinta" : "Persa"}
                      {p.hand.capotto ? " · Capotto ×2" : ""}
                    </p>
                    <p className="muted">
                      {
                        room.session.players.find(
                          (player) => player.id === p.hand.callerId,
                        )?.name
                      }{" "}
                      {p.hand.calledPlayerId
                        ? `chiama ${room.session.players.find((player) => player.id === p.hand.calledPlayerId)?.name}`
                        : "gioca da solo"}
                    </p>
                    <div className="proposal-points">
                      {p.hand.results.map((r) => (
                        <span key={r.playerId}>
                          {
                            room.session.players.find(
                              (player) => player.id === r.playerId,
                            )?.name
                          }{" "}
                          <b className={r.delta > 0 ? "positive" : "negative"}>
                            {formatScore(r.delta)}
                          </b>
                        </span>
                      ))}
                    </div>
                    {host && (
                      <div className="proposal-actions">
                        <button
                          disabled={busy || !online}
                          className="primary"
                          onClick={() => resolve(p, true)}
                        >
                          Approva
                        </button>
                        <button
                          disabled={busy || !online}
                          className="secondary"
                          onClick={() => resolve(p, false)}
                        >
                          Rifiuta
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            )}
            <div className="session-actions">
              <button
                className="text-button stats-trigger"
                onClick={() => setShowStats(!showStats)}
              >
                {showStats ? "Nascondi statistiche" : "Statistiche giocatori"}
              </button>
              <div>
                {host && room.status === "active" && (
                  <button disabled={busy || !online} className="text-button danger session-cancel" onClick={() => setConfirmation({ title: "Annullare la partita?", message: "La sessione verrà archiviata come annullata e i punteggi non entreranno in classifica.", confirmLabel: "Annulla partita", tone: "danger", onConfirm: () => void cancelRoom() })}>
                    ⊘ Annulla partita
                  </button>
                )}
              </div>
            </div>
            {showStats && (
              <section className="panel stats">
                <h2>Il vostro gioco, in numeri</h2>
                {room.session.players.map((p) => {
                  const hands = room.session.hands.filter(
                    (h) => h.callerId === p.id,
                  );
                  const points = room.session.hands
                    .flatMap((h) => h.results)
                    .filter((r) => r.playerId === p.id);
                  const wonPoints = points.reduce(
                    (sum, result) => sum + Math.max(0, result.delta),
                    0,
                  );
                  const lostPoints = points.reduce(
                    (sum, result) => sum + Math.min(0, result.delta),
                    0,
                  );
                  const totalPoints = wonPoints + lostPoints;
                  return (
                    <div key={p.id}>
                      <div className="stats-player">
                        <b>{p.name}</b>
                        <span>
                          {hands.length} chiamate ·{" "}
                          {hands.filter((h) => h.callerWon).length} vinte
                        </span>
                      </div>
                      <div className="stats-score">
                        <strong className={totalPoints > 0 ? "positive" : totalPoints < 0 ? "negative" : "neutral"}>{formatScore(totalPoints)}</strong>
                        <small>Totale</small>
                      </div>
                      <span className="stats-detail"><i className="positive">+{wonPoints}</i><i className="negative">{lostPoints}</i></span>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
      <footer>
        <span>
          briscore <span className="lime">◆</span>
        </span>
        <span>Fatto per stare al tavolo.</span>
        <span>5 GIOCATORI. ZERO CONTI.</span>
      </footer>
      <dialog
        ref={dialog}
        onCancel={() => setEditor(null)}
        onClose={() => setEditor(null)}
        aria-label="Inserimento mano"
      >
        {editor && room && (
          <HandForm
            key={editor === "new" ? "new" : editor.id}
            players={room.session.players}
            initial={editor === "new" ? undefined : editor}
            busy={busy || !online}
            isHost={host}
            message={message}
            onSave={save}
            onClose={() => setEditor(null)}
          />
        )}
      </dialog>
    </div>
  );
}
