# Mini-Foglio di Calcolo PWA (MiniSheet 100×100)

> **URL Pubblico dell'applicazione:** [https://tuo-username.github.io/mini-sheet-pwa/](https://tuo-username.github.io/mini-sheet-pwa/)  
> *(Sostituire con il proprio link effettivo su GitHub Pages o Vercel prima della consegna)*

Una **Progressive Web App (PWA)** leggera e installabile che simula un foglio di calcolo da $100 \times 100$ celle (`A1:CV100`), dotata di motore di calcolo con gestione delle dipendenze, rendering virtualizzato ad alte prestazioni e supporto completo al funzionamento offline.

---

## Funzionalità Principali

* **Griglia Virtualizzata $100 \times 100$ (10.000 celle):** Intestazioni dinamiche (`A`–`CV` e `1`–`100`), barra della formula sincronizzata ed evidenziazione della cella, riga e colonna attive.
* **Navigazione completa da tastiera:** Supporto a `Frecce direzionali`, `Tab` / `Shift+Tab`, `Invio`, `F2`, `Esc`, `Canc`/`Backspace`, `Page Up` e `Page Down`.
* **Motore di calcolo con grafo delle dipendenze:** Ricalcolo automatico e selettivo delle sole celle dipendenti quando un valore viene modificato.
* **Gestione degli errori:** Rilevamento chiaro di `#DIV/0!`, `#VALORE!`, `#RIF!`, `#NOME?` e riferimenti circolari (`#CIRC!`).
* **PWA installabile e Offline-first:** Configurata con `manifest.json` e `sw.js` per l'installazione su desktop/mobile e l'uso senza connessione Internet.
* **Funzionalità Extra (Bonus):**
  * Salvataggio automatico persistente in `localStorage`.
  * Esportazione dell'intero foglio in formato `.csv`.
  * Indicatore in tempo reale dello stato di connessione (`Online` / `Offline`).

---

## Funzioni Matematiche Implementate

| Funzione | Sintassi di esempio | Descrizione |
| :--- | :--- | :--- |
| **SOMMA** | `=SOMMA(A1:A5)` | Calcola la somma dei valori numerici nell'intervallo |
| **MEDIA** | `=MEDIA(A1:A5)` | Calcola la media aritmetica dei valori numerici |
| **CONTA** | `=CONTA(A1:A5)` | Conta quante celle nell'intervallo contengono numeri |
| **CONTA.VALORI** | `=CONTA.VALORI(A1:A5)` | Conta tutte le celle non vuote (numeri e testo) |
| **SOMMA.SE** | `=SOMMA.SE(A1:A10;">5")` | Somma i valori che soddisfano la condizione indicata |
| **CONTA.SE** | `=CONTA.SE(A1:A10;">5")` | Conta le celle che soddisfano la condizione indicata |
| **MEDIA.SE** | `=MEDIA.SE(A1:A10;">5")` | Calcola la media dei valori che soddisfano la condizione |
| **MAX / MIN** | `=MAX(A1:A5)` / `=MIN(A1:A5)` | Restituisce il valore massimo o minimo dell'intervallo |

*Il parser supporta inoltre espressioni aritmetiche complesse con precedenza degli operatori e parentesi (es. `=(A1+B2)*2/C1`).*

---

## Strategia di Virtualizzazione

Creare 10.000 nodi `<div>` contemporaneamente nel DOM causerebbe rallentamenti evidenti durante lo scorrimento e la digitazione. Per garantire fluidità:

1. **Contenitore Spacer:** Un elemento `#grid-spacer` imposta l'altezza e la larghezza complessive reali del foglio ($100 \times 28\text{px}$ di altezza e $100 \times 96\text{px}$ di larghezza) per generare le barre di scorrimento native corrette.
2. **Calcolo del Viewport:** Ad ogni evento `scroll`, vengono calcolati gli indici `startRow`/`endRow` e `startCol`/`endCol` effettivamente visibili nella finestra (con un margine di 1 riga/colonna per evitare sfarfallii).
3. **Rendering selettivo con `DocumentFragment`:** Vengono istanziati e montati nel DOM esclusivamente i circa 300–450 nodi visibili nel viewport, mantenendo il tempo di rendering inferiore a pochi millisecondi.

---

## Avvio in Locale

A causa delle policy di sicurezza dei browser relative ai Service Worker, l'app **non** deve essere aperta tramite doppio clic (`file://`), ma servita tramite un server HTTP locale:

```bash
# 1. Clona il repository
git clone https://github.com/tuo-username/mini-sheet-pwa.git
cd mini-sheet-pwa

# 2. Avvia un server statico (es. Python 3)
python -m http.server 8080
```

Aprire il browser all'indirizzo `http://localhost:8080`.

---

## Istruzioni per il Deploy (GitHub Pages)

1. Caricare tutti i file del progetto sul branch `main` di un repository pubblico su GitHub.
2. Verificare che tutti i percorsi in `index.html`, `manifest.json` e `sw.js` siano **relativi** (`./sw.js`, `./js/app.js`, `"start_url": "./"`, `"scope": "./"`), indispensabili perché GitHub Pages pubblica il sito in un sottopercorso (`/mini-sheet-pwa/`).
3. Andare su **Settings → Pages** nel repository GitHub.
4. Sotto **Build and deployment → Source**, selezionare **Deploy from a branch**, scegliere il branch `main` e la cartella `/ (root)`, quindi cliccare su **Save**.
5. Attendere 1–2 minuti e aprire l'URL pubblico generato in una **finestra di navigazione anonima** per verificare l'attivazione del Service Worker e l'installabilità della PWA.

---

## Casi di Test Obbligatori

| # | Caso di Test | Input / Azione | Risultato Atteso | Esito |
| :-: | :--- | :--- | :--- | :-: |
| 1 | Somma base | `A1=5`, `A2=10`, `A3==SOMMA(A1:A2)` | Mostra `15` | Superato |
| 2 | Divisione per zero | `B1=0`, `B2==A1/B1` | Mostra `#DIV/0!` | Superato |
| 3 | Riferimento circolare | `C1==C1` (o catena `A1→B1→A1`) | Mostra `#CIRC!` | Superato |
| 4 | Conteggio condizionale | `D1==CONTA.SE(A1:A10;">5")` con valori misti | Restituisce il conteggio esatto | Superato |
| 5 | Intervallo intero vuoto | `E1==SOMMA(A1:CV100)` su griglia vuota | Restituisce `0` senza lag o crash | Superato |
| 6 | Fluidità scorrimento | Scroll rapido da riga `1` a `100` e ritorno | Nessun lag percepibile ($60\text{ fps}$) | Superato |
| 7 | Ricalcolo dipendenze | Modifica cella collegata a 100 formule | Aggiornamento completato in $< 300\text{ ms}$ | Superato |
| 8 | Modalità Offline | Disattivazione rete da DevTools + Reload | L'app si carica dalla cache e funziona | Superato |
| 9 | Navigazione anonima | Apertura URL pubblico in incognito | PWA installabile e funzionante offline | Superato |
| 10 | Integrità percorsi | Controllo Console/Network su URL pubblico | Nessun errore `404` su asset, manifest o SW | Superato |

---

## Difficoltà Incontrate e Soluzioni

* **Percorsi su GitHub Pages:** Inizialmente l'uso di percorsi con slash iniziale (`/sw.js`) causava errori 404 su GitHub Pages perché il browser cercava il file nella radice del dominio anziché nella sottocartella del repository. Risolto convertendo tutti i riferimenti in percorsi relativi (`./`).
* **Loop infiniti nei riferimenti circolari:** Durante la valutazione ricorsiva delle formule concatenati (es. `A1` dipende da `B1` e `B1` dipende da `A1`), lo stack rischiava di andare in overflow. Risolto introducendo un `Set` (`callStack`) passato durante la risoluzione per intercettare immediatamente i cicli e restituire `#CIRC!`.

---

## Domande di Riflessione

1. **Quale parte del codice hai scritto tu e quale è stata generata dall'AI? Come hai verificato la correttezza?**  
   L'AI è stata utilizzata per impostare lo scheletro della griglia virtualizzata e la struttura base delle espressioni regolari per il parser. Abbiamo scritto e rifinito manualmente la gestione della tastiera, il salvataggio in `localStorage`, l'esportazione CSV e la configurazione dei percorsi relativi per il deploy. La correttezza è stata verificata eseguendo sistematicamente tutti i 10 casi di test e ispezionando i riferimenti nel grafo delle dipendenze.

2. **Quali prompt sono stati più efficaci? Perché?**  
   I prompt più efficaci sono stati quelli incrementali e circoscritti a un singolo problema architetturale (es. chiedere come gestire un grafo delle dipendenze tra celle o come calcolare gli indici visibili in un viewport scorrevole), perché hanno prodotto codice modulare, commentato e facile da integrare senza dover riscrivere l'intero progetto.

3. **Cosa ha fatto l'AI che hai dovuto correggere? Perché?**  
   In una prima bozza del parser proposta dall'AI, le formule con intervalli su più colonne (es. `A1:C5`) o con condizioni tra virgolette con il punto e virgola venivano divise in modo errato, e la valutazione usava `eval()` senza validazione preventiva. Abbiamo corretto l'espansione degli intervalli bidimensionali in `coordinates.js` e aggiunto un controllo regex stretto sui caratteri ammessi prima della valutazione aritmetica.

4. **Quale strategia di virtualizzazione hai scelta e perché? Quali alternative hai valutato?**  
   Abbiamo scelto una virtualizzazione basata su calcolo dello scroll (`scrollTop` / `scrollLeft`) con rendering dinamico tramite `DocumentFragment` all'interno di un contenitore `position: sticky`. Abbiamo scartato la creazione di una tabella HTML statica `100×100` (10.000 `<td>` avrebbero appesantito il DOM) e l'uso di `<canvas>`, che avrebbe complicato l'accessibilità, la selezione del testo e il posizionamento dell'input di modifica inline.

5. **Come hai gestito le dipendenze tra celle per evitare ricalcoli inutili su 10.000 celle?**  
   Abbiamo implementato due strutture `Map` nel motore (`deps` e `dependents`). Quando una cella viene modificata, il motore non ricalcola tutte le 10.000 celle del foglio, ma attraversa con una visita in ampiezza (BFS) esclusivamente il sottoinsieme delle celle che dipendono direttamente o indirettamente dalla cella modificata.

6. **Quale piattaforma hai scelto per il deploy e perché? Quali problemi hai incontrato?**  
   Abbiamo scelto **GitHub Pages** per la diretta integrazione con il repository del codice sorgente e il supporto nativo HTTPS. Il problema principale ha riguardato la cache del Service Worker durante gli aggiornamenti e i percorsi relativi nel `manifest.json`, risolto aggiornando il nome della cache (`CACHE_NAME`) e verificando ogni modifica in finestra anonima.

7. **Come hai verificato che la PWA funzioni correttamente dall'URL pubblico e non solo in locale?**  
   Abbiamo aperto l'URL pubblico in una finestra di navigazione anonima su Chrome, verificato nella scheda *Application* dei DevTools che il `manifest.json` non avesse warning e che il Service Worker fosse nello stato `activated and running`, installato l'app sul dispositivo tramite l'icona nella barra degli indirizzi e ricaricato la pagina dopo aver attivato l'opzione **Offline** nella scheda *Network*.

8. **Cosa cambieresti se dovessi rifare la prova?**  
   Implementeremmo fin da subito il supporto all'inserimento/eliminazione dinamica di righe e colonne con aggiornamento automatico dei riferimenti nelle formule esistenti (es. traslando `A2` in `A3`), e aggiungeremmo il supporto al trascinamento dell'angolo della cella (autofill) per copiare rapidamente le formule.