"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { const u=data.user; setEmail(u?.email || ""); setName(u?.user_metadata?.display_name || u?.user_metadata?.full_name || ""); }); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); const next=name.trim(); if (!next || next.length>40) { setMessage("Inserisci un nome da 1 a 40 caratteri."); return; } const {error}=await supabase.auth.updateUser({data:{display_name:next}}); setMessage(error ? "Non riesco ad aggiornare il profilo." : "Profilo aggiornato."); }
  return <main className="standalone-page"><Link className="back-link" href="/">← Torna al tavolo</Link><section className="panel profile-page"><span className="eyebrow">IL TUO ACCOUNT</span><h1>Profilo<span className="lime">.</span></h1><p className="muted">Gestisci il nome con cui compari ai tavoli e nelle classifiche.</p><form onSubmit={save}><label>Nome visualizzato<input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="Come vuoi essere chiamato?" /></label><label>Email<input value={email} readOnly /></label><button className="primary full">Salva profilo</button></form>{message && <p className="info" role="status">{message}</p>}</section></main>;
}
