"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { supabase } from "@/lib/supabase-browser";

const navigation = [
  { href: "/", label: "Tavolo" },
  { href: "/my-games", label: "Partite" },
  { href: "/leaderboard", label: "Classifica" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand site-brand" href="/" aria-label="Briscore, torna al tavolo">
          <span className="brand-mark">b.</span>
          <span>briscore</span>
          <span className="brand-dot">◆</span>
        </Link>

        <nav className="main-nav" aria-label="Navigazione principale">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`main-nav-link${active ? " active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="site-header-account">
          {signedIn ? (
            <AccountMenu onSignOut={() => void signOut()} />
          ) : ready ? (
            <Link href="/" className="header-sign-in">Accedi <span>→</span></Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
