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
## Rotazione e consigli del proiezionista — 27 ottobre 2026

La stampa delle cover può ruotare da −180° a +180° attorno al proprio centro; traslazione e scala restano indipendenti. La rotazione già disponibile per le T-shirt è accessibile anche dalla quarta manopola del banco cinema. Il pulsante circolare **0** accanto a ciascun asse azzera solo quell’asse del livello selezionato. Il ripristino generale della cover azzera anche la rotazione.

**Consigliami un film** nell’atrio e **Film a sorpresa** in sala sorteggiano un film e ne proiettano una locandina nella sala appropriata. La scheda del proiezionista contiene esattamente tre curiosità senza spoiler, con link alle fonti. Il sorteggio assegna un biglietto a ogni film, indipendentemente dal numero di immagini, ed esclude la ripetizione immediata. La scheda resta disponibile anche senza WebGL.

Copertura editoriale iniziale: dieci film (Shining, Il dottor Stranamore, Full Metal Jacket, Eyes Wide Shut, Lolita, Arancia meccanica, Pulp Fiction, Jackie Brown, Heat, Essi vivono). I restanti titoli sono normalmente sfogliabili nel catalogo; non vengono sorteggiati da questo nuovo comando finché non dispongono di tre note verificate. Il numero è dichiarato nella scheda. Le note sono dati locali in `film-recommendations.js`, senza chiamate ad AI o servizi esterni durante l’uso. Le fonti sono ASC, BFI, AFI e interviste/archivio ufficiale di John Carpenter, consultate il 27 ottobre 2026; nessun testo esteso o immagine esterna riprodotta. I titoli generici o ambigui del catalogo non sono associati automaticamente a film omonimi.

Limiti: la rotazione delle cover mostra il fondo carta quando la grafica non copre l’intera superficie; la stampa è sempre ritagliata dalla geometria della cover. Le trasformazioni delle cover restano temporanee nella sessione del visualizzatore; il salvataggio composizioni esistente delle T-shirt include già la rotazione. I collegamenti alle fonti richiedono internet.

### Verifica rotazione e consigli cinema (27 ottobre 2026)

Passati 27 test unitari (`npm test`) e tutti i 42 scenari browser (`playwright.software.config.js`, Chromium/SwiftShader, 4,2 minuti). I nuovi scenari verificano: modifica dei pixel della stampa con trasformazioni e camera ferma; reset separati X/Y conservando scala e rotazione; ripristino completo cover; quarta manopola del banco T-shirt; proiezione del film sorteggiato, tre note con fonti, nessuna ripetizione immediata, chiusura con Escape, layout telefono e consiglio disponibile senza WebGL. I test unitari verificano inoltre presenza dei dieci film nel catalogo, tre note distinte per titolo e probabilità indipendente dal numero di locandine. La suite completa continua a coprire poster, livelli T-shirt, hoodie, quindici cover, caricamenti concorrenti ed errori di rete/modello. Queste verifiche non sostituiscono una prova su iPad/iPhone fisici.

## Oggetti cinema e platea dettagliata — 27 ottobre 2026

Integrati sette GLB auto-ospitati del kit CC0 di 3D Assets (circa 879 KiB complessivi): proiettore a pellicola, piedistallo, poltrona, pannello sipario, bobina, macchina per popcorn e banco ristoro. La fonte dichiara l’uso di AI (GPT-6): modelli stilizzati, non scansioni storiche. Fonti individuali, dimensioni e hash sono in `assets/cinema/manifest.json`; crediti pubblici raggiungibili dalla testata del cinema in `docs/cinema-models.html`.

Nel foyer il comando **Il proiettore** avvicina il punto di vista al nuovo oggetto e diventa **Esplora l’atrio** per tornare alla vista iniziale. Il bar e il proiettore sono fuori dal percorso centrale e hanno aree di collisione. I colori sono adattati a smalto verde, ottone, bordeaux e legno scuro. Le bobine incorporate nel proiettore sono statiche; una bobina separata sul banco gira lentamente e si arresta con movimento ridotto. Nessuna simulazione meccanica della pellicola.

Le 64 poltrone usano cinque InstancedMesh, con geometria condivisa e attributi quantizzati espansi prima di applicare le trasformazioni: 3.596 triangoli per poltrona, circa 230.000 triangoli complessivi per la platea. Il sipario usa otto pannelli e si apre in 1,4 secondi soltanto dopo il caricamento della locandina; con movimento ridotto si apre subito. La navigazione delle locandine successive non ripete l’apertura. I componenti procedurali restano visibili se i modelli non si caricano. Caricamenti arrivati dopo un cambio scena o una chiusura non vengono montati.

Rispetto alla selezione iniziale, i tre file Sketchfab non sono stati integrati perché il download ufficiale richiede un’autenticazione separata (401); non sono stati estratti file dal visualizzatore protetto. L’alternativa CC0 è documentata nella pagina dei crediti. Nessuna richiesta al CDN del produttore avviene durante l’uso del sito.

Verifica: 29 test unitari passati, inclusa validazione Khronos dei sette GLB, hash, budget complessivo inferiore a 1 MB e dimensioni effettive della poltrona dopo conversione della geometria quantizzata. Passati tutti i 45 scenari browser della suite completa (Chromium/SwiftShader, circa 5,1 minuti). I tre scenari dedicati coprono proiettore e ripristino vista, 64 sedute, apertura sipario, modelli mancanti, chiusura durante un download e movimento ridotto. Dopo i ritocchi finali, rieseguiti e superati i tre scenari dedicati anche con limiti inferiori a 150 draw call e 400.000 triangoli per la sala nel viewport mobile. Non sono misure di FPS su dispositivi fisici: prestazioni Safari/iPad restano da verificare su hardware reale.
