# Pubblicazione su Vercel

Il repository contiene `vercel.json`: framework Other, nessuna installazione di dipendenze, build `node scripts/build-static.mjs`, cartella pubblica `dist`. Lo script copia HTML, CSS, JavaScript, licenze, documentazione, immagini e risorse 3D. Non copia `.git`, `.vercel`, `node_modules`, script di sviluppo o test. Non servono variabili di ambiente.

## Collegamento iniziale

1. Accedere al proprio account Vercel e scegliere il piano gratuito Hobby per uso personale.
2. Importare da GitHub `cera1984/PosterCult`, con branch di produzione `main` e directory principale del repository.
3. Impostare il nome progetto `postercult`, se disponibile. Lasciare applicare i parametri di `vercel.json`.
4. Pubblicare e verificare l'indirizzo assegnato da Vercel. `postercult.vercel.app` è una preferenza: la disponibilità può essere confermata soltanto nel proprio account.
5. Il collegamento Git permette di pubblicare automaticamente i commit successivi di `main`.

Usare l'importazione Git: il pacchetto statico attuale pesa circa 247,5 MiB (922 file), mentre Vercel documenta un limite di 100 MB per l'upload dei sorgenti tramite CLI sul piano Hobby. Non è necessario cambiare piano o ridurre la qualità degli originali per tentare l'importazione Git.

## Verifiche locali

`node scripts/build-static.mjs` genera il pacchetto, verificato anche escludendo cartelle di sviluppo. Il pacchetto è stato servito alla radice `/` e provato in Chromium/SwiftShader a 390×844: cinema pronto, consiglio con tre note, cover 3D e rotazione funzionanti, nessun errore JavaScript. Passati anche i 27 test unitari. La verifica locale non conferma l'accesso all'account, la disponibilità del nome o l'avvenuta pubblicazione su Vercel: questi controlli richiedono il collegamento del servizio.

Riferimenti: [configurazione](https://vercel.com/docs/project-configuration/vercel-json), [importazione e build Git](https://vercel.com/docs/builds), [limiti](https://vercel.com/docs/limits), [piano Hobby](https://vercel.com/docs/plans/hobby).

## Collegamento attivato il 27 ottobre 2026

Progetto Vercel `cera1984/postercult`, piano Hobby, collegato al repository `cera1984/PosterCult`. Branch di produzione verificato: `main`. Le credenziali e i file di collegamento locali generati dalla CLI sono esclusi da Git tramite `.vercel/` e `.env*`. Il push su `main` avvia il primo deploy Git e quelli successivi; indirizzo e stato effettivi vanno confermati dopo il completamento della build.
