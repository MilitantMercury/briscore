"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, RequestError } from "@/lib/api-client";
import { PlayerAvatar } from "@/components/player-avatar";
type Entry = { userId: string; name: string; points: number; games: number; wins: number; rank: number; avatar?: string; avatarImage?: string; avatarEffect?: string };
const medals = ["👑", "🥈", "🥉"];
export default function LeaderboardPage() {
  const [rows,setRows]=useState<Entry[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{ void api<Entry[]>("/api/leaderboard").then(setRows).catch(error=>setError(error instanceof RequestError?error.message:"Classifica non disponibile.")).finally(()=>setLoading(false)); },[]);
  const podium = rows.filter((row) => row.rank <= 3);
  const contenders = rows.filter((row) => row.rank > 3);
  return <main className="standalone-page leaderboard-scene">
    <Link className="back-link deck-back" href="/">← Torna al tavolo</Link>
    <section className="leaderboard-hero">
      <span className="eyebrow">ALBO D’ORO BRISCORE</span>
      <h1>Classifica<span className="lime">.</span></h1>
      <p>Le corone dei primi tre si vedono anche a ogni tavolo.</p>
    </section>
    {loading&&<p className="games-status muted" role="status">Prepariamo il podio…</p>}
    {error&&<p className="games-status info" role="status">{error}</p>}
    {!loading&&!error&&!rows.length&&<section className="empty-deck"><span>IL PODIO ASPETTA</span><h2>La classifica si riempirà dopo la prima sessione conclusa.</h2></section>}
    {!!podium.length && <section className="podium-stage" aria-label="Podio globale">
      {podium.map((row)=><article className={`podium-card podium-place-${row.rank}`} key={row.userId}>
        <span className="podium-medal">{medals[row.rank-1]}</span>
        <PlayerAvatar name={row.name} avatar={row.avatar} imagePath={row.avatarImage} effect={row.avatarEffect} rank={row.rank} size="large" />
        <b>{row.name}</b><span>{row.games} {row.games===1?"sessione":"sessioni"} · {row.wins} vinte</span><strong className={row.points>=0?"positive":"negative"}>{row.points>0?"+":""}{row.points}</strong>
      </article>)}
    </section>}
    {!!contenders.length && <section className="rank-deck"><div className="rank-deck-heading"><span className="eyebrow">LA SFIDA CONTINUA</span><h2>Gli altri giocatori</h2></div>{contenders.map(row=><article className="rank-card" key={row.userId}><span className="rank-card-place">{row.rank}</span><PlayerAvatar name={row.name} avatar={row.avatar} imagePath={row.avatarImage} effect={row.avatarEffect} rank={row.rank} /><span className="rank-card-name"><b>{row.name}</b><small>{row.games} {row.games===1?"sessione":"sessioni"} · {row.wins} {row.wins===1?"vittoria":"vittorie"}</small></span><strong className={row.points>=0?"positive":"negative"}>{row.points>0?"+":""}{row.points}</strong></article>)}</section>}
  </main>;
}
