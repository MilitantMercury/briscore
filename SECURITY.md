# Politica di sicurezza

## Versioni supportate

Riceve aggiornamenti di sicurezza soltanto l'ultima versione pubblicata da `main` su Vercel.

## Segnalare una vulnerabilità

Non aprire issue pubbliche per vulnerabilità che possano esporre dati, bypassare login/RLS o alterare punteggi e classifiche.

Invia invece una segnalazione privata al proprietario del repository con:

- descrizione e impatto;
- passaggi riproducibili minimi;
- eventuale proof of concept non distruttivo;
- contatto per gli aggiornamenti.

Riceverai una presa in carico entro sette giorni. Le correzioni vengono verificate in locale, distribuite tramite GitHub Actions/Vercel e documentate nel changelog quando è sicuro farlo.

## Ambito prioritario

- autenticazione Supabase e redirect OAuth;
- policy RLS e RPC `SECURITY DEFINER`;
- inviti, appartenenza alla stanza e permessi host;
- storage degli avatar e dati personali;
- integrità di punteggi, bot e classifica globale.
