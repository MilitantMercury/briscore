# Supabase operativo

Progetto Briscore: `aauikdqmbdddnvfyrnhg`. Le migrazioni in [`migrations`](migrations) sono la fonte di verità dello schema; `schema.sql` è solo storico.

## Migrazioni

```sh
supabase link --project-ref aauikdqmbdddnvfyrnhg
supabase db push --linked --dry-run
supabase db push --linked
supabase db lint --linked --level error
```

Non modificare mai una migrazione già applicata: aggiungine una nuova.

## Contratto applicativo

- `briscore_create_room`: crea cinque posti; l'host occupa il primo, gli altri sono bot finché non vengono occupati da un account.
- `briscore_enter_room`: con invito valido assegna automaticamente il primo posto disponibile ai primi cinque account; dal sesto crea uno spettatore.
- `briscore_get_room`: restituisce lo snapshot soltanto ai membri della stanza.
- `briscore_mutate`: aggiunta, modifica, eliminazione, proposte, approvazione host, giri, conclusione e reset; ogni operazione è protetta da lock e revisione.
- `briscore_cancel_room`: annulla una sessione attiva senza alimentare la classifica globale.
- `briscore_leaderboard`: considera soltanto account autenticati in posti non bot e sessioni concluse.

Le mani usano input immutabili; punti e classifica vengono ricalcolati. Il database valida ruoli, giocatori della stanza, Carichi, capotto e transizioni di stato. La somma di ogni mano è sempre zero.

## Sicurezza e Realtime

Le tabelle sono leggibili tramite RLS solo dai membri. Le scritture dirette sono revocate: il client usa RPC con JWT utente. Le funzioni interne in `briscore_private` hanno `search_path` vuoto e privilegi non eseguibili dagli utenti.

Realtime pubblica gli aggiornamenti della tabella `rooms`; il client riceve l'evento e ricarica uno snapshot autorizzato. I delta delle mani non vengono diffusi come eventi indipendenti.

Gli invitati possono entrare anche come ospiti tramite Supabase Anonymous Auth. Un ospite sceglie il nome al tavolo, partecipa in tempo reale e occupa un posto marcato come bot: non entra nella classifica globale e non conserva uno storico personale. Gli account registrati mantengono invece profilo, storico, avatar e corone.

Per abilitarlo nel progetto: Dashboard Supabase → Authentication → Sign In / Providers → Anonymous Sign-Ins. Attiva anche CAPTCHA protection, scegli Cloudflare Turnstile e inserisci il secret key. Configura la site key pubblica in Vercel come `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. L’abilitazione è necessaria solo per il pulsante “Continua come ospite”; gli altri provider non cambiano.

## Auth, redirect e Storage

Gli ospiti usano Anonymous Sign-Ins per partecipare tramite invito; creazione partita e classifica richiedono un account permanente. Configura magic link e i provider OAuth desiderati in Supabase Authentication. In **URL Configuration** inserisci il dominio Vercel effettivo e gli URL locali di sviluppo, ad esempio `http://localhost:3000/**`.

Le immagini avatar usano il bucket `avatars`; URL e publishable key sono sufficienti per browser e API utente. Non esporre mai service-role key o password come variabili `NEXT_PUBLIC`.

## Osservabilità e manutenzione

Grafana integrato in Supabase è il punto di monitoraggio per database, Auth e API. I segnali più utili sono errori delle RPC, latenza, errori OAuth e saturazione connessioni.

Supabase Cron è disponibile per manutenzione futura. Non sono attivi job automatici: prima di aggiungere pulizia di avatar, inviti o tavoli inattivi, definisci conservazione dati e impatto per gli utenti.

## Pipeline GitHub

`.github/workflows/supabase-and-checks.yml` esegue lint, test, typecheck e build su ogni push a `main`, firma l'artefatto della build con GitHub Attestations e applica le migrazioni nell'environment `production`.

I secret richiesti sono `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`. Il workflow usa Supabase CLI v3 e Node.js 22.

## Riferimenti

- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database functions](https://supabase.com/docs/guides/database/functions)
- [Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Cron](https://supabase.com/docs/guides/cron)

## Accesso ospite: errore 401 dopo il CAPTCHA

La migrazione 20260917110000_guest_room_permissions separa require_room_user da require_account: soltanto lettura stanza, ingresso con invito e proposte accettano sessioni anonime. Restano obbligatori membership, posto giocatore per le proposte e controllo host per le modifiche. Il ruolo anon senza sessione non ha accesso alle RPC. Un retry client non risolve il rifiuto SQL: verificare che la migrazione sia applicata.

Il test isolato tests/guest-permissions.cjs usa @electric-sql/pglite (installabile in una cartella temporanea e risolvibile tramite NODE_PATH). Esegue la migrazione in PostgreSQL embedded e verifica ingresso, lettura, proposta, invito errato, azioni host, spettatori e assenza di sessione; snapshot e validazione delle mani sono stub. Non sostituisce il test end-to-end Supabase/Turnstile.
