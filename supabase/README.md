# Supabase operativo

Progetto Briscore: `aauikdqmbdddnvfyrnhg`. Le migrazioni in `migrations/` sono la fonte dello schema. `schema.sql` è un rimando storico e non va usato per inizializzare il progetto.

## Migrazioni

```sh
supabase link --project-ref aauikdqmbdddnvfyrnhg
supabase db push --linked --dry-run
supabase db push --linked
supabase db lint --linked --level error
```

La prima migrazione crea le tabelle originarie. La seconda aggiunge inviti, associazione account/posto, vincoli, RPC, policy RLS e pubblicazione Realtime.

## Contratto

- `briscore_create_room`: cinque nomi distinti, account host al primo posto; massimo 20 creazioni per account all'ora.
- `briscore_invite`: anteprima dei soli posti, per account autenticato con invito valido.
- `briscore_join_room`: occupa un posto libero sotto lock sulla stanza; massimo cinque account.
- `briscore_get_room`: snapshot completa riservata ai membri.
- `briscore_mutate`: aggiunta, modifica, eliminazione, reset, proposta e approvazione/rifiuto; lock e revisione in una sola transazione. Massimo 30 proposte pendenti per stanza.

Le tabelle sono leggibili solo dai membri tramite RLS. Le scritture dirette sono revocate, anche all'host: si usano le RPC. Le funzioni interne sono in `briscore_private`, con execute revocato; solo il controllo RLS di appartenenza è eseguibile dagli account. Tutte le funzioni SECURITY DEFINER hanno search_path vuoto e controlli espliciti di identità/appartenenza.

La tabella `hands` conserva gli input, non i punteggi derivati. I vincoli impediscono un chiamato in Carichi, ruoli uguali, giocatori di altre stanze e capotto in sconfitta. Gli ID degli account rimangono nelle membership; nomi e punteggi non autorizzano alcuna operazione.

La pubblicazione Realtime comprende `rooms`: ogni transazione aggiorna la revisione una sola volta. I client iscritti con JWT ricevono solo gli UPDATE autorizzati e ricaricano la snapshot completa. Non si diffondono eventi DELETE delle singole mani.

## Login e redirect

L'app richiede account reali; Anonymous Sign-Ins non è necessario. Email è abilitata nel progetto verificato. Google e Apple sono predisposti nel codice ma ancora disabilitati sul progetto: servono le credenziali OAuth dei rispettivi provider.

In Supabase Authentication → URL Configuration configurare il Site URL del sito effettivo e gli Additional Redirect URLs. Per lo sviluppo, autorizzare le origini utilizzate, ad esempio `http://localhost:3000/**` e `http://localhost:3100/**`. Gli inviti usano query string: il redirect deve conservarle. In produzione usare il proprio dominio HTTPS e percorsi strettamente necessari.

Non mettere service-role o secret key nelle variabili NEXT_PUBLIC. URL e publishable key sono sufficienti sia per il browser sia per le API utente.

## Documentazione ufficiale

- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database functions](https://supabase.com/docs/guides/database/functions)
- [Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes)
