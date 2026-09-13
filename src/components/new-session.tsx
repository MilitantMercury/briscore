"use client";
import { useState } from "react";
import { validatePlayers, type Player } from "@/lib/game";
export function NewSession({
  busy,
  onStart,
}: {
  busy: boolean;
  onStart: (players: Player[]) => void;
}) {
  const [names, setNames] = useState(["", "", "", "", ""]);
  const players = names.map((name, i) => ({
    id: `p${i + 1}`,
    name: name.trim(),
  }));
  let error = "";
  try {
    validatePlayers(players);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="setup-layout">
      <section className="intro">
        <span className="eyebrow">
          <span className="tiny-diamond">◆</span> BRISCOLONE, IN CINQUE
        </span>
        <h1>
          Le carte a voi.
          <br />I conti a <em>Briscore.</em>
        </h1>
        <p>
          Un tavolo, cinque giocatori.
          <br />
          Il punteggio di tutti, sul telefono di ognuno.
        </p>
        <div className="intro-rule" />
        <div className="features">
          <span>
            01 <b>Crea la partita</b>
          </span>
          <span>
            02 <b>Condividi il link</b>
          </span>
          <span>
            03 <b>Giocate. Al resto pensiamo noi.</b>
          </span>
        </div>
        <div className="table-note">
          <span>♣</span>
          <p>La prossima mano può cambiare tutto.</p>
        </div>
      </section>
      <section className="panel setup-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SI PARTE DA QUI</span>
            <h2>Nuova partita</h2>
          </div>
          <span className="pill">5 giocatori</span>
        </div>
        <p className="muted">Chi c’è al tavolo stasera?</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!error && !busy) onStart(players);
          }}
        >
          <div className="name-fields">
            {names.map((name, i) => (
              <label key={i} className="name-field">
                <span className={`avatar color-${i}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="sr-only">Giocatore {i + 1}</span>
                <input
                  autoComplete="off"
                  maxLength={30}
                  placeholder={`Nome giocatore ${i + 1}`}
                  value={name}
                  onChange={(e) =>
                    setNames(
                      names.map((n, j) => (i === j ? e.target.value : n)),
                    )
                  }
                />
              </label>
            ))}
          </div>
          {names.some((n) => n.trim()) && error && (
            <p className="validation" role="status">
              {error}
            </p>
          )}
          <button disabled={!!error || busy} className="primary full">
            {busy ? "Creazione stanza…" : "Inizia sessione"} <span>→</span>
          </button>
          <p className="form-note">
            Nessun account. Invita gli altri con un link.
          </p>
        </form>
      </section>
    </div>
  );
}
