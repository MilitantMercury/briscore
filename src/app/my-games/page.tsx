"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, RequestError } from "@/lib/api-client";
type Game = { id: string; created_at: string; updated_at: string };
export default function MyGamesPage() {
  const [games,setGames]=useState<Game[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{ void api<Game[]>("/api/rooms").then(setGames).catch(e=>setError(e instanceof RequestError ? e.message : "Non riesco a recuperare le tue partite.")).finally(()=>setLoading(false)); },[]);
  return <main className="standalone-page"><Link className="back-link" href="/">← Torna al tavolo</Link><section className="panel games-page"><span className="eyebrow">IL TUO STORICO</span><h1>Le mie partite<span className="lime">.</span></h1><p className="muted">Ritrova i tavoli a cui hai partecipato.</p>{loading && <p className="muted" role="status">Caricamento partite…</p>}{error && <p className="info" role="status">{error}</p>}{!loading && !error && !games.length && <p className="muted">Non hai ancora partite da mostrare.</p>}<div className="games-list">{games.map(g=><Link className="secondary" key={g.id} href={`/?room=${g.id}`}>Partita del {new Date(g.created_at).toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"})} →</Link>)}</div></section></main>;
}
