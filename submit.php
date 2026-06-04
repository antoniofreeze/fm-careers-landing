<?php
/* =========================================================================
   FM Service Group — Endpoint candidature
   Riceve il form della landing e invia la candidatura via email (con CV
   in allegato) a info@fmservicegroup.it. Restituisce JSON.

   Funziona su qualsiasi hosting PHP (incluso WordPress) — nessuna libreria
   esterna richiesta: usa mail() con MIME multipart costruito a mano.

   ▸ Configura solo le 3 costanti qui sotto.
   ========================================================================= */

// ----------------------- CONFIGURAZIONE -----------------------
const TO_EMAIL   = 'info@fmservicegroup.it';                 // destinatario candidature
const FROM_EMAIL = 'noreply@fmservicegroup.it';              // mittente (dominio del sito → evita problemi SPF)
const FROM_NAME  = 'Candidature FM Service Group';
const MAX_CV_MB  = 6;                                        // dimensione massima CV
// --------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}
function clean($v) { return trim(str_replace(["\r", "\n"], ' ', (string) $v)); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Metodo non consentito', 405);

// Honeypot anti-spam: se compilato → bot. Rispondiamo ok senza inviare.
if (!empty($_POST['website'])) { echo json_encode(['ok' => true]); exit; }

// ----------------------- VALIDAZIONE --------------------------
$nome      = clean($_POST['nome']      ?? '');
$cognome   = clean($_POST['cognome']   ?? '');
$telefono  = clean($_POST['telefono']  ?? '');
$email     = clean($_POST['email']     ?? '');
$provincia = clean($_POST['provincia'] ?? '');
$posizione = clean($_POST['posizione'] ?? '');

$linkedin     = clean($_POST['linkedin']     ?? '');
$esperienza   = trim($_POST['esperienza']    ?? '');
$disponibilita= clean($_POST['disponibilita']?? '');
$attestati    = clean($_POST['attestati']    ?? '');
$source       = clean($_POST['source']       ?? '');
$privacy      = !empty($_POST['privacy']);

$required = compact('nome', 'cognome', 'telefono', 'email', 'provincia', 'posizione');
foreach ($required as $k => $v) {
    if ($v === '') fail("Campo obbligatorio mancante: $k");
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Email non valida');
if (!$privacy) fail('È necessario accettare l’informativa sulla privacy');

// ----------------------- CV (allegato) ------------------------
$attachment = null;
if (isset($_FILES['cv']) && $_FILES['cv']['error'] === UPLOAD_ERR_OK) {
    $cv = $_FILES['cv'];
    if ($cv['size'] > MAX_CV_MB * 1024 * 1024) fail('Il CV supera i ' . MAX_CV_MB . ' MB');

    $allowedExt = ['pdf', 'doc', 'docx'];
    $ext = strtolower(pathinfo($cv['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) fail('Formato CV non valido (ammessi: PDF, DOC, DOCX)');

    $attachment = [
        'name' => preg_replace('/[^\w.\- ]/', '_', $cv['name']),
        'data' => file_get_contents($cv['tmp_name']),
        'mime' => $cv['type'] ?: 'application/octet-stream',
    ];
} elseif (isset($_FILES['cv']) && $_FILES['cv']['error'] !== UPLOAD_ERR_NO_FILE) {
    fail('Errore nel caricamento del CV');
}

// ----------------------- CORPO EMAIL --------------------------
$rows = [
    'Posizione'              => $posizione,
    'Nome'                   => $nome,
    'Cognome'                => $cognome,
    'Telefono'               => $telefono,
    'Email'                  => $email,
    'Provincia'              => $provincia,
    'Disponibilità'          => $disponibilita ?: '—',
    'Attestati/Certificazioni' => $attestati ?: '—',
    'LinkedIn'               => $linkedin ?: '—',
    'Provenienza (source)'   => $source ?: '—',
];

$htmlRows = '';
foreach ($rows as $label => $val) {
    $htmlRows .= '<tr><td style="padding:8px 14px;border:1px solid #e3e9f2;background:#f6f8fc;font-weight:600;color:#16315f">'
        . htmlspecialchars($label) . '</td><td style="padding:8px 14px;border:1px solid #e3e9f2">'
        . nl2br(htmlspecialchars($val)) . '</td></tr>';
}
$htmlRows .= '<tr><td style="padding:8px 14px;border:1px solid #e3e9f2;background:#f6f8fc;font-weight:600;color:#16315f;vertical-align:top">Esperienza</td>'
    . '<td style="padding:8px 14px;border:1px solid #e3e9f2">' . (nl2br(htmlspecialchars($esperienza)) ?: '—') . '</td></tr>';

$html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#16203a">'
    . '<h2 style="color:#1d3e78;margin:0 0 4px">Nuova candidatura</h2>'
    . '<p style="margin:0 0 16px;color:#5b6883">Ricevuta dalla landing recruiting FM Service Group.</p>'
    . '<table style="border-collapse:collapse;width:100%;max-width:640px;font-size:14px">' . $htmlRows . '</table>'
    . '<p style="margin-top:16px;color:#5b6883;font-size:12px">CV in allegato: ' . ($attachment ? $attachment['name'] : 'non fornito') . '</p>'
    . '</div>';

// ----------------------- MIME / INVIO -------------------------
$subject = "Nuova candidatura — {$posizione} — {$nome} {$cognome}";
$boundary = 'fm_' . bin2hex(random_bytes(8));

$headers  = 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>' . "\r\n";
$headers .= 'Reply-To: ' . $nome . ' ' . $cognome . ' <' . $email . '>' . "\r\n";
$headers .= 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

$body  = '--' . $boundary . "\r\n";
$body .= 'Content-Type: text/html; charset=UTF-8' . "\r\n";
$body .= 'Content-Transfer-Encoding: 8bit' . "\r\n\r\n";
$body .= $html . "\r\n\r\n";

if ($attachment) {
    $body .= '--' . $boundary . "\r\n";
    $body .= 'Content-Type: ' . $attachment['mime'] . '; name="' . $attachment['name'] . '"' . "\r\n";
    $body .= 'Content-Transfer-Encoding: base64' . "\r\n";
    $body .= 'Content-Disposition: attachment; filename="' . $attachment['name'] . '"' . "\r\n\r\n";
    $body .= chunk_split(base64_encode($attachment['data'])) . "\r\n";
}
$body .= '--' . $boundary . '--';

// =UTF-8?B? encode del subject per accenti
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = @mail(TO_EMAIL, $encodedSubject, $body, $headers);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    fail('Invio email non riuscito. Riprova o scrivi a ' . TO_EMAIL, 500);
}
