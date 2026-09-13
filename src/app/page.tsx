"use client";
import { useEffect, useRef, useState } from "react";
import { NewSession } from "@/components/new-session";
import { Scoreboard } from "@/components/scoreboard";
import { HandForm } from "@/components/hand-form";
import { History } from "@/components/history";
import {
  calculateHandScore,
  calls,
  formatScore,
  type Hand,
  type HandInput,
  type Player,
  type Session,
} from "@/lib/game";
import type { Proposal, Room } from "@/lib/rooms";

const storageKey = "briscore-room-v1";
type Credentials = { id: string; token?: string };
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Connessione non disponibile.");
  return result;
}
export default function Home() {
  const [room, setRoom] = useState<Room | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<Hand | "new" | null>(null);
  const [author, setAuthor] = useState("");
  const [oldest, setOldest] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const host = !!credentials?.token;
  useEffect(() => {
    if (
      !message.startsWith("Proposta inviata") &&
      !message.startsWith("Partita aggiornata") &&
      !message.startsWith("Proposta approvata") &&
      !message.startsWith("Proposta rifiutata")
    )
      return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  function acceptRoom(next: Room) {
    setRoom((current) =>
      !current || current.id !== next.id || next.revision >= current.revision
        ? next
        : current,
    );
  }
  useEffect(() => {
    let saved: Credentials | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      /* Storage may be unavailable. */
    }
    const id = new URLSearchParams(window.location.search).get("room");
    setCredentials(
      id ? { id, token: saved?.id === id ? saved.token : undefined } : saved,
    );
    setReady(true);
  }, []);
  useEffect(() => {
    if (!credentials) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const next = await api(`/api/rooms/${credentials.id}`);
        if (active) {
          acceptRoom(next);
          setOnline(true);
        }
      } catch {
        if (active) setOnline(false);
      } finally {
        if (active) timer = setTimeout(refresh, 1500);
      }
    };
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [credentials]);
  useEffect(() => {
    if (editor && !dialog.current?.open) dialog.current?.showModal();
    if (!editor && dialog.current?.open) dialog.current.close();
  }, [editor]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Operazione non riuscita.",
      );
    } finally {
      setBusy(false);
    }
  }
  function remember(next: Credentials) {
    setCredentials(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setMessage(
        "Il browser non consente il salvataggio: mantieni aperta questa scheda per conservare l’accesso host.",
      );
    }
    window.history.replaceState(null, "", `?room=${next.id}`);
  }
  async function start(players: Player[]) {
    await run(async () => {
      const result = await api("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          version: 1,
          players,
          hands: [],
          createdAt: new Date().toISOString(),
        }),
      });
      remember({ id: result.room.id, token: result.token });
      acceptRoom(result.room);
      setOnline(true);
    });
  }
  async function update(session: Session) {
    acceptRoom(
      await api(`/api/rooms/${room!.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${credentials!.token}` },
        body: JSON.stringify({ revision: room!.revision, session }),
      }),
    );
  }
  async function change(kind: Proposal["kind"], hand: Hand) {
    if (!room) return;
    if (!host && !author) {
      setMessage("Seleziona il tuo nome prima di inviare una proposta.");
      return;
    }
    await run(async () => {
      if (host) {
        const hands =
          kind === "add"
            ? [...room.session.hands, hand]
            : kind === "edit"
              ? room.session.hands.map((h) => (h.id === hand.id ? hand : h))
              : room.session.hands.filter((h) => h.id !== hand.id);
        await update({ ...room.session, hands });
        setMessage("Partita aggiornata per tutti.");
      } else {
        acceptRoom(
          await api(`/api/rooms/${room.id}/proposals`, {
            method: "POST",
            body: JSON.stringify({ author, kind, hand }),
          }),
        );
        setMessage("Proposta inviata. In attesa dell’host.");
      }
      setEditor(null);
    });
  }
  function save(input: HandInput) {
    const initial = editor && editor !== "new" ? editor : undefined;
    const hand: Hand = {
      ...input,
      id:
        initial?.id ||
        Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join(""),
      createdAt: initial?.createdAt || new Date().toISOString(),
      results: calculateHandScore(room!.session.players, input),
    };
    void change(initial ? "edit" : "add", hand);
  }
  async function resolve(proposal: Proposal, approve: boolean) {
    await run(async () => {
      acceptRoom(
        await api(`/api/rooms/${room!.id}/proposals`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${credentials!.token}` },
          body: JSON.stringify({ proposalId: proposal.id, approve }),
        }),
      );
      setMessage(
        approve
          ? "Proposta approvata. Punti aggiornati."
          : "Proposta rifiutata.",
      );
    });
  }
  function leave() {
    if (
      room &&
      !window.confirm(
        "Tornare alla schermata iniziale? La stanza resta disponibile tramite il suo link.",
      )
    )
      return;
    setRoom(null);
    setCredentials(null);
    setAuthor("");
    setMessage("");
    window.history.replaceState(null, "", "/");
    // Preserve the host credential until another room is created.
  }
  async function share() {
    const url = `${window.location.origin}/?room=${room!.id}`;
    try {
      if (navigator.share)
        await navigator.share({ title: "Briscore — entra al tavolo", url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copiato. Invialo agli altri giocatori.");
      }
    } catch {
      setMessage(`Link della partita: ${url}`);
    }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand brand-home"
          onClick={leave}
          aria-label="Briscore home"
        >
          <span className="brand-mark">b.</span>briscore
          <span className="brand-dot">◆</span>
        </button>
        <div className="header-right">
          {room ? (
            <>
              <span className={`connection ${online ? "connected" : ""}`}>
                {online ? "In diretta" : "Riconnessione…"}
              </span>
              <span className="desktop-label">
                {host ? "Sei l’host" : "Tavolo condiviso"}
              </span>
            </>
          ) : (
            <span className="desktop-label">
              IL TUO SEGNAPUNTI, IN COMPAGNIA.
            </span>
          )}
        </div>
      </header>
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
        {!ready ? (
          <p className="loading">Prepariamo il tavolo…</p>
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
          <NewSession busy={busy} onStart={start} />
        ) : (
          <>
            <div className="game-heading">
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
                <h1>
                  Il vostro tavolo<span className="lime">.</span>
                </h1>
              </div>
              <button className="secondary" onClick={share}>
                ↗ Invita giocatori
              </button>
            </div>
            {!host && (
              <div className="identity-bar">
                <label>
                  Tu sei
                  <select
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  >
                    <option value="">Scegli il tuo nome</option>
                    {room.session.players.map((p) => (
                      <option key={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <p>Tutti possono proporre. L’host approva.</p>
              </div>
            )}
            {!!room.proposals.length && (
              <a className="pending-banner" href="#requests">
                {room.proposals.length}{" "}
                {room.proposals.length === 1
                  ? "proposta in attesa"
                  : "proposte in attesa"}{" "}
                {host ? "· Controlla e approva →" : "· Da approvare"}
              </a>
            )}
            <div className="game-grid">
              <div>
                <Scoreboard session={room.session} />
                <section className="history-section">
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
                    <div className={`history-list ${oldest ? "" : "reverse"}`}>
                      <History
                        session={room.session}
                        busy={busy || !online}
                        onEdit={(h) => {
                          setMessage("");
                          setEditor(h);
                        }}
                        onDelete={(h) => {
                          if (
                            window.confirm(
                              host
                                ? "Eliminare questa mano e ricalcolare i punti?"
                                : "Proporre all’host di eliminare questa mano?",
                            )
                          )
                            void change("delete", h);
                        }}
                      />
                    </div>
                  )}
                </section>
              </div>
              <aside>
                <section className="panel action-panel">
                  <span className="eyebrow">PRONTI PER LA PROSSIMA?</span>
                  <h2>Com’è andata?</h2>
                  <p>
                    Una mano, pochi tocchi.
                    <br />
                    Il punteggio si aggiorna per tutti.
                  </p>
                  <button
                    className="primary full"
                    disabled={busy || !online}
                    onClick={() => {
                      setMessage("");
                      setEditor("new");
                    }}
                  >
                    ＋ Aggiungi mano
                  </button>
                  {room.session.hands.length > 0 && (
                    <button
                      disabled={busy || !online}
                      className="text-button full undo"
                      onClick={() => {
                        if (window.confirm("Annullare l’ultima mano?"))
                          void change("delete", room.session.hands.at(-1)!);
                      }}
                    >
                      ↶{" "}
                      {host
                        ? "Annulla ultima mano"
                        : "Proponi annullamento ultima mano"}
                    </button>
                  )}
                </section>
                <section className="rules-card">
                  <span className="eyebrow">UN RIPASSO AL VOLO</span>
                  <h3>Ogni chiamata ha il suo peso.</h3>
                  {Object.values(calls).map((c) => (
                    <div key={c.label}>
                      <span>
                        {c.label}
                        <small>{c.description}</small>
                      </span>
                      <b>×{c.multiplier}</b>
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
                className="text-button"
                onClick={() => setShowStats(!showStats)}
              >
                {showStats ? "Nascondi statistiche" : "Statistiche giocatori"}
              </button>
              <div>
                <button className="text-button" onClick={leave}>
                  Nuova sessione
                </button>
                {host && (
                  <button
                    disabled={busy || !online}
                    className="text-button danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Azzerare tutte le mani? I cinque giocatori resteranno nella stanza.",
                        )
                      )
                        void run(async () => {
                          await update({ ...room.session, hands: [] });
                        });
                    }}
                  >
                    Reset sessione
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
                  return (
                    <div key={p.id}>
                      <b>{p.name}</b>
                      <span>
                        {hands.length} chiamate ·{" "}
                        {hands.filter((h) => h.callerWon).length} vinte
                      </span>
                      <span className="positive">
                        +{points.reduce((s, r) => s + Math.max(0, r.delta), 0)}
                      </span>
                      <span className="negative">
                        {points.reduce((s, r) => s + Math.min(0, r.delta), 0)}
                      </span>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
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
