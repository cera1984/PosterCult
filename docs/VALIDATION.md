# Verifica del prototipo — 25 ottobre 2026

Base della correzione dei percorsi: `066531b`.

## Eseguito e superato

- `node --check app.js` e `node --check tshirt-viewer.js`.
- `npm test`: **4/4**, integrità/hash del GLB e della fonte CC0, controllo UV,
  validazione Khronos e disponibilità di originali/miniature di tutte le **270 immagini**.
- Khronos glTF Validator: **0 errori, 0 warning**, una nota informativa sulle
  UV non usate da texture interne al GLB (il viewer usa una decal indipendente).
- `npm run test:browser`: **12/12**, Chromium 141.0.7390.37, Playwright 1.56.1,
  Windows, rendering WebGL con SwiftShader.
- Test sotto `/PosterCult/`, per controllare import, asset e URL del catalogo
  in una sottocartella come GitHub Pages.
- Ispezione visiva delle schermate di fronte bianco, fronte nero, retro,
  grafica orizzontale e viewport 390 × 844, più la grafica 2001 inclinata e
  dettagli ravvicinati in bianco e nero.
- Installazione delle dipendenze: audit npm iniziale **0 vulnerabilità**.

## Copertura browser

1. Canvas WebGL visibile e schermate diverse cambiando colore; trascinamento,
   tastiera, fronte/retro, zoom tramite pulsanti, cambio grafica e riapertura.
2. Galleria poster, ricerca Pulp Fiction, apertura da tastiera, immagine
   originale caricata, link originale accessibile, preferiti persistenti;
   nessun caricamento di Three.js mentre si usano solo i poster.
3. Viewport mobile: vista 3D e controlli funzionanti, nessun overflow orizzontale.
4. Modello non trovato: messaggio esplicito e ritorno al poster.
5. Grafica non trovata: messaggio esplicito, grafica precedente conservata,
   ripristino con una selezione valida.
6. Cambio vista durante il download: nessun canvas rimasto o duplicato.
7. WebGL non disponibile: messaggio esplicito, poster utilizzabile.
8. Download grafico lento seguito da una nuova selezione: resta l'ultima grafica,
   senza sostituzioni dovute alla risposta precedente arrivata in ritardo.
9. Grafica 2001 a 17° e zoom ravvicinato: rendering della trama e dei dettagli,
   nessun errore WebGL/GLSL segnalato nella console. Anche il test desktop
   controlla gli errori di compilazione dei materiali.
10. Percentuali rapide 100/150/200, scala libera 275 e limiti 25/300:
    dimensioni proporzionali, nessun nuovo download della grafica, conservazione
    della percentuale cambiando immagine e ripristino al 100% riaprendo la vista.
11. Cambio scala durante il download di una nuova immagine: la nuova grafica
    usa l'ultima percentuale impostata. Anche il test mobile prova il 200%.
12. `sopranos2.webp`: poster caricato, link originale con cartella `sopranos`,
    stampa 3D pronta e controllo 200% attivo. Il percorso con `SOPRANOS`
    restituisce 404 anche nel server di test Windows.

## Correzione dei percorsi del catalogo

Rilevati e corretti **205 riferimenti originali** con maiuscole/minuscole
diverse dai nomi registrati in Git. Non mancavano le immagini: erano gli URL
del catalogo a differire dai nomi pubblicati. La verifica precedente con
`fs.access` su Windows non rilevava questa differenza; il test ora confronta
tutti i percorsi esattamente con quelli di Git. `node scripts/check-catalog.mjs`
riporta 270 immagini, zero percorsi discordanti e zero file mancanti.

Il server locale ora riproduce la distinzione tra maiuscole e minuscole per
originali e miniature. La rigenerazione del catalogo riusa la grafia effettiva
dei file di destinazione, invece di copiarla dal percorso dell'archivio sorgente.
Due test Python sul generatore sono passati (`python -m unittest discover -s
tests -p test_catalog_generator.py`).

Due test unitari dedicati verificano proporzioni e limiti della grafica per
immagini verticali, orizzontali e quadrate. Il modello verifica anche il nuovo
rapporto larghezza/altezza e la vista browser parte da almeno 4,45 unità di
distanza, adattandosi al riquadro per lasciare margine attorno al capo.

Il test del GLB ora verifica anche i quattro bordi aperti dopo caricamento
del modello indicizzato (collo, fondo e due maniche), e il limite di peso.
Modello finale: 33.088 triangoli, 16.998 vertici indicizzati, 743.732 byte;
normali ricalcolate dopo la deformazione e UV originali interpolate.

Le schermate sono in [screenshots](screenshots/). I test non certificano
fedeltà fisica, qualità di stampa, diritti delle immagini, prestazioni su
GPU reali o compatibilità Safari/Firefox. Il mobile è un viewport Chromium,
non un dispositivo fisico; pinch e rotella sono gestiti da OrbitControls ma
non sono stati provati su hardware touch. Il deployment remoto non fa parte
di queste verifiche locali.

Durante lo sviluppo un controllo dell'immagine originale ha letto lo stato
prima della fine del download: corretto il test affinché attenda il caricamento,
quindi rieseguita e superata l'intera suite. Nessun test saltato.
