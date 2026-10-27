# PosterCult — Cinema Club interface

Interfaccia aggiornata mantenendo il catalogo, gli originali e i configuratori esistenti. La nuova veste usa font di sistema, carta avorio, verde scuro, ruggine, bordi da locandina e una gerarchia tipografica serif/monospace. Non richiede font esterni o nuovi servizi.

## Interazioni

- Locandine in apertura navigabili con frecce, click e tastiera; titolo e pulsante aprono la locandina effettivamente mostrata.
- Conteggi ricavati dal catalogo, senza statistiche inventate.
- Sorprendimi e Una scelta a caso scelgono fra i risultati correnti, rispettando ricerca, categorie e preferiti; sono disabilitati con zero risultati.
- Categorie rapide sincronizzate con i filtri a cascata esistenti.
- Ordinamento originale, titolo A–Z o risoluzione maggiore (area in pixel).
- Griglia ampia o compatta. Solo la densità si conserva nel browser; ricerca e ordinamento ripartono dallo stato iniziale al ricaricamento.
- Apertura diretta della T-shirt o della cover da ogni scheda, con nome accessibile contestuale.
- Feedback sui preferiti e scorciatoia / per cercare; la scorciatoia non intercetta la scrittura nei campi o i comandi del dialogo.

## Struttura e accessibilità

`experience.css` applica la nuova veste dopo gli stili esistenti; `experience.js` gestisce le interazioni tramite la piccola API `window.PosterCultUI` esposta da `app.js`. I modelli 3D e i loro dati geometrici non sono cambiati. Il 3D continua a caricarsi solo su richiesta.

Header fisso, link per saltare al catalogo, focus visibili, controlli etichettati, navigazione da tastiera e rispetto di prefers-reduced-motion. Le griglie e il dialogo si adattano ai telefoni senza scorrimento orizzontale; le scorciatoie delle schede restano visibili sui dispositivi touch.

## Verifica

`npm test` e `node node_modules/playwright/cli.js test --config=playwright.software.config.js --reporter=line`. I nuovi scenari verificano navigazione delle locandine, ricerca da tastiera, scelta casuale filtrata, categorie rapide, ordinamento, persistenza della densità, preferiti, accesso diretto alla cover e layout mobile. Resta attiva tutta la suite delle cover e dei capi.

Controllate visivamente home desktop/mobile, apertura del catalogo, filtri, configuratore desktop e controlli su telefono. Nessuna immagine del catalogo viene alterata.

Esito finale: 25 test unitari e 30 test browser passati, comprese le regressioni delle 15 cover e dei capi 3D.
