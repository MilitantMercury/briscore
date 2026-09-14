# Contribuire a Briscore

## Flusso di lavoro

1. Parti da `main` aggiornata.
2. Crea un branch descrittivo, per esempio `feat/sessioni-concluse` o `fix/login-email`.
3. Fai modifiche piccole e coerenti.
4. Prima della pull request esegui:

```sh
npm ci
npm run lint
npm test
npm run typecheck
npm run build
```

5. Apri una pull request verso `main` e attendi i controlli automatici.
6. Il merge su `main` pubblica il codice su Vercel e applica le migrazioni Supabase tramite GitHub Actions.

## Convenzioni

- Commit al presente e sintetici, per esempio `Fix magic link redirect`.
- Una migrazione nuova per ogni modifica allo schema Supabase; non modificare migrazioni già applicate.
- Non committare `.env.local`, chiavi Supabase o credenziali.
- Le regole di punteggio devono restare in `src/lib/game.ts` e avere test corrispondenti.

## Secret GitHub richiesti

L’environment GitHub `production` deve contenere:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

