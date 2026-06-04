# FM Service Group — Landing Recruiting

Landing page recruiting mobile-first per la raccolta candidature, pensata come
destinazione delle campagne **Meta, LinkedIn e TikTok**.

Stack: **HTML + CSS + JS vanilla** (zero dipendenze, zero build). Velocissima,
SEO-ready e facilmente integrabile anche in WordPress.

```
fm-careers-landing/
├── index.html              # pagina completa (header, hero, sezioni, form, FAQ, footer)
├── assets/
│   ├── css/styles.css      # design system + responsive (mobile-first)
│   ├── js/main.js          # nav, scroll, reveal, posizioni→form, validazione, tracking
│   └── img/                # logo + foto reali FM (ottimizzate)
└── README.md
```

## Anteprima locale

```bash
cd fm-careers-landing
python3 -m http.server 4173
# apri http://127.0.0.1:4173
```

---

## 1) Invio candidature → email info@fmservicegroup.it

Il form è **già collegato**: invia la candidatura (con il **CV in allegato**) a
`info@fmservicegroup.it` tramite `submit.php`, mostra il messaggio di conferma e
fa scattare l'evento di conversione. Il flusso è stato testato end-to-end.

### A) Hosting PHP / WordPress (consigliato — funziona subito)
È l'opzione predefinita. Carica tutta la cartella sul sito (es. in
`/lavora-con-noi/`) e verifica le costanti in `submit.php`:

```php
const TO_EMAIL   = 'info@fmservicegroup.it';     // destinatario candidature
const FROM_EMAIL = 'noreply@fmservicegroup.it';  // mittente sul dominio (anti-SPF)
const MAX_CV_MB  = 6;
```

- Nessuna libreria, nessun account, nessun servizio esterno.
- `Reply-To` = email del candidato → rispondi direttamente dalla casella.
- Honeypot anti-spam + validazione lato server (campi obbligatori, email, CV).
- Per deliverability ottimale usa un mittente del dominio; se l'hosting richiede
  SMTP autenticato, sostituisci `mail()` con PHPMailer (stessa logica).

> In WordPress: metti i file in una sottocartella del sito, oppure incolla
> l'HTML in una pagina full-width e tieni `submit.php` allo stesso livello.

### B) Hosting statico senza PHP (Netlify, Vercel, GitHub Pages…)
Cambia **solo** l'attributo `action` del `<form>` in `index.html`. Il resto
(fetch, messaggio di successo, tracking) continua a funzionare.

```html
<!-- FormSubmit: nessuna registrazione, invia a info@fmservicegroup.it -->
<form ... action="https://formsubmit.co/info@fmservicegroup.it">
```
La prima candidatura inviata genera un'email di **attivazione** una tantum
nella casella `info@fmservicegroup.it` (basta cliccare il link). In alternativa
**Web3Forms** (`https://api.web3forms.com/submit` + `access_key`).

> Il campo nascosto `source` traccia da quale posizione/canale arriva la candidatura.

## 2) Tracking conversioni (Meta / TikTok / LinkedIn)

Gli ID pixel vanno inseriti in `index.html` (sezione `TRACKING READY` nell'`<head>`),
basta decommentare e sostituire i placeholder:
`META_PIXEL_ID`, `TIKTOK_PIXEL_ID`, `LINKEDIN_PARTNER_ID`.

Gli eventi di conversione sono **già emessi** da `main.js` verso `fbq`, `ttq` e
`dataLayer` (GTM) senza rompere nulla se i pixel non sono presenti:

| Evento JS               | Quando                                  |
|-------------------------|-----------------------------------------|
| `CTAClick`              | click su un qualsiasi CTA `[data-cta]`  |
| `Lead`                  | click "Candidati per questa posizione"  |
| `CompleteRegistration`  | invio form riuscito                     |

## 3) Integrazione in WordPress

Tre strade, dalla più semplice:
1. **Pagina dedicata full-width**: incolla `index.html` in un blocco *HTML
   personalizzato* (o template di pagina vuoto), e carica `assets/` nel tema /
   media library aggiornando i percorsi.
2. **Template di pagina**: copia `assets/` in `wp-content/themes/<tema>/fm-landing/`
   e crea un `page-lavora-con-noi.php` che include l'HTML.
3. **Plugin form**: sostituisci il `<form>` con uno shortcode (CF7 / Gravity /
   WPForms) mantenendo le stesse label e il dropdown posizioni.

## Immagini

Foto reali del team FM (shooting 23.09.2025), ridimensionate e compresse per il web.
Per sostituirle mantieni gli stessi nomi file in `assets/img/`.

## Note

- Header sticky, scroll fluido, animazioni leggere (rispettano `prefers-reduced-motion`).
- CTA sticky dedicata su mobile.
- SEO: title, meta description, Open Graph e JSON-LD Organization già inclusi.
