# Changelog

## Non rilasciato

### Prodotto

- Ridisegnate tutte le pagine con tema Briscola, sfondo animato e UI coerente.
- Aggiunta navigazione globale, menu account, popup di conferma Briscore e modale di inserimento mano.
- Aggiunti avatar personalizzati, upload con riduzione immagine, effetti Fuoco/Acqua/Scintille e corone della classifica.
- Aggiunte pagine Partite, Classifica, Profilo e riepilogo finale.
- Migliorato il riepilogo delle statistiche: totale, punti guadagnati e punti persi sono distinti chiaramente.

### Tavoli e punteggi

- Ingresso automatico nei primi cinque posti e spettatore dal sesto account.
- Approvazione host per ogni proposta dei giocatori; annullamento partita riservato all'host.
- Giri da cinque mani, conclusione sessione e annullamento senza impatto sulla classifica.
- Capotto valido in entrambi gli esiti, incluso Carichi.
- Introdotti bot di tavolo: posti senza account autenticato esclusi da classifica, corone e statistiche persistenti.

### Piattaforma

- Autenticazione obbligatoria con magic link e OAuth configurabile.
- Migrazioni Supabase, policy RLS, RPC transazionali e sincronizzazione Realtime.
- Vercel collegato a `main` per il deploy automatico.
- Pipeline GitHub Actions con Node 22, Supabase CLI v3, controlli di qualità e migrazioni protette.
- Aggiunti Dependabot settimanale e attestazioni firmate della build.
- Integrati Grafana e Supabase Cron per osservabilità e manutenzione futura.
