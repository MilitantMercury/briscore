"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
export function AccountMenu({ onSignOut }: { onSignOut: () => void }) {
  const [name, setName] = useState("Account");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { const u=data.user; setName(u?.user_metadata?.display_name || u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Account"); }); }, []);
  return <details className="account-menu">
    <summary>
      <span className="account-initial">{name.slice(0, 1).toUpperCase()}</span>
      <span className="account-name">{name}</span>
      <span className="account-chevron">⌄</span>
    </summary>
    <div className="account-menu-list">
      <div className="account-menu-heading">
        <span className="eyebrow">LA TUA CARTA</span>
        <strong>{name}</strong>
        <small>Pronto per il prossimo tavolo</small>
      </div>
      <div className="account-menu-links">
        <Link className="menu-item" href="/profile"><span className="menu-icon">✦</span><span>La tua carta</span><b>›</b></Link>
        <Link className="menu-item" href="/my-games"><span className="menu-icon">♣</span><span>Le mie partite</span><b>›</b></Link>
        <Link className="menu-item" href="/leaderboard"><span className="menu-icon">♛</span><span>Classifica</span><b>›</b></Link>
      </div>
      <button className="menu-item danger" onClick={onSignOut}><span className="menu-icon">↗</span><span>Esci dall&apos;account</span></button>
    </div>
  </details>;
}
