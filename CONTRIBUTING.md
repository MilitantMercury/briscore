# Contribuire a Briscore

## Flusso di lavoro

1. Allinea `main` con `origin/main`.
2. Crea un branch descrittivo, ad esempio `feat/avatar-effect` o `fix/invite-flow`.
3. Mantieni le modifiche piccole, testabili e coerenti.
4. Prima di aprire una pull request esegui:

```sh
npm ci
npm run lint
npm test
npm run typecheck
npm run build
```

5. Apri una pull request verso `main` e attendi la pipeline.
6. Il merge su `main` pubblica su Vercel, applica le migrazioni Supabase nell'environment `production` e produce l'attestazione della build.

## Convenzioni

- Scrivi commit brevi al presente, per esempio `Fix room invitation redirect`.
- Aggiungi una nuova migrazione per ogni modifica allo schema o alle funzioni Supabase: non riscrivere una migrazione applicata.
- Non committare `.env.local`, chiavi Supabase, password o output di build.
- La logica dei punteggi rimane concentrata in `src/lib/game.ts` e ogni regola nuova richiede test.
- Un giocatore senza account deve essere trattato come bot: nessuna modifica deve farlo apparire nelle classifiche globali.
- Mantieni accessibili i controlli: testi chiari, focus visibile e conferme Briscore per azioni irreversibili.

## Dipendenze e sicurezza della supply chain

Dependabot controlla settimanalmente dipendenze npm e GitHub Actions. Verifica sempre la pipeline e le note di rilascio prima di unire un aggiornamento rilevante.

Le build su `main` ricevono un'attestazione di provenienza GitHub. Consulta la pagina [Attestations](https://github.com/MilitantMercury/briscore/attestations) per verificarne origine e commit.

## Secret GitHub

L'environment GitHub `production` deve contenere:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

Le variabili pubbliche `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sono configurate su Vercel e non sono segreti.
