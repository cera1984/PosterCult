# Fuori Campo — archivio personale

## Configuratore 3D

Nella scheda di ogni poster è disponibile **T-shirt 3D**: seleziona T-shirt o
felpa, ruota il capo a 360°, scegli il colore e aggiungi più grafiche sul
fronte o sul retro. Ogni grafica ha posizione, scala, rotazione, ribaltamento
e ritaglio indipendenti; le composizioni si salvano sul dispositivo. La vista
poster resta quella predefinita. Per il 3D aprire il sito da GitHub Pages oppure eseguire
`npm ci` e `npm run serve`, quindi visitare `http://127.0.0.1:4173/`.
La modalità `file://` descritta sotto supporta il catalogo, ma non il 3D.

La T-shirt boxy usa un modello CC0 di MakeHuman adattato; la felpa usa il
Premium Eco Hoodie di lekuns, distribuito con licenza CC BY 4.0. Le anteprime
sono indicative: non simulano vestibilità o stampa fisica. [Fonti, licenze,
UV e limiti](docs/T-SHIRT-3D.md). [Risultati dei test](docs/VALIDATION.md).

Le istruzioni seguenti descrivono l'archivio locale originale.

Apri **`E:\POSTERZ\site\index.html`** nel browser. Non occorrono account né connessione internet. Il sito non invia foto online e non offre acquisti.

Sono catalogate tutte le immagini reali presenti nelle cartelle di `E:\POSTERZ`. Puoi cercare per film o file, filtrare per cartella e, dentro **Altri film**, per sottosezione (`ITALIANI`, `DARIO ARGENTO`, `NOSFERATU`, ecc.). Puoi salvare i preferiti e provare visivamente ciascuna immagine su maglietta, felpa e poster. La preview di maglietta/felpa è interattiva: trascina il capo per inclinarlo e vedere come la grafica segue il busto, con ombre, cuciture e pieghe. Dalla scheda puoi aprire **il file originale**, senza modificarlo. Le anteprime non sono file di stampa e non garantiscono la resa finale: controlla le dimensioni e chiedi allo stampatore il formato richiesto. Alcuni originali sono JPG/WebP e non necessariamente lossless.

Le miniature in `site\thumbs` sono copie leggere per sfogliare la galleria; gli originali restano nelle loro cartelle. I preferiti sono salvati solo nel browser del computer.

## Aggiungere nuove foto

Il catalogo conserva le categorie dell'archivio e offre menu a cascata per
categoria e sottocartelle, ricerca e conteggi aggiornati anche nei preferiti.
La cartella tecnica `others` non compare come categoria generica: i suoi
contenuti restano nelle categorie già assegnate, senza cancellare le immagini.

Dopo la rigenerazione, `node scripts/check-catalog.mjs` verifica che tutti i
percorsi coincidano esattamente con i nomi registrati in Git, comprese le
maiuscole/minuscole: GitHub Pages le distingue anche quando Windows non lo fa.
I nuovi file devono essere aggiunti a Git prima di questo controllo.

Metti le immagini in una cartella **dentro `E:\POSTERZ`, ma fuori da `site`**. Per aggiornare catalogo e miniature, esegui:

```powershell
py "E:\POSTERZ\site\generate_catalog.py"
```

Richiede Python e Pillow (`py -m pip install Pillow` solo se non è già installato). Gli originali non vengono toccati. Se sposti tutto l'archivio in un altro posto, mantieni la cartella `site` come sottocartella dell'archivio e rigenera il catalogo. Apri la pagina come file locale, non tramite un server che espone solo `site`, altrimenti i collegamenti agli originali nelle cartelle superiori potrebbero non funzionare.

Uso pensato per la consultazione privata. Se in futuro vorrai pubblicare o vendere prodotti con poster di film, verifica prima i diritti necessari.

## Pubblicare su GitHub Pages

Il pacchetto `site` è già autosufficiente: include `assets\originals`, le miniature e `.nojekyll`. Questo significa che, una volta pubblicato, anche gli amici con il link vedranno le immagini. **Non è un accesso protetto**: chiunque riceva il link può salvare le immagini mostrate.

1. Crea su GitHub un repository vuoto, per esempio `posterz-privato`.
2. Carica tutto il contenuto della cartella `E:\POSTERZ\site` nella radice del repository (non la cartella `site` dentro un'altra cartella).
3. In GitHub apri `Settings → Pages`, scegli `Deploy from a branch`, branch `main`, cartella `/ (root)`, quindi salva.
4. Dopo qualche minuto l'indirizzo sarà `https://TUO-USERNAME.github.io/posterz-privato/`.

GitHub consente file singoli fino a 100 MB; il pacchetto attuale è circa 72 MB complessivi. Per aggiornare le immagini: aggiungile nell'archivio, esegui `py "E:\POSTERZ\site\generate_catalog.py"`, poi ricarica su GitHub `gallery-data.js`, `thumbs` e `assets`.

## Cover iPhone 16 Pro

Cover parametrica con grafica dinamica, rotazione e zoom. Quote nominali Apple; aperture e vestibilità da validare. [Ricerca, licenza e limiti](docs/IPHONE-16-PRO.md). Le altre varianti restano indicative.

Tutte le 15 varianti iPhone 13–17 del selettore ora usano cover cave dedicate con gli stessi cursori della grafica. [Modelli, quote, limiti e test](docs/IPHONE-COVERS.md).

## Interfaccia Cinema Club
Home sfogliabile, categorie rapide, scelta casuale fra i risultati, ordinamento, griglia ampia/compatta e accesso diretto ai configuratori. [Interazioni e verifiche](docs/INTERFACE.md).
