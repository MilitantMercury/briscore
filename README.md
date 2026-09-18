# Briscore

Briscore è il tavolo condiviso per giocare a Briscolone in cinque: registra le mani in tempo reale, calcola i punti, conserva lo storico e costruisce una classifica globale degli account reali.

L'app è realizzata con Next.js App Router, React, TypeScript e Supabase (Auth, Postgres, Realtime, Storage, Grafana e Cron). La produzione è su Vercel; Vercel Analytics raccoglie metriche aggregate di navigazione.

## Funzionalità

- Accesso obbligatorio con email magic link o provider OAuth configurati in Supabase.
- Tavoli da cinque posti: i primi cinque account che aprono un invito occupano automaticamente un posto; gli altri assistono come spettatori.
- Ogni giocatore può aggiungere, modificare o proporre l'annullamento di una mano; l'host approva le proposte, mentre le proprie modifiche sono immediate.
- Punteggi live per tutti i partecipanti, sincronizzati con Supabase Realtime.
- Giri da cinque mani, conclusione ufficiale e annullamento della partita riservati all'host.
- Avatar, immagine personale ed effetti visivi; corone per i primi tre della classifica globale.
- Posti senza account classificati come bot: partecipano ai conti del tavolo ma non entrano in classifica, corone o statistiche persistenti.
- Pagina delle partite, classifica globale, profilo e riepilogo finale.
- Ogni partita ha un codice pubblico di otto caratteri, condivisibile per trovarla dalla pagina Le mie partite.

## Punteggi

La funzione unica di calcolo è in [`src/lib/game.ts`](src/lib/game.ts).

| Chiamata vinta | Chiamante | Chiamato | Altri |
| --- | ---: | ---: | ---: |
| Normale | +2 | +1 | −1 |
| 70–79 | +4 | +2 | −2 |
| 80+ | +6 | +3 | −3 |
| Carichi, da solo | +4 | — | −1 |

In caso di sconfitta tutti i segni si invertono. Il capotto raddoppia ogni delta, sia in vittoria sia in sconfitta. Ogni mano somma sempre a zero.

## Sviluppo locale

Serve Node.js 22 o superiore. Crea `.env.local` partendo da [`.env.example`](.env.example): sono necessarie soltanto URL e publishable key Supabase.

```sh
npm install
npm run dev
```

Apri `http://localhost:3000`.

```sh
npm run lint
npm test
npm run typecheck
npm run build
```

I test delle stanze contro il progetto Supabase remoto sono volutamente espliciti:

```powershell
$env:BRISCORE_ALLOW_REMOTE_TESTS = "1"
npm run test:integration
```

## Architettura e sicurezza

- Le API Next chiamano RPC Supabase con il JWT dell'utente; l'app non usa service-role key.
- RLS e le RPC controllano appartenenza alla stanza, ruolo host, revisione, chiamata e capotto direttamente nel database.
- Le modifiche concorrenti sono protette dalla revisione della stanza e vengono sincronizzate tramite Realtime.
- Le immagini avatar sono salvate nello storage Supabase e visualizzate con `next/image`.
- Le migrazioni SQL in [`supabase/migrations`](supabase/migrations) sono la fonte di verità del database. Consulta [supabase/README.md](supabase/README.md) per setup e operatività.

## Operatività

Ogni push su `main` esegue lint, test, typecheck e build su GitHub Actions. La pipeline applica poi le migrazioni Supabase nell'environment `production` e genera un'attestazione firmata della build visibile nella pagina [Attestations](https://github.com/MilitantMercury/briscore/attestations).

Vercel pubblica automaticamente `main`. Dependabot apre aggiornamenti settimanali per npm e GitHub Actions. Grafana, integrato in Supabase, è il punto di osservazione per database, API e Auth; Supabase Cron è disponibile per futuri job di manutenzione, senza job automatici attivi al momento.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) per il flusso di sviluppo e [SECURITY.md](SECURITY.md) per le segnalazioni di sicurezza.

Quando una partita viene annullata, il tavolo corrente viene chiuso e il riferimento di ripristino viene rimosso dal browser. Le partite annullate restano escluse da Le mie partite. Il collegamento Crea una partita apre /?new=1 per ignorare il ripristino dell'ultimo tavolo.

Su dispositivi touch il tema conserva lo sfondo e le cornici avatar ma disattiva le animazioni decorative continue e le sfocature a tutto schermo. Il modale Aggiungi mano scorre internamente entro il viewport dinamico e le safe area. Gli errori di rete Turnstile non rimontano immediatamente il widget: resta attivo il retry gestito dalla libreria.
