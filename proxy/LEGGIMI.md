# Proxy dati per MotoGP e Superbike

I siti di MotoGP e WorldSBK non permettono ad altri siti di leggere i loro dati dal browser. Per questo oggi Sport LIVE li mostra solo su un PC con l'estensione per Chrome o Edge.

Con questo piccolo proxy gratuito (un *Cloudflare Worker*) MotoGP e Superbike funzionano **su tutti i dispositivi**: telefono, tablet, Smart TV, Safari e Firefox, senza estensione. L'estensione resta utile solo per vedere la Diretta TV dentro il riquadro, da PC.

Ti servono circa 10 minuti, una volta sola.

## Cosa fa (e cosa no)

- Legge **solo** i dati di `api.motogp.pulselive.com` e `api.pulselive.worldsbk.com`, gli stessi che usa l'app.
- Risponde **solo** alle richieste che arrivano dal sito dell'app (`https://matteo-canna.github.io`): altri siti non possono usarlo.
- Tiene i dati 15 secondi in memoria, così i server di MotoGP e WorldSBK ricevono poche richieste.
- Non salva niente e non vede dati personali.
- Il piano gratuito di Cloudflare permette 100.000 richieste al giorno: molto più di quanto serve.

I dati restano di MotoGP e WorldSBK: usa il proxy per uso personale.

## 1. Crea il Worker

1. Crea un account gratuito su <https://dash.cloudflare.com/sign-up> (basta l'email).
2. Nel menu a sinistra apri **Workers & Pages** (in Compute) e premi **Create**, poi **Create Worker**.
3. Come nome scrivi `sport-live-proxy` e premi **Deploy**.
4. Premi **Edit code**. Cancella tutto il codice di esempio e incolla il contenuto del file [`cloudflare-worker.js`](cloudflare-worker.js) di questa cartella.
5. Premi **Deploy** in alto a destra.
6. Copia l'indirizzo del Worker, che ha questa forma:
   `https://sport-live-proxy.TUONOME.workers.dev`

## 2. Collega l'app

1. Apri Sport LIVE e premi **⚙ Impostazioni**.
2. Nella sezione **Proxy dati** incolla l'indirizzo e premi **PROVA E SALVA**.
3. Se compare "✓ Funziona", MotoGP e Superbike sono attivi.

L'indirizzo è salvato solo su quel dispositivo: ripeti il punto 2 su telefono, tablet e TV.
Se vuoi che valga ovunque senza impostarlo, comunica l'indirizzo e verrà messo come predefinito nell'app (costante `SL.DEFAULT_PROXY` in `sport/js/core.js`).

## Se non funziona

- **"Il proxy non risponde (HTTP 403)"**: stai usando l'app da un indirizzo diverso da `https://matteo-canna.github.io`. Aggiungilo in `ALLOWED_ORIGINS`, in cima al codice del Worker, e premi di nuovo Deploy.
- **"HTTP 502"**: in quel momento il server di MotoGP o WorldSBK non risponde. Riprova più tardi.
- In **⚙ Impostazioni → Stato fonti** vedi se MotoGP e Superbike rispondono e se passano dal proxy.
