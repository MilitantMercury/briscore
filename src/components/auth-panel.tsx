"use client";
import { useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "@/lib/supabase-browser";
const pendingRoomKey = "briscore-pending-room";
export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.get("error_description") || "";
  });
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState({ google: false, apple: false });
  useEffect(() => {
    let active = true;
    fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((data) => {
        if (active)
          setProviders({
            google: data.google === true,
            apple: data.apple === true,
          });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  function redirectTo() {
    return (
      window.location.origin + window.location.pathname + window.location.search
    );
  }
  function rememberRoomBeforeRedirect() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("room");
    if (!id) return;
    try {
      localStorage.setItem(
        pendingRoomKey,
        JSON.stringify({ id, inviteToken: params.get("invite") || undefined }),
      );
    } catch {
      /* The URL remains the fallback when storage is unavailable. */
    }
  }
  async function oauth(provider: "google" | "apple") {
    setBusy(true);
    setMessage("");
    try {
      rememberRoomBeforeRedirect();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo() },
      });
      if (error) throw error;
    } catch {
      setMessage("Accesso non disponibile. Riprova o usa l’email.");
    } finally {
      setBusy(false);
    }
  }
  async function magic(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      rememberRoomBeforeRedirect();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo() },
      });
      if (error) throw error;
      setMessage(
        "Controlla la tua email: apri il link su questo dispositivo per accedere.",
      );
    } catch {
      setMessage(
        "Non è stato possibile inviare l’email. Controlla l’indirizzo e riprova tra poco.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function guest(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { display_name: guestName.trim() }, captchaToken },
      });
      if (error) throw error;
    } catch {
      setMessage("Non è stato possibile entrare come ospite. Riprova tra poco.");
      setBusy(false);
    }
  }
  const hasInvite = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("room");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <div className="auth-layout">
      <section className="auth-pitch">
        <span className="eyebrow">ENTRA AL TAVOLO</span>
        <h1>La tua partita<br />ti aspetta<span className="lime">.</span></h1>
        <p>Accedi una volta. Ritrovi il tuo profilo, le partite e la classifica su ogni dispositivo.</p>
        <div className="auth-suits" aria-hidden="true"><span>DENARI</span><span>COPPE</span><span>SPADE</span><span>BASTONI</span></div>
      </section>
    <section className="panel setup-panel auth-panel deal-card">
      <span className="eyebrow">IL TUO ACCOUNT</span>
      <h2>Accedi a Briscore</h2>
      <p className="muted">
        Ritrova le tue partite e il tuo posto al tavolo su ogni dispositivo.
      </p>
      <div className="auth-buttons">
        <button
          className="secondary full auth-provider auth-google"
          disabled={busy || !providers.google}
          onClick={() => oauth("google")}
        >
          Continua con Google{!providers.google ? " · presto" : ""}
        </button>
        <button
          className="secondary full auth-provider auth-apple"
          disabled={busy || !providers.apple}
          onClick={() => oauth("apple")}
        >
          Continua con Apple{!providers.apple ? " · presto" : ""}
        </button>
      </div>
      <div className="auth-divider">Accedi con la tua email</div>
      <form onSubmit={magic}>
        <label>
          Email
          <input
            className="auth-email"
            type="email"
            autoComplete="email"
            required
            placeholder="nome@esempio.it"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button className="primary full" disabled={busy}>
          {busy ? "Invio…" : "Invia magic link"}
        </button>
      </form>
      {hasInvite && (
        <form className="guest-access" onSubmit={guest}>
          <div className="auth-divider">Oppure entra subito</div>
          <label className="guest-name-field" htmlFor="guest-name">
            <span>Nome al tavolo</span>
            <input id="guest-name" value={guestName} maxLength={30} required placeholder="Il tuo nome" onChange={(event) => setGuestName(event.target.value)} />
          </label>
          {turnstileSiteKey ? (
            <Turnstile siteKey={turnstileSiteKey} options={{ theme: "dark", language: "it" }} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken("")} onError={() => setCaptchaToken("")} />
          ) : <small className="info">Accesso ospite non ancora configurato.</small>}
          <button className="secondary full" disabled={busy || !captchaToken}>Continua come ospite</button>
          <small className="muted">L’ospite non entra nella classifica globale e non conserva uno storico personale.</small>
        </form>
      )}
      {message && (
        <p className="info" role="status">
          {message}
        </p>
      )}
    </section>
    </div>
  );
}
