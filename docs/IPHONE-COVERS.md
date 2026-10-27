# Cover iPhone — modelli dedicati

Tutte le 15 varianti del selettore esistente usano ora scocche cave GLB dedicate. Sono state eliminate le vecchie sagome con schermo e lenti finte. La grafica, i tre cursori, il ritaglio intera/riempi, rotazione e zoom funzionano su ogni cover.

## Quote nominali del telefono

Quote in mm confrontate con le tavole Apple, pagina del disegno principale. I link conducono ai documenti originali; i PDF non sono ridistribuiti.

| Modello | Larghezza | Altezza | Spessore | Fonte |
|---|---:|---:|---:|---|
| 13 | 71.52 | 146.70 | 7.65 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-13.pdf) |
| 13 Pro | 71.52 | 146.71 | 7.65 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-13-pro.pdf) |
| 13 Pro Max | 78.07 | 160.84 | 7.65 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-13-pro-max.pdf) |
| 14 | 71.52 | 146.71 | 7.80 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14.pdf) |
| 14 Pro | 71.45 | 147.46 | 7.85 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14-pro.pdf) |
| 14 Pro Max | 77.58 | 160.71 | 7.85 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14-pro-max.pdf) |
| 15 | 71.63 | 147.64 | 7.81 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15.pdf) |
| 15 Pro | 70.60 | 146.61 | 8.25 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15-pro.pdf) |
| 15 Pro Max | 76.73 | 159.86 | 8.25 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15-pro-max.pdf) |
| 16 | 71.63 | 147.64 | 7.81 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16.pdf) |
| 16 Pro | 71.45 | 149.61 | 8.25 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16-pro.pdf) |
| 16 Pro Max | 77.58 | 163.03 | 8.25 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16-pro-max.pdf) |
| 17 | 71.45 | 149.61 | 7.95 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17.pdf) |
| 17 Pro | 71.85 | 150.01 | 8.75 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17-pro.pdf) |
| 17 Pro Max | 77.99 | 163.43 | 8.75 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17-pro-max.pdf) |

## Differenze rappresentate

- Aperture camera quadrate di ingombri diversi per 13/14/15 e Pro fino al 16.
- Apertura verticale con foro flash separato per 16 e 17 base.
- Apertura larga per la fascia camera di 17 Pro e Pro Max.
- Aperture per mute/Action, volume e accensione; Camera Control solo nelle serie 16 e 17.
- Porta Lightning per 13/14, USB-C per 15/16/17, con fori inferiori.
- Ogni mesh viene ricostruita in mm sul suo profilo, non deformata a partire dal GLB del 16 Pro. La vista normalizza l'altezza per mantenere leggibile l'anteprima.

## Limiti e licenza

Sono modelli originali per anteprima, non CAD industriali né mesh di un produttore di cover. Gli ingombri del telefono sono separati dalle scelte progettuali della scocca: gioco 0,3 mm, parete/dorso 1,5 mm; raggi circolari semplificati, profili e margini delle aperture camera e tasti adattati per visualizzazione. Posizioni dei comandi, dei fori inferiori e keepout non sono una trascrizione completa di tutte le tavole. Nessuna prova di incastro o certificazione MagSafe/RF. La proiezione della stampa sui fianchi rimane approssimativa.

`phone-case-models.js`, geometria originale, generatore e i 15 GLB sono MIT, come indicato in LICENSE-IPHONE-GEOMETRY.txt. I disegni Apple restano soggetti ai termini Apple. Le varianti mini, Plus, Air, SE/e e precedenti alla serie 13 non sono incluse in questo selettore.

## Riproducibilità e test

`npm ci`, poi `node scripts/build-phone-case.mjs` ricostruiscono tutti i GLB; passando un id (ad esempio `iphone-17-pro`) si ricostruisce solo quello. Il manifest `phone-case-models.js` contiene dati, URL e caratteristiche. Il browser scarica soltanto il GLB selezionato e ignora i caricamenti superati da una selezione successiva. Se un download fallisce, rimane l'ultima cover valida e il menu torna al modello effettivamente visibile.

I test unitari validano ogni GLB con Khronos, controllano ingombro, coordinate finite, fori camera e aperture per comando/porta, e verificano che i file siano distinti. I test browser percorrono il selettore completo con schermate per ogni variante, verificano i cambi rapidi, gli errori di download e la conservazione della grafica e degli slider. La verifica di pubblicazione confronta anche tutti i 15 file GLB con il commit distribuito.

Esito: 25/25 test unitari e 27/27 test browser passati; tutti i 15 GLB hanno zero errori e zero warning Khronos. Controllata la tavola comparativa delle 15 schermate renderizzate.
