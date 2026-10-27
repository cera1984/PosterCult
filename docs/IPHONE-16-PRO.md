# Cover iPhone 16 Pro — ricerca e implementazione, 27 ottobre 2026

## Risultato e stato
Il 16 Pro usa ora una cover cava parametrica originale, senza telefono o lenti finte: dorso con foro fotocamere reale, protezione rialzata, fronte aperto e interruzioni dei bordi per tasti, Camera Control e connettori. Grafica dinamica sul dorso con UV planari e ritaglio centrale, rotazione OrbitControls senza limite azimutale, zoom mouse/touch e pulsanti. Il modello iniziale è il 16 Pro. Le altre 14 varianti mantengono l'anteprima precedente indicativa. Poster e T-shirt non sono stati modificati.

**Non è stato acquisito né validato un modello esterno preciso con licenza commerciale.** L'implementazione è un miglioramento verificabile del prototipo, non soddisfa ancora il requisito di una cover industriale verificata. Non dichiarare compatibilità fisica o certificazione Apple.

## Fonti controllate
- Apple, [Dimensional Drawings iPhone 16 Pro](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16-pro.pdf), tavola 1 di 4 (pagina PDF 2): ingombro 71,45 × 149,61 × 8,25 mm; vetro posteriore → plateau 2,05 mm; vetro → lenti 4,28 mm; spessore cover posteriore massimo indicato 2,1 mm. Queste sono quote del telefono, non dimensioni di una cover finita.
- [Apple Accessories](https://developer.apple.com/accessories/): fonte ufficiale dei disegni e linee guida. Consultate anche le condizioni del PDF: la disponibilità non concede licenze IP Apple. Il PDF e i disegni non sono ridistribuiti nel repository.
- [PaperFlare, Printables 1652998](https://www.printables.com/model/1652998): candidato gratuito segnalato come CC BY da aggregatore; pagina originale non accessibile nel controllo web, file e licenza originale non verificati. Non importato.
- JsR, “Iphone 16 PRO case”: candidato indicizzato CC BY-SA; mancano acquisizione del file e conferma sulla fonte originale. Non importato.
- [LayersLab, Cults](https://cults3d.com/en/3d-model/gadget/iphone-16-pro-case-layerslab): pagina originale consultata, download a pagamento, autore dichiara di non avere il telefono per verificarne la vestibilità. Escluso.
- Victronix, Printables 1012139: indicizzato come uso privato. Escluso in assenza di licenza commerciale verificata.

## Quote e limiti
Il codice separa le misure nominali Apple dalle scelte di anteprima. Gioco 0,3 mm, parete/dorso 1,5 mm, raccordo circolare 12 mm, apertura camera 40 × 42 mm con centro (-14,52) mm sono **scelte progettuali non validate**. Gli angoli reali Apple non sono semplici archi circolari. Le aperture laterali sono conservative e semplificate; non riproducono quote complete di tasti, speaker o USB-C. Protezione camera e ritenzione non sono validate; il fronte non ha un labbro di aggancio. Nessuna verifica MagSafe, RF, materiali o produzione. Il dorso non stampa sui bordi; la grafica viene tagliata in corrispondenza del foro camera. Nessuna mesh esterna GLB/STL viene spacciata per verificata.

## Licenza
`iphone-16-pro-geometry.js` è codice originale di questo intervento, distribuito sotto MIT (vedi `LICENSE-IPHONE-GEOMETRY.txt`), utilizzabile e modificabile anche commercialmente. La licenza copre solo quel codice, non i disegni Apple, marchi, modelli di terzi o grafiche del catalogo. Non è una verifica legale completa del prodotto.

## Verifica e prossimi passi
Test unitari: dimensioni nominali, bounding box della cover, coordinate finite, raggi che attraversano il foro camera senza incontrare triangoli e dorso presente. Test browser: selezione 16 Pro, grafica, rotazione, zoom, smontaggio tornando a Poster. La suite esistente copre catalogo e T-shirt/felpe.

Prima di estendere: acquisire il file originale di un candidato con testo completo di licenza, autore, versione e hash; confrontare mesh e tavole Apple in mm, con tabella degli scostamenti per profilo, fotocamere, tasti e porte. Verificare fisicamente un campione se destinato a produzione. Poi procedere con 16 e 16 Pro Max, ciascuno con geometria propria e test dedicati, senza scalare semplicemente il 16 Pro. Solo dopo estendere a 15/14/13 e 17.

Comandi riproducibili: `npm test`; `npx playwright test --config=playwright.software.config.js --reporter=line`. La configurazione software aumenta solo timeout e attese, conserva porta, scenari e controlli della suite standard.

Esito finale: 11/11 test unitari e 24/24 test browser passati (suite software, circa 2 minuti). Verificate visivamente le schermate del dorso e dell'interno. Il primo tentativo standard ha incontrato timeout di 5 secondi sul caricamento T-shirt; una prova su porta alternativa non poteva eseguire lo scenario con URL fisso. La suite finale usa la porta standard e attese maggiori, senza saltare test.
