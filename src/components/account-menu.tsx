"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
export function AccountMenu({ onSignOut }: { onSignOut: () => void }) {
  const [name, setName] = useState("Account");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { const u=data.user; setName(u?.user_metadata?.display_name || u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Account"); }); }, []);
  return <details className="account-menu"><summary>{name}</summary><div className="account-menu-list"><div className="account-menu-heading"><span className="eyebrow">ACCOUNT</span><strong>{name}</strong></div><Link className="menu-item" href="/profile">Profilo</Link><Link className="menu-item" href="/my-games">Le mie partite</Link><Link className="menu-item" href="/leaderboard">Classifica</Link><button className="menu-item danger" onClick={onSignOut}>Esci</button></div></details>;
}
