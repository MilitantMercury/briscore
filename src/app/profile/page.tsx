"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { avatarOptions, PlayerAvatar } from "@/components/player-avatar";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("bastoni");
  const [message, setMessage] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setEmail(user?.email || "");
      setName(user?.user_metadata?.display_name || user?.user_metadata?.full_name || "");
      setAvatar(user?.user_metadata?.avatar || "bastoni");
    });
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const next = name.trim();
    if (!next || next.length > 40) {
      setMessage("Inserisci un nome da 1 a 40 caratteri.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ data: { display_name: next, avatar } });
    setMessage(error ? "Non riesco ad aggiornare il profilo." : "Profilo aggiornato. Il nuovo avatar apparirà ai prossimi aggiornamenti del tavolo.");
  }
  return <main className="standalone-page"><Link className="back-link" href="/">← Torna al tavolo</Link><section className="panel profile-page card-surface"><span className="eyebrow">IL TUO ACCOUNT</span><h1>La tua carta<span className="lime">.</span></h1><p className="muted">Scegli il segno con cui comparire ai tavoli e nella classifica.</p><form onSubmit={save}><div className="avatar-picker"><div className="avatar-preview"><PlayerAvatar avatar={avatar} name={name || "Giocatore"} size="large" /><b>{name || "Il tuo nome"}</b></div><fieldset><legend>Avatar</legend><div className="avatar-options">{avatarOptions.map(option=><button type="button" key={option} className={avatar===option?"avatar-choice selected":"avatar-choice"} onClick={()=>setAvatar(option)} aria-label={`Scegli ${option}`}><PlayerAvatar avatar={option} name={option} size="small" /></button>)}</div></fieldset></div><label>Nome visualizzato<input value={name} onChange={event=>setName(event.target.value)} maxLength={40} placeholder="Come vuoi essere chiamato?" /></label><label>Email<input value={email} readOnly /></label><button className="primary full">Salva il profilo</button></form>{message && <p className="info" role="status">{message}</p>}</section></main>;
}
