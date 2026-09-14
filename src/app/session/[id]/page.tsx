"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, RequestError } from "@/lib/api-client";
import type { Room } from "@/lib/room-types";
export default function SessionSummary({ params }: { params: Promise<{ id: string }> }) {
  const [room,setRoom]=useState<Room|null>(null); const [error,setError]=useState("");
  useEffect(()=>{ void params.then(p=>api<Room>(`/api/rooms/${p.id}`).then(setRoom).catch(e=>setError(e instanceof RequestError?e.message:"Sessione non disponibile."))); },[params]);
  return <main className="standalone-page"><Link className="back-link" href="/">← Torna al tavolo</Link>{error&&<section className="panel"><p className="info">{error}</p></section>}{!room&&!error&&<p className="muted">Caricamento risultato…</p>}{room&&<section className="panel summary-page"><span className="eyebrow">SESSIONE CONCLUSA</span><h1>Risultato finale<span className="lime">.</span></h1><p className="muted">Conclusa il {room.endedAt ? new Date(room.endedAt).toLocaleString("it-IT") : "—"}.</p><div className="summary-list">{(room.finalStandings||[]).map((p,i)=><div className={i===0?"summary-row winner":"summary-row"} key={p.playerId}><span><b>{i+1}.</b> {p.name}</span><strong className={p.score>=0?"positive":"negative"}>{p.score>0?"+":""}{p.score}</strong></div>)}</div></section>}</main>;
}
