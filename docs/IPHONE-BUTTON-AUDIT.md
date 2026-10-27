# Audit delle aperture dei tasti iPhone

Correzione del 27 ottobre 2026. La versione precedente confondeva destra e sinistra nella vista posteriore e derivava alcune quote dei volumi da una distanza fissa. I test di allora cercavano il foro sulle stesse coordinate errate usate dal generatore: non verificavano la corrispondenza con il lato fisico del telefono.

## Sistema di riferimento

- Le quote sotto sono in mm, dal bordo superiore del telefono al centro del tasto; per Ring/Silent la tavola specifica il centro della tasca (pocket centre).
- Destra e sinistra del telefono sono sempre riferite a chi guarda il display. Mute/Action e volumi sono a sinistra; accensione e Camera Control sono a destra.
- Il visualizzatore mostra inizialmente il dorso stampato: il tasto accensione appare quindi sul lato sinistro dell'immagine posteriore, e mute/Action e volumi sul lato destro.
- Nel modello +Z punta verso il dorso e la fotocamera si trova a -X. La sinistra del telefono corrisponde quindi a +X, la destra a -X. La quota verticale mesh è altezza/2 meno la quota Apple.

## Quote rilette sulle tavole laterali Apple

| Modello | Mute / Action | Volume + | Volume - | Accensione | Camera Control | Fonte |
|---|---:|---:|---:|---:|---:|---|
| 13 | 32.22 | 45.53 | 59.53 | 52.53 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-13.pdf) |
| 13 pro | 32.22 | 45.53 | 59.53 | 52.53 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-13-pro.pdf) |
| 13 pro max | 32.22 | 45.53 | 59.53 | 52.53 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-13-pro-max.pdf) |
| 14 | 31.98 | 45.43 | 59.63 | 52.53 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14.pdf) |
| 14 pro | 31.14 | 44.59 | 58.79 | 55.54 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14-pro.pdf) |
| 14 pro max | 31.14 | 44.59 | 58.79 | 55.54 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14-pro-max.pdf) |
| 15 | 32.83 | 46.27 | 60.47 | 53.37 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15.pdf) |
| 15 pro | 31.67 | 45.22 | 59.42 | 56.17 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15-pro.pdf) |
| 15 pro max | 31.67 | 45.22 | 59.42 | 56.17 | — | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15-pro-max.pdf) |
| 16 | 34.08 | 48.23 | 62.43 | 55.33 | 96.23 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16.pdf) |
| 16 pro | 34.08 | 48.23 | 62.43 | 55.33 | 98.19 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16-pro.pdf) |
| 16 pro max | 34.08 | 48.23 | 62.43 | 55.33 | 111.62 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16-pro-max.pdf) |
| 17 | 34.08 | 48.23 | 62.43 | 55.32 | 98.20 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17.pdf) |
| 17 pro | 34.28 | 48.43 | 62.63 | 55.53 | 98.40 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17-pro.pdf) |
| 17 pro max | 34.28 | 48.43 | 62.63 | 55.53 | 111.82 | [Apple](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17-pro-max.pdf) |

## Verifica indipendente della mesh

`tests/fixtures/iphone-button-audit.json` conserva la trascrizione delle tavole, il numero di foglio/pagina, la convenzione dei lati e lo SHA-256 di ciascun PDF consultato. I PDF non sono ridistribuiti. La fixture non importa i dati dal manifest dei modelli né dal generatore.

Per ogni tasto e ogni variante, i test controllano il lato fisico usando questa fixture; misurano poi entrambi i bordi del foro nel GLB esportato e richiedono che il centro misurato coincida con la quota verificata entro 0,02 mm. Controllano anche la presenza di materiale sul lato opposto a Mute/Action e Camera Control e il ponte fra i due volumi. Restano attive la validazione Khronos e le verifiche su camere, interno e porta inferiore.

I test browser acquisiscono anche entrambi i lati di ogni cover per una revisione visiva. Dimensioni e margini delle aperture restano scelte di anteprima: questa verifica dei centri e dei lati non certifica tolleranze, profili dei pulsanti o compatibilità di produzione.

Controprova: il GLB 14 Pro della versione precedentemente pubblicata è stato ricaricato dal commit Git e non supera la nuova verifica sul lato fisico di Mute/Action. La correzione non è soltanto un aggiornamento delle aspettative del test.

Esito finale: 25/25 test unitari e 27/27 test browser passati. Revisionate le 30 viste dei fianchi (accensione e volumi) delle 15 varianti. Tutti i GLB rigenerati passano la validazione Khronos.
