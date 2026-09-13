# Briscore

Segnapunti condiviso per Briscolone a cinque giocatori. Next.js App Router, TypeScript e Tailwind CSS. Nessun account richiesto.

## Avvio

Richiede Node.js 22 o superiore.

```sh
npm install
npm run dev
```

Aprire http://localhost:3000. Per provare con altri telefoni sulla stessa rete Wi-Fi, aprire `http://IP-DEL-COMPUTER:3000` e condividere il link generato da quell'indirizzo. Il server deve restare acceso e raggiungibile. Per l'utilizzo via Internet occorre ospitare il server su un indirizzo HTTPS pubblico.

```sh
npm run lint
npm test
npm run typecheck
npm run build
npm start
```

Con il server avviato, `npm run test:integration` verifica anche autorizzazioni host, proposte, approvazioni, conflitti e modifiche concorrenti tramite HTTP. Crea una stanza di test separata con nomi sintetici.

## Partita condivisa

- Chi crea la stanza è host. Il suo token viene conservato solo nel browser; il link condiviso non lo contiene.
- Ogni partecipante seleziona il proprio nome e propone nuove mani, modifiche o eliminazioni. Il nome è una dichiarazione, non un'identità autenticata.
- Solo l'host approva/rifiuta le proposte; le modifiche dirette dell'host sono immediate.
- Punti e storico si aggiornano automaticamente ogni 1,5 secondi su tutti i dispositivi. In caso di perdita di connessione le scritture sono disabilitate e il client ritenta automaticamente.
- Il server verifica token, revisione e regole; una modifica concorrente non sovrascrive silenziosamente un'altra. Le proposte su mani cambiate sono bloccate all'approvazione.
- I punteggi sono sempre derivati dallo storico con `calculateHandScore`, anche dopo ripristino, modifica e cancellazione.
- Per Carichi il risultato finale è `+4/-1` (o `-4/+1`), senza ulteriore moltiplicazione.
- Reset svuota lo storico mantenendo stanza e giocatori. Nuova sessione crea un nuovo tavolo; il vecchio link resta consultabile. Il browser conserva il token dell'ultima stanza creata: creare una nuova stanza sostituisce il precedente accesso host locale.

## Persistenza e futuro Supabase

L'adattatore corrente è `src/lib/rooms.ts`: salva atomicamente file JSON nella cartella `.briscore-data` (ignorata da Git), oppure nel percorso `BRISCORE_DATA_DIR`. Il server salva giocatori, data, storico e proposte; localStorage conserva soltanto l'accesso alla stanza. È un backend di sviluppo/singola istanza con disco persistente: non usare questo adattatore su filesystem effimeri o più processi/repliche.

La logica pura in `src/lib/game.ts` è indipendente dal backend. Componenti e API usano il contratto `Room`/`Proposal`. La bozza `supabase/schema.sql` definisce il modello relazionale di destinazione con RLS chiusa di default. Non è una migrazione attiva né un backend Supabase già collegato. Il piano in `supabase/README.md` elenca i passaggi per il passaggio a Supabase Auth anonimo + Realtime, senza introdurre un login visibile.

Prima di esporre pubblicamente: sostituire l'adattatore con Supabase, aggiungere limiti per creazione stanze/proposte, HTTPS e pulizia delle sessioni. Non inserire mai la service-role key nel client.
