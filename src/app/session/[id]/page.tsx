"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, RequestError } from "@/lib/api-client";
import type { Room } from "@/lib/room-types";
import { PlayerAvatar } from "@/components/player-avatar";
export default function SessionSummary({ params }: { params: Promise<{ id: string }> }) {
  const [room,setRoom]=useState<Room|null>(null); const [error,setError]=useState("");
  useEffect(()=>{ void params.then(p=>api<Room>(`/api/rooms/${p.id}`).then(setRoom).catch(e=>setError(e instanceof RequestError?e.message:"Sessione non disponibile."))); },[params]);
  const standings = room?.finalStandings || [];
  const winner = standings[0];
  const winnerMember = room?.members.find((member) => member.playerId === winner?.playerId);
  return <main className="standalone-page summary-scene"><Link className="back-link deck-back" href="/">← Torna al tavolo</Link>{error&&<section className="panel"><p className="info">{error}</p></section>}{!room&&!error&&<p className="games-status muted">Prepariamo il risultato…</p>}{room&&<>
    <section className="summary-hero"><span className="eyebrow">SESSIONE CONCLUSA</span><h1>Risultato finale<span className="lime">.</span></h1><p>Conclusa il {room.endedAt ? new Date(room.endedAt).toLocaleString("it-IT") : "—"}.</p></section>
    {winner && <section className="winner-stage"><div className="winner-burst" aria-hidden="true">✦</div><span className="winner-label">VINCE LA MANO</span><PlayerAvatar name={winner.name} avatar={winnerMember?.avatar} imagePath={winnerMember?.avatarImage} effect={winnerMember?.avatarEffect} rank={winnerMember?.globalRank} size="large" /><h2>{winner.name}</h2><strong className={winner.score>=0?"positive":"negative"}>{winner.score>0?"+":""}{winner.score}</strong><p>Primo al tavolo in questa sessione.</p></section>}
    <section className="final-deck"><div className="final-deck-heading"><span className="eyebrow">IL RISULTATO DEL TAVOLO</span><h2>Tutti i punteggi</h2></div><div className="summary-list">{standings.map((p,i)=>{const member=room.members.find((item)=>item.playerId===p.playerId); return <article className={`summary-row ${i===0?"winner":""}`} key={p.playerId}><span className="final-place">{i+1}</span><PlayerAvatar name={p.name} avatar={member?.avatar} imagePath={member?.avatarImage} effect={member?.avatarEffect} rank={member?.globalRank} /><span className="final-name"><b>{p.name}</b>{i===0&&<small>VINCITORE DELLA SESSIONE</small>}</span><strong className={p.score>=0?"positive":"negative"}>{p.score>0?"+":""}{p.score}</strong></article>})}</div><Link className="primary summary-back" href={`/?room=${room.id}`}>Rivedi il tavolo <span>→</span></Link></section>
  </>}</main>;
}
