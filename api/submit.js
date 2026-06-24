// =====================================================================
// FM Service Group — endpoint candidature (Vercel serverless function)
// Riceve il form (multipart, con CV) e invia una email in ITALIANO
// con il curriculum IN ALLEGATO, tramite Resend.
//
// Variabili d'ambiente (impostare su Vercel → Settings → Environment Variables):
//   RESEND_API_KEY   (obbligatoria)  → la API key di Resend (re_...)
//   TO_EMAIL         (opzionale)     → destinatario; default: agenzia Gmail
//   CC_EMAIL         (opzionale)     → copia (richiede dominio verificato su Resend)
//   FROM_EMAIL       (opzionale)     → mittente; default onboarding@resend.dev (test)
// =====================================================================
const { Resend } = require('resend');
const { formidable } = require('formidable');
const fs = require('fs');

const TO_EMAIL   = process.env.TO_EMAIL   || 'info@fmservicegroup.it';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Candidature FM Service Group <candidature@fmservicegroup-recruiting.it>';
const CC_EMAIL   = process.env.CC_EMAIL   || 'antoniobaccaro.freeze@gmail.com'; // copia all'agenzia
const MAX_CV_MB  = 8;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Metodo non consentito');
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    res.status(500).send('Configurazione mancante: RESEND_API_KEY non impostata su Vercel.');
    return;
  }

  // --- parsing multipart (campi + file) ---
  let fields = {}, files = {};
  try {
    const form = formidable({ maxFileSize: MAX_CV_MB * 1024 * 1024, keepExtensions: true, multiples: false });
    [fields, files] = await form.parse(req);
  } catch (e) {
    res.status(400).send('Errore nei dati inviati (file troppo grande? max ' + MAX_CV_MB + 'MB).');
    return;
  }

  const val = (k) => {
    const v = fields[k];
    return Array.isArray(v) ? v[0] : (v || '');
  };

  // honeypot anti-spam
  if (val('_honey')) { res.writeHead(303, { Location: '/grazie.html' }); res.end(); return; }

  // --- allegato CV ---
  const attachments = [];
  let cv = files['Curriculum'];
  cv = Array.isArray(cv) ? cv[0] : cv;
  if (cv && cv.filepath) {
    try {
      const content = fs.readFileSync(cv.filepath);
      attachments.push({
        filename: (cv.originalFilename || 'curriculum').replace(/[^\w.\- ]/g, '_'),
        content
      });
    } catch (_) { /* se la lettura fallisce, invio comunque i dati */ }
  }

  // --- corpo email (italiano) ---
  const rows = [
    ['Posizione di interesse', val('Posizione di interesse')],
    ['Nome', val('Nome')],
    ['Cognome', val('Cognome')],
    ['Telefono', val('Telefono')],
    ['Email', val('Email')],
    ['Provincia', val('Provincia')],
    ['Disponibilità', val('Disponibilità') || '—'],
    ['Attestati / Certificazioni', val('Attestati / Certificazioni') || '—'],
    ['LinkedIn', val('LinkedIn') || '—'],
    ['Provenienza', val('Provenienza') || '—']
  ];
  let body = rows.map(([k, v]) =>
    `<tr><td style="padding:8px 14px;border:1px solid #e3e9f2;background:#f6f8fc;font-weight:600;color:#16315f">${esc(k)}</td>` +
    `<td style="padding:8px 14px;border:1px solid #e3e9f2">${esc(v)}</td></tr>`).join('');
  body += `<tr><td style="padding:8px 14px;border:1px solid #e3e9f2;background:#f6f8fc;font-weight:600;color:#16315f;vertical-align:top">Esperienza precedente</td>` +
          `<td style="padding:8px 14px;border:1px solid #e3e9f2">${esc(val('Esperienza precedente')) || '—'}</td></tr>`;

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#16203a">' +
    '<h2 style="color:#1d3e78;margin:0 0 4px">Nuova candidatura</h2>' +
    '<p style="margin:0 0 16px;color:#5b6883">Ricevuta dalla landing recruiting FM Service Group.</p>' +
    '<table style="border-collapse:collapse;width:100%;max-width:640px;font-size:14px">' + body + '</table>' +
    '<p style="margin-top:16px;color:#5b6883;font-size:12px">Curriculum in allegato: ' +
    (attachments.length ? esc(attachments[0].filename) : 'non fornito') + '</p></div>';

  // --- invio via Resend ---
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const payload = {
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: `Nuova candidatura — ${val('Posizione di interesse') || 'FM'} — ${val('Nome')} ${val('Cognome')}`,
      html,
      attachments
    };
    if (val('Email')) payload.replyTo = val('Email');
    if (CC_EMAIL) payload.cc = CC_EMAIL.split(',').map(s => s.trim()).filter(Boolean);

    const { error } = await resend.emails.send(payload);
    if (error) {
      res.status(502).send('Invio non riuscito: ' + (error.message || JSON.stringify(error)));
      return;
    }
  } catch (e) {
    res.status(502).send('Invio non riuscito: ' + (e && e.message ? e.message : 'errore Resend'));
    return;
  }

  // successo → pagina di ringraziamento
  res.writeHead(303, { Location: '/grazie.html' });
  res.end();
};
