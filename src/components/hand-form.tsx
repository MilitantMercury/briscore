"use client";
import { useState } from "react";
import {
  calculateHandScore,
  calls,
  formatScore,
  type CallType,
  type Hand,
  type HandInput,
  type Player,
} from "@/lib/game";
export function HandForm({
  players,
  initial,
  busy,
  isHost,
  message,
  onSave,
  onClose,
}: {
  players: Player[];
  initial?: Hand;
  busy: boolean;
  isHost: boolean;
  message: string;
  onSave: (input: HandInput) => void;
  onClose: () => void;
}) {
  const [callerId, setCaller] = useState(initial?.callerId || "");
  const [calledPlayerId, setCalled] = useState(initial?.calledPlayerId || "");
  const [callType, setType] = useState<CallType>(initial?.callType || "normal");
  const [won, setWon] = useState<boolean | undefined>(initial?.callerWon);
  const [capotto, setCapotto] = useState(initial?.capotto ?? false);
  const input = {
    callerId,
    ...(callType !== "carichi" ? { calledPlayerId } : {}),
    callType,
    callerWon: won as boolean,
    capotto,
  };
  let results: ReturnType<typeof calculateHandScore> = [];
  let error = "";
  try {
    results = calculateHandScore(players, input);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!error && !busy) onSave(input);
      }}
      className="hand-form"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">IL PROSSIMO GIRO</span>
          <h2>{initial ? "Modifica mano" : "Aggiungi mano"}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Chiudi inserimento mano"
        >
          ×
        </button>
      </div>
      <label>
        Chiamante
        <select
          autoFocus
          value={callerId}
          onChange={(e) => {
            setCaller(e.target.value);
            if (e.target.value === calledPlayerId) setCalled("");
          }}
        >
          <option value="">Chi ha chiamato?</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Tipo di chiamata</legend>
        <div className="call-options">
          {(Object.keys(calls) as CallType[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={callType === t}
              className={callType === t ? "choice selected" : "choice"}
              onClick={() => {
                setType(t);
                if (t === "carichi") setCalled("");
              }}
            >
              <span>{calls[t].label}</span>
              <small>×{calls[t].multiplier}</small>
            </button>
          ))}
        </div>
      </fieldset>
      {callType !== "carichi" ? (
        <label>
          Chiamato
          <select
            value={calledPlayerId}
            onChange={(e) => setCalled(e.target.value)}
          >
            <option value="">Chi era il compagno?</option>
            {players
              .filter((p) => p.id !== callerId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      ) : (
        <p className="info">
          Carichi: il chiamante gioca da solo contro gli altri quattro.
        </p>
      )}
      <fieldset>
        <legend>Il chiamante ha…</legend>
        <div className="outcomes">
          <button
            type="button"
            className={`choice ${won === true ? "selected" : ""}`}
            aria-pressed={won === true}
            onClick={() => setWon(true)}
          >
            ↗ Vinto
          </button>
          <button
            type="button"
            className={`choice loss ${won === false ? "selected" : ""}`}
            aria-pressed={won === false}
            onClick={() => {
              setWon(false);
            }}
          >
            ↘ Perso
          </button>
        </div>
      </fieldset>
      <label className="capotto-toggle">
        <input
          type="checkbox"
          checked={capotto}
          onChange={(e) => setCapotto(e.target.checked)}
          disabled={won === undefined}
        />
        Capotto <small>(raddoppia i punti)</small>
      </label>
      <div className="preview" aria-live="polite">
        <span className="eyebrow">ANTEPRIMA PUNTI</span>
        {results.length ? (
          <>
            <div className="point-grid">
              {results.map((r) => (
                <div key={r.playerId}>
                  <span>{players.find((p) => p.id === r.playerId)?.name}</span>
                  <strong className={r.delta > 0 ? "positive" : "negative"}>
                    {formatScore(r.delta)}
                  </strong>
                </div>
              ))}
            </div>
            <p className="balance">
              ✓ Totale variazioni: {results.reduce((a, b) => a + b.delta, 0)}
            </p>
          </>
        ) : (
          <p className="muted">{error}</p>
        )}
      </div>
      {message && (
        <p className="validation" role="alert">
          {message}
        </p>
      )}
      <button className="primary full" disabled={!!error || busy}>
        {busy ? "Salvataggio…" : isHost ? "Conferma mano" : "Invia all’host"}
      </button>
      {!isHost && (
        <p className="form-note">
          I punti si aggiornano dopo l’approvazione dell’host.
        </p>
      )}
    </form>
  );
}
