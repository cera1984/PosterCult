# Verifica del prototipo — 25 ottobre 2026

Base del lavoro: `8227df4` (main, Focus website copy on posters only).

## Eseguito e superato

- `node --check app.js` e `node --check tshirt-viewer.js`.
- `npm test`: **2/2**, integrità/hash del GLB e della fonte CC0, controllo UV,
  validazione Khronos e disponibilità di originali/miniature di tutte le **270 immagini**.
- Khronos glTF Validator: **0 errori, 0 warning**, una nota informativa sulle
  UV non usate da texture interne al GLB (il viewer usa una decal indipendente).
- `npm run test:browser`: **8/8**, Chromium 141.0.7390.37, Playwright 1.56.1,
  Windows, rendering WebGL con SwiftShader; ultima esecuzione completa 11,4 s.
- Test sotto `/PosterCult/`, per controllare import, asset e URL del catalogo
  in una sottocartella come GitHub Pages.
- Ispezione visiva delle schermate di fronte bianco, fronte nero, retro,
  grafica orizzontale e viewport 390 × 844.
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

Le schermate sono in [screenshots](screenshots/). I test non certificano
fedeltà fisica, qualità di stampa, diritti delle immagini, prestazioni su
GPU reali o compatibilità Safari/Firefox. Il mobile è un viewport Chromium,
non un dispositivo fisico; pinch e rotella sono gestiti da OrbitControls ma
non sono stati provati su hardware touch. Il deployment remoto non fa parte
di queste verifiche locali.

Durante lo sviluppo un controllo dell'immagine originale ha letto lo stato
prima della fine del download: corretto il test affinché attenda il caricamento,
quindi rieseguita e superata l'intera suite. Nessun test saltato.
