"use client";
export function NewSession({
  busy,
  onStart,
}: {
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <div className="setup-layout landing-table">
      <section className="intro landing-copy">
        <span className="eyebrow">
          <span className="tiny-diamond">✦</span> BRISCOLA, IN CINQUE
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
        <div className="features deal-steps">
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
          <span>BASTONI</span>
          <p>La prossima mano può cambiare tutto.</p>
        </div>
      </section>
      <section className="panel setup-panel deal-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SI PARTE DA QUI</span>
            <h2>Nuova partita</h2>
          </div>
          <span className="pill">5 giocatori</span>
        </div>
        <p className="muted">
          Il tuo profilo sarà associato automaticamente al tavolo.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) onStart();
          }}
        >
          <div className="profile-callout"><span>IL PRIMO POSTO È TUO</span><b>Sei già autenticato.</b><br />Gli altri quattro giocatori si aggiungeranno dal link di invito.</div>
          <button disabled={busy} className="primary full">
            {busy ? "Creazione stanza…" : "Inizia sessione"} <span>→</span>
          </button>
          <p className="form-note">
            Tu crei il tavolo. Gli altri accedono dal link e occupano il primo posto libero.
          </p>
        </form>
      </section>
    </div>
  );
}
