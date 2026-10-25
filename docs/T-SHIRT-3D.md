# T-shirt boxy: primo prototipo

Aprire il sito via HTTP/HTTPS, selezionare un poster e scegliere **T-shirt 3D**.
Trascinare per ruotare senza limiti sull'asse verticale; usare rotella/pizzico o i
pulsanti per lo zoom. Sono disponibili bianco, nero, fronte e retro. Il menu
**Grafica dal catalogo** cambia la stampa senza ricreare il visualizzatore.
La selezione della grafica non cambia il titolo e il link del poster aperto.

Il catalogo, i filtri, i preferiti e la vista poster/originale usano il codice
esistente. Three.js e il modello si caricano solo scegliendo T-shirt 3D.

## Modello e acquisizione

- Fonte ufficiale: [MakeHuman Shirts01](https://static.makehumancommunity.org/assets/assetpacks/shirts01.html).
- Download ufficiale gratuito, senza account: [shirts01_cc0.zip](https://files2.makehumancommunity.org/asset_packs/shirts01/shirts01_cc0.zip).
- Asset selezionato: `clothes/elvs_crude_t-shirt_male/crude_male_shirt.obj`.
- Autore nel file: **Makehuman edited by Elvaerwyn**. La scheda del pacchetto indica **CC0**, confermato nell'intestazione di OBJ e MHCLO.
- Acquisito il 25 ottobre 2026. SHA-256 dell'archivio: `a5a723b0e84a109bb190fcfeac7f1de4138d875da3e30fe5b3340eac9f38bcd3`.
- Sorgenti originali e copia della pagina di provenienza: `assets/models/source/`.
- Testo CC0 ufficiale: `assets/models/CC0-1.0.txt`, copiato da [MakeHuman LICENSE.ASSETS.md](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md).
- [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) permette copia, modifica, distribuzione e uso commerciale. Il credito viene comunque mantenuto nella vista e nei metadati.

Il modello di partenza è una T-shirt standard, **non un cartamodello oversized
certificato**. Il derivato allarga corpo e maniche del 22% rispetto all'altezza e
comprime la profondità al 58%, rettifica il profilo della vita e abbassa le
estremità delle maniche, creando una silhouette boxy indicativa. Il file
GLB risultante è autosufficiente; non contiene avatar, texture del pacchetto,
animazioni o riferimenti esterni. Anche questo adattamento geometrico viene
distribuito sotto CC0 1.0. La licenza non si estende alle immagini del catalogo.

Alternative esaminate ma non incluse:

- [Oversized t-shirt di kylelhb](https://sketchfab.com/3d-models/oversized-t-shirt-3b6e78d6a1a74370a6e5af6f312d38f7): scheda indicizzata con CC Attribution, ma download ufficiale non completato/verificato in questa sessione; nessun prelievo dal viewer.
- [Basic oversized women T-shirt](https://www.turbosquid.com/3d-models/basic-oversized-women-tshirt-model-2132998): gratuito con Standard License; non acquisito e non incluso, poiché non basta la dicitura gratuito per assumere la redistribuibilità del file in un sito statico.

## Formato, UV e stampa

`scripts/build-shirt.mjs` converte l'OBJ in glTF 2.0 binario (`.glb`), con
posizioni, normali mediate e UV originali. Il [report](shirt-model-report.json)
registra hash, dimensioni, conteggi e intervalli UV; la [mappa UV](shirt-uv.svg)
permette l'ispezione. Sono presenti 6.204 vertici espansi, 2.068 triangoli,
UV finite nell'intervallo 0–1 e zero triangoli UV degeneri. L'assenza di
sovrapposizioni delle isole UV **non è certificata**.

Il validatore Khronos glTF restituisce zero errori e zero warning; segnala
solo che `TEXCOORD_0` non viene usato da una texture nel GLB. È intenzionale:
il colore è uniforme e la grafica usa le UV indipendenti generate da
`DecalGeometry` sulla superficie frontale. I triangoli con normali rivolte
all'indietro o nel semispazio posteriore sono esclusi prima della proiezione.
La grafica segue la geometria e mantiene il rapporto d'aspetto; un'immagine
orizzontale viene ridotta, senza tagliarla o stirarla. La texture è limitata a
2.048 pixel o al massimo supportato dal dispositivo, se inferiore.

## Limiti

- Anteprima di forma e grafica: nessuna simulazione fisica di cotone, caduta,
  taglia, cuciture, spessore, vestibilità o resa di stampa reale.
- Modello a bassa complessità, non una scansione o un mockup fotorealistico.
- Stampa solo frontale, centrata, dimensione automatica; nessun posizionamento
  libero, stampa sul retro, esportazione o file di produzione.
- Nessuna rimozione automatica dello sfondo delle immagini.
- WebGL 2 e browser moderno con moduli/import map richiesti per il 3D.
  Aprire direttamente `index.html` come `file://` non supporta il 3D;
  il catalogo e le viste poster/originale restano indipendenti dal modulo.
- La verifica mobile usa un viewport Chromium: non sostituisce prove su
  dispositivi fisici, Safari o Firefox.
- La licenza CC0 riguarda il modello. I diritti delle grafiche del catalogo
  non sono stati verificati e non vengono attribuiti dalla licenza del modello.

## Sviluppo e verifica riproducibile

Richiede Node.js 20 o successivo:

```sh
npm ci
npm run serve
```

Aprire `http://127.0.0.1:4173/`. Nessuna build necessaria per GitHub Pages:
modello, moduli Three.js e licenza MIT sono già inclusi sotto `assets/` e
`vendor/`. Nessun CDN necessario a runtime.

```sh
npm test
npx playwright install chromium
npm run test:browser
```

I test browser servono anche il sito sotto `/PosterCult/`, per verificare i
percorsi relativi usati da GitHub Pages. Controllano il canvas WebGL, cambi di
colore e grafica, rotazione tramite trascinamento e tastiera, zoom, fronte/retro,
riapertura, poster, ricerca, preferiti, originali, viewport mobile e recupero
dagli errori di modello, immagine e WebGL. Le schermate si trovano in
`docs/screenshots/`. L'esito della singola esecuzione è in `VALIDATION.md`.

Rigenerazione degli asset, senza scaricare nuovamente il pacchetto:

```sh
node scripts/build-shirt.mjs
npm run vendor
```
