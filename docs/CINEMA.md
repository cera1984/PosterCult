# Il cinema navigabile di PosterCult

## Esperienza realizzata

Cinema 3D stilizzato ispirato alle sale italiane degli anni Sessanta e Settanta: porte rosso velluto, ottone, lampade calde, pavimento a scacchi, tappeto centrale, platea e sipario. Ambiente originale costruito con Three.js e texture procedurali; i manifesti provengono dal catalogo esistente. Nessun modello o suono esterno aggiunto.

Il pulsante **Entra nel cinema** apre l'atrio; il parametro URL `?cinema=1` permette di entrarvi direttamente. Il catalogo tradizionale rimane disponibile, senza avviare WebGL prima della richiesta. Le sale corrispondono alle categorie effettive del catalogo (29 al momento della verifica). Le ali mostrano fino a nove porte alla volta; **Altre sale** cambia ala e **Le sale** rende tutte le categorie accessibili tramite un elenco.

## Comandi

- Telefono/iPad: trascinare la scena per guardarsi intorno; trascinare il comando circolare per camminare; toccare una porta o usare l'elenco delle sale.
- Computer: trascinamento con mouse, comando circolare oppure WASD/frecce. Non è richiesto il blocco del puntatore.
- La posizione nell'atrio è limitata dalle pareti e dalle panche. Il cambio di sala è un taglio diretto, senza movimenti automatici della camera.
- In sala: vista dalla platea, locandina originale contenuta sul grande schermo, frecce precedente/successiva e cursore per avvicinarsi. Nessun video o trailer viene riprodotto.
- **Guarda da vicino** apre il poster. **Crea una cover / T-shirt** porta la locandina scelta al banco di stampa.
- Il banco applica una console con manopole funzionali di dimensione e posizione al configuratore 3D esistente. Trascinamento verticale delle manopole, frecce/Home/End da tastiera e cursori originali restano disponibili. Sul telefono l'anteprima resta visibile sopra i controlli durante lo scorrimento.
- Chiuso il banco, si torna alla stessa locandina nella sala; **Torna all'atrio** e **Catalogo** sono sempre disponibili.
- L'audio è spento inizialmente. Attivandolo si sente un sottofondo sintetico discreto generato localmente con Web Audio; viene fermato e rilasciato all'uscita. Non sono voci o registrazioni di un cinema reale.

## Tecnologia e limiti

`cinema.js` carica `cinema-world.js` soltanto all'ingresso. `cinema.css` gestisce HUD, comandi e banco vintage. I modelli di cover e capi e i loro parametri geometrici non sono stati modificati. Il rendering del cinema viene sospeso quando è aperto il configuratore o la pagina non è visibile, per evitare due scene animate contemporaneamente.

Pixel ratio limitato a 1,5; sedute istanziate; nessuna ombra dinamica costosa. La scena è stilizzata e usa un fascio di proiezione trasparente, non un sistema di illuminazione fotorealistico o volumetrico. La fisica è limitata alla navigazione nell'atrio. Prestazioni verificate in Chromium con rendering software e viewport telefono/iPad: non costituiscono un benchmark su dispositivi fisici.

In assenza di WebGL, l'elenco delle sale continua a filtrare il catalogo. Focus, etichette e controlli da tastiera sono disponibili; preferenze di movimento ridotto non comportano voli automatici. I caricamenti superati da una selezione successiva o dalla chiusura non possono rimontare scene o sostituire la locandina corrente. Geometrie, materiali, texture, osservatori e contesto audio vengono rilasciati all'uscita.

## Verifica

Scenari browser dedicati: ingresso e movimento effettivo nell'atrio, click su una porta 3D, cambio locandina, distanza dallo schermo, ritorno all'atrio, banco cover su telefono, banco T-shirt su iPad, manopole con puntatore e tastiera, audio solo su richiesta, chiusura durante il caricamento del modulo, proiezioni tardive e fallback WebGL.

Comandi: `npm test`; `node node_modules/playwright/cli.js test --config=playwright.software.config.js --reporter=line`. Le regressioni del catalogo e dei 15 modelli iPhone restano attive.

Esito: 25 test unitari passati; suite browser completa 37/37, seguita da 8/8 verifiche mirate dopo le rifiniture del cinema, incluso un ulteriore scenario di proiezione mancante (38 scenari browser distinti complessivamente). Revisionate le schermate dell'atrio desktop/telefono, della sala desktop/telefono e del banco su telefono/iPad.
