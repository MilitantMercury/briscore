"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, RequestError } from "@/lib/api-client";
import { PlayerAvatar } from "@/components/player-avatar";
type Entry = { userId: string; name: string; points: number; games: number; wins: number; rank: number; avatar?: string };
const medals = ["👑", "🥈", "🥉"];
export default function LeaderboardPage() {
  const [rows,setRows]=useState<Entry[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{ void api<Entry[]>("/api/leaderboard").then(setRows).catch(error=>setError(error instanceof RequestError?error.message:"Classifica non disponibile.")).finally(()=>setLoading(false)); },[]);
  return <main className="standalone-page"><Link className="back-link" href="/">← Torna al tavolo</Link><section className="panel leaderboard-page card-surface"><span className="eyebrow">ALBO D’ORO BRISCORE</span><h1>Classifica<span className="lime">.</span></h1><p className="muted">Le corone dei primi tre si vedono anche a ogni tavolo.</p>{loading&&<p className="muted" role="status">Caricamento classifica…</p>}{error&&<p className="info" role="status">{error}</p>}{!loading&&!error&&!rows.length&&<p className="muted">La classifica si riempirà dopo la prima sessione conclusa.</p>}<div className="leaderboard-list">{rows.map(row=><div className={`leaderboard-row ${row.rank<=3?`podium-${row.rank}`:""}`} key={row.userId}><span className="leaderboard-place">{row.rank<=3?medals[row.rank-1]:`${row.rank}.`}</span><PlayerAvatar name={row.name} avatar={row.avatar} rank={row.rank} /><span className="leaderboard-name"><b>{row.name}</b><small>{row.games} {row.games===1?"sessione":"sessioni"} · {row.wins} {row.wins===1?"vittoria":"vittorie"}</small></span><strong className={row.points>=0?"positive":"negative"}>{row.points>0?"+":""}{row.points}</strong></div>)}</div></section></main>;
}
