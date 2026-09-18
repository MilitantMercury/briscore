"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, RequestError } from "@/lib/api-client";
type Game = { id: string; public_code: string; created_at: string; updated_at: string; ended_at?: string | null; status?: "active" | "completed" | "cancelled" };
export default function MyGamesPage() {
  const router = useRouter();
  const [games,setGames]=useState<Game[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(true); const [filter,setFilter]=useState<"all" | "active" | "completed">("all"); const [code,setCode]=useState(""); const [searching,setSearching]=useState(false); const [searchError,setSearchError]=useState("");
  useEffect(()=>{ void api<Game[]>("/api/rooms").then(setGames).catch(e=>setError(e instanceof RequestError ? e.message : "Non riesco a recuperare le tue partite.")).finally(()=>setLoading(false)); },[]);
  async function search(event: React.FormEvent) { event.preventDefault(); setSearchError(""); setSearching(true); try { const result = await api<{ id: string; inviteToken: string }>(`/api/rooms/search?code=${encodeURIComponent(code)}`); router.push(`/?room=${result.id}&invite=${result.inviteToken}`); } catch (e) { setSearchError(e instanceof RequestError && e.status === 404 ? "Nessuna partita trovata con questo codice." : "Ricerca non disponibile. Riprova tra poco."); } finally { setSearching(false); } }
  return <main className="standalone-page games-scene">
    <Link className="back-link deck-back" href="/">← Torna al tavolo</Link>
    <section className="games-hero-card">
      <span className="eyebrow">IL TUO MAZZO</span>
      <h1>Le mie partite<span className="lime">.</span></h1>
      <p>Ogni tavolo a cui hai partecipato, sempre pronto da riaprire.</p>
    {!loading && !error && <span className="games-counter">{games.filter((game) => game.status !== "cancelled").length} {games.filter((game) => game.status !== "cancelled").length === 1 ? "partita" : "partite"}</span>}
    </section>
    <form className="game-search" onSubmit={search}>
      <label htmlFor="game-code">Trova una partita</label>
      <div><input id="game-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 8))} placeholder="Inserisci il codice" maxLength={8} autoComplete="off" /><button className="primary" disabled={searching || code.length !== 8}>{searching ? "Cerco…" : "Cerca"}</button></div>
      <p className="muted">Inserisci il codice ricevuto dal tuo amico.</p>
      {searchError && <p className="games-status info" role="status">{searchError}</p>}
    </form>
    {loading && <p className="games-status muted" role="status">Mescoliamo le tue partite…</p>}
    {error && <p className="games-status info" role="status">{error}</p>}
    {!loading && !error && !games.some((game) => game.status !== "cancelled") && <section className="empty-deck"><span className="suit-row" aria-label="Semi italiani"><i className="suit-denari">♦</i><i className="suit-coppe">♥</i><i className="suit-spade">♠</i><i className="suit-bastoni">♣</i></span><h2>Il tuo mazzo è ancora vuoto.</h2><p>Crea una partita e qui ritroverai tutti i tavoli.</p><Link className="primary" href="/?new=1">Crea una partita →</Link></section>}
    {!loading && !error && games.some((game) => game.status !== "cancelled") && <div className="game-filters" role="group" aria-label="Filtra le partite">
      {(["all","active","completed"] as const).map((item) => {
        const labels = { all:"Tutte", active:"In diretta", completed:"Concluse" };
        const count = item === "all" ? games.filter((game) => game.status !== "cancelled").length : games.filter((game) => (game.status || "active") === item).length;
        return <button key={item} className={`game-filter filter-${item} ${filter === item ? "selected" : ""}`} onClick={() => setFilter(item)}>{labels[item]} <b>{count}</b></button>;
      })}
    </div>}
    <div className="games-deck">
      {games.filter((game) => game.status !== "cancelled" && (filter === "all" || (game.status || "active") === filter)).map((g,index)=>{
        const status = g.status || "active";
        const label = status === "completed" ? "Conclusa" : status === "cancelled" ? "Annullata" : "In diretta";
        const action = status === "active" ? "Entra al tavolo" : "Vedi tavolo";
        const suits = ["♦","♥","♠","♣"];
        return <Link className={`game-card game-${status} ${status === "active" ? "game-live" : ""}`} key={g.id} href={`/?room=${g.id}`}>
          <span className="game-card-number">{g.public_code}</span>
          <span className="game-card-suit">{suits[index % suits.length]}</span>
          <div className="game-card-main"><span className={`game-status status-${status}`}>{status === "active" && <i aria-hidden="true" />} {label}</span><h2>Partita del {new Date(g.created_at).toLocaleDateString("it-IT",{day:"numeric",month:"long"})}</h2><p>Ultimo movimento {new Date(g.updated_at).toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"})}</p></div>
          <span className="game-card-action">{action} <b>→</b></span>
        </Link>;
      })}
    </div>
    {!loading && !error && games.some((game) => game.status !== "cancelled") && !games.some((game) => game.status !== "cancelled" && (filter === "all" || (game.status || "active") === filter)) && <p className="games-status muted">Nessuna partita in questa categoria.</p>}
  </main>;
}
