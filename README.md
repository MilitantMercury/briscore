# Briscore

Segnapunti condiviso per Briscolone a cinque giocatori, con Next.js App Router, TypeScript, Tailwind CSS e Supabase Auth/Database/Realtime.

## Avvio

Node.js 22 o superiore. Creare `.env.local` da `.env.example` e inserire URL e publishable key Supabase. Nessuna service-role key è richiesta dall'app.

```sh
npm install
npm run dev
```

Aprire http://localhost:3000. Per produzione: `npm run build`, poi `npm start`. Le partite sono salvate su Supabase; l'app richiede un server Next.js raggiungibile. GitHub conserva il codice, non ospita automaticamente l'app.

## Account e partita

- Login obbligatorio. Email magic link è disponibile; Google e Apple appaiono attivi solo quando i provider sono realmente configurati su Supabase.
- La sessione viene mantenuta dal browser e rinnovata da Supabase. Il link di invito viene conservato anche durante il ritorno dal login.
- Chi crea la stanza inserisce il proprio nome al primo posto ed è l'host. Il ruolo deriva dall'account Supabase, mai da un token locale.
- L'host condivide un invito contenente ID stanza e token di invito. Ogni altro account sceglie uno dei quattro posti liberi. Uno stesso account non occupa più posti; un sesto account non può entrare.
- Solo i membri possono leggere i dati. Il nome associato alla proposta viene ricavato dall'account, non dal testo inviato dal client.
- Ogni partecipante propone nuove mani, modifiche ed eliminazioni. Solo l'host approva/rifiuta; le sue operazioni sono immediate.
- Tutte le scritture sono transazionali e controllano la revisione. Un form aperto prima di un aggiornamento segnala un conflitto e richiede di controllare i dati prima di riprovare.
- Realtime notifica le modifiche alla stanza e il client ricarica una snapshot coerente. Recupero al ritorno in primo piano/online e tentativi ogni 10 secondi solo se il canale non è collegato.
- “Le tue partite” recupera le ultime 30 stanze dell'account anche da un altro browser. La classifica generale tra partite e la conclusione ufficiale delle sessioni restano funzionalità successive.
- Reset rimuove le mani e rifiuta le proposte pendenti, mantenendo giocatori e appartenenze. Nuova sessione torna alla creazione; le altre stanze restano recuperabili dall'account.

## Punteggi

`src/lib/game.ts` contiene l'unica funzione di calcolo, pura e testabile.

| Chiamata vinta   | Chiamante | Chiamato | Altri |
| ---------------- | --------: | -------: | ----: |
| Normale          |        +2 |       +1 |    −1 |
| 70–79            |        +4 |       +2 |    −2 |
| 80+              |        +6 |       +3 |    −3 |
| Carichi, da solo |        +4 |        — |    −1 |

Sconfitta: segni invertiti. Il capotto raddoppia tutti i delta sia quando vince il chiamante sia quando perde, anche per Carichi. La somma è sempre zero. I risultati e la classifica sono derivati dalle mani e non vengono salvati come totali modificabili.

## Giri e conclusione

Una sessione è organizzata in giri da cinque mani, così ogni giocatore può fare le carte. Dopo la quinta mano il giro viene bloccato: l'host può avviare un nuovo giro oppure concludere definitivamente la sessione. Una sessione conclusa non accetta più modifiche; solo le sessioni concluse potranno alimentare la classifica globale.

## Database e sicurezza

`src/lib/rooms.ts` chiama le RPC Supabase con il JWT dell'utente verificato dal server. Non usa file JSON, service-role key o mutex in memoria. Il database valida autonomamente ruoli, partecipanti, chiamata e capotto anche se qualcuno chiama una RPC senza passare da Next.js.

Migrazioni e istruzioni: [supabase/README.md](supabase/README.md). Le vecchie partite in `.briscore-data` sono preservate sul disco e ignorate da Git, ma non vengono importate automaticamente: mancavano le identità account necessarie per attribuirle correttamente. La nuova app usa solo Supabase. localStorage conserva soltanto sessione Auth e riferimento all'ultima stanza per account.

Il deploy su Vercel parte dai push su `main`. La pipeline GitHub Actions esegue i controlli e applica le migrazioni Supabase in ambiente `production`; richiede i secret `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD`.

## Verifiche

```sh
npm run lint
npm test
npm run typecheck
npm run build
```

Per il test end-to-end su Supabase, avviare la build su una porta separata:

```sh
npm run start -- --port 3100
```

In un'altra finestra PowerShell, con Supabase CLI autenticata:

```powershell
$env:BRISCORE_ALLOW_REMOTE_TESTS = "1"
npm run test:integration
```

Il test è esplicitamente limitato al progetto Briscore e crea sei account sintetici senza inviare email. Verifica cinque membri, esclusione esterni, RLS, scritture host, autore proposte, approvazioni, conflitti, Carichi/capotto, persistenza e ricezione Realtime. Al termine rimuove soltanto gli account e le stanze creati dal test. La credenziale amministrativa viene letta tramite CLI solo in memoria per le fixture, mai scritta nei file o usata dall'app.
