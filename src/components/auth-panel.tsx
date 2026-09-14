"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
const pendingRoomKey = "briscore-pending-room";
export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
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
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has("error_description"))
      setMessage(
        params.get("error_description") ||
          "Accesso non riuscito. Richiedi un nuovo link.",
      );
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
  return (
    <section className="panel setup-panel auth-panel">
      <span className="eyebrow">IL TUO ACCOUNT</span>
      <h2>Accedi a Briscore</h2>
      <p className="muted">
        Ritrova le tue partite e il tuo posto al tavolo su ogni dispositivo.
      </p>
      <div className="auth-buttons">
        <button
          className="secondary full"
          disabled={busy || !providers.google}
          onClick={() => oauth("google")}
        >
          Continua con Google{!providers.google ? " · presto" : ""}
        </button>
        <button
          className="secondary full"
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
      {message && (
        <p className="info" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
