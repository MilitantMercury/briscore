"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { RecentRooms } from "./recent-rooms";
export function AccountMenu({ onOpen, onSignOut }: { onOpen: (id: string) => void; onSignOut: () => void }) {
  const [name, setName] = useState("Account");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { const u = data.user; const n = u?.user_metadata?.display_name || u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Account"; setName(n); setValue(n); }); }, []);
  async function save() { const next = value.trim(); if (!next || next.length > 40) { setMessage("Inserisci un nome da 1 a 40 caratteri."); return; } const { error } = await supabase.auth.updateUser({ data: { display_name: next } }); if (error) { setMessage("Non riesco ad aggiornare il profilo."); return; } setName(next); setEditing(false); setMessage("Profilo aggiornato."); }
  return <details className="account-menu"><summary>{name}</summary><div className="account-menu-list"><div className="account-menu-heading"><span className="eyebrow">ACCOUNT</span><strong>{name}</strong></div><button className="menu-item" onClick={() => setEditing(!editing)}>Profilo</button><RecentRooms onOpen={onOpen} />{editing && <div className="profile-editor"><label>Nome visualizzato<input value={value} onChange={(e) => setValue(e.target.value)} maxLength={40} /></label><button className="primary full" onClick={() => void save()}>Salva profilo</button></div>}{message && <p className="menu-message" role="status">{message}</p>}<button className="menu-item danger" onClick={onSignOut}>Esci</button></div></details>;
}
