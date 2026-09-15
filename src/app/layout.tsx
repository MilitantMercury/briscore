import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
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
      </body>
    </html>
  );
}
