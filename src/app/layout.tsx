import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import packageInfo from "../../package.json";
import "./globals.css";
export const metadata: Metadata = {
  title: "Briscore — Il tavolo è pronto",
  description:
    "Il segnapunti condiviso per le tue partite di Briscolone, in cinque.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <AppHeader />
        {children}
        <span className="app-version" aria-label="Versione app">
          v{packageInfo.version}
        </span>
      </body>
    </html>
  );
}
