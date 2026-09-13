# Collegamento Supabase: piano di migrazione

Lo schema SQL è preparatorio. L'app funziona ora con l'adattatore locale: non legge ancora variabili Supabase.

1. Abilitare Supabase Auth anonimo per identificare host e partecipanti senza una schermata di login. Usare `auth.uid()` e membership: il nome selezionato non deve autorizzare operazioni.
2. Implementare RPC transazionali per creazione stanza (esattamente cinque giocatori), ingresso tramite invito non enumerabile, proposta, approvazione/rifiuto e scrittura host. Verificare host, revisione e stato della mano originale sotto lock di riga. Convalidare anche payload JSON delle proposte. Solo l'host può modificare lo storico ufficiale.
3. Aggiungere policy RLS: letture ai membri della stanza; proposte ai membri autenticati anonimamente; modifiche a mani, giocatori e stato proposte esclusivamente via RPC protette. La bozza chiude tutti gli accessi fino a quel momento.
4. Implementare un adattatore Supabase con le medesime operazioni di `src/lib/rooms.ts`, convertendo UUID dei giocatori e timestamp nei contratti esistenti. La funzione pura di punteggio rimane invariata; i totali non vanno salvati.
5. Abilitare Realtime per mani e proposte con filtri per stanza e RLS. Sostituire il polling nel client con eventi che ricaricano una snapshot coerente; mantenere fetch iniziale e recupero dopo riconnessione.
6. Configurare URL e publishable key del progetto (solo queste nel browser). Implementare rate limiting, scadenza inviti e retention delle stanze. Non esporre service-role key.
7. Provare host e quattro browser separati: nessun partecipante può approvare, risultati identici dopo reconnect, richieste duplicate idempotenti, conflitti espliciti, utenti non membri esclusi.

Le stanze JSON locali non vengono migrate automaticamente: decidere se importarle o iniziare nuove partite al passaggio.
