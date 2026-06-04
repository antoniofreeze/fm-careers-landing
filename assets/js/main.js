/* =========================================================
   FM Service Group — Landing Recruiting · main.js
   Nav mobile · header scroll · reveal · posizioni → form
   · validazione form · tracking conversioni (ready)
   ========================================================= */
(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Anno footer ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header: ombra allo scroll ---------- */
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Nav mobile (hamburger) ---------- */
  const toggle = $('#navToggle');
  const nav = $('#mainNav');
  const closeNav = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri menu');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
  });
  // chiudi al click su una voce
  $$('.nav-link', nav).forEach(a => a.addEventListener('click', closeNav));
  // chiudi cliccando fuori
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
  });

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Posizioni aperte → scroll al form + preset dropdown ---------- */
  const posSelect = $('#posizione');
  const sourceField = $('#formSource');

  $$('.position-card .position-apply').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.position-card');
      const position = card && card.getAttribute('data-position');

      // seleziona la posizione corrispondente nel dropdown, se presente
      if (position && posSelect) {
        const match = $$('option', posSelect).find(o => o.value === position || o.textContent.trim() === position);
        if (match) posSelect.value = match.value || match.textContent.trim();
      }
      if (sourceField && position) sourceField.value = 'posizione:' + position;

      // scroll fluido al form
      const target = $('#candidati');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // focus sul primo campo dopo lo scroll (accessibilità)
      window.setTimeout(() => { const f = $('#nome'); if (f) f.focus({ preventScroll: true }); }, 600);

      track('Lead', { content_name: position, source: 'position_card' });
    });
  });

  /* ---------- Validazione + submit form ---------- */
  const form = $('#applyForm');
  const feedback = $('#formFeedback');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedback.className = 'form-feedback';
      feedback.textContent = '';

      // validazione nativa
      if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
          firstInvalid.focus();
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        feedback.classList.add('error');
        feedback.textContent = 'Controlla i campi obbligatori evidenziati.';
        return;
      }

      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Invio in corso…';

      try {
        // ---------------------------------------------------------------
        // INVIO → submit.php invia la candidatura (CV in allegato) a
        // info@fmservicegroup.it e risponde JSON { ok: true }.
        // FormData include automaticamente tutti i campi + il file CV.
        // (Per FormSubmit/Web3Forms l'attributo action del <form> basta
        //  cambiarlo: il flusso fetch qui sotto resta valido.)
        // ---------------------------------------------------------------
        const data = new FormData(form);
        // FormSubmit (hosting statico) non inoltra allegati via endpoint AJAX:
        // rimuoviamo il CV per evitare errori. Su submit.php il file resta incluso.
        if (/formsubmit\.co/.test(form.action) && data.has('cv')) data.delete('cv');
        const res = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        let ok = res.ok;
        // FormSubmit/Web3Forms e submit.php rispondono JSON: validiamo se possibile
        try {
          const json = await res.clone().json();
          ok = ok && (json.ok === true || json.success === true || json.success === 'true');
        } catch (_) { /* risposta non-JSON: ci basiamo su res.ok */ }
        if (!ok) throw new Error('Invio non riuscito');

        // Conversione tracking (Meta / TikTok / LinkedIn / GTM)
        track('CompleteRegistration', {
          content_name: (posSelect && posSelect.value) || 'Candidatura',
          source: 'apply_form'
        });

        feedback.classList.add('success');
        feedback.textContent = '✅ Candidatura inviata! Ti contatteremo se il profilo è in linea con le ricerche attive.';
        form.reset();
      } catch (err) {
        feedback.classList.add('error');
        feedback.textContent = '⚠️ Si è verificato un errore. Riprova o scrivici a info@fmservicegroup.it';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  /* ---------- Tracking helper (conversion ready) ----------
     Invia l'evento a tutte le piattaforme presenti senza rompere
     nulla se i pixel non sono ancora installati.
  --------------------------------------------------------- */
  function track(event, params) {
    params = params || {};
    try { if (typeof window.fbq === 'function') window.fbq('track', event, params); } catch (e) {}
    try { if (typeof window.ttq === 'object' && window.ttq.track) window.ttq.track(event, params); } catch (e) {}
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: 'fm_' + event }, params));
    } catch (e) {}
    // LinkedIn conversions: window.lintrk && window.lintrk('track', { conversion_id: XXXX });
  }

  // CTA tracking (header / hero / sticky ecc.)
  $$('[data-cta]').forEach(el => {
    el.addEventListener('click', () => track('CTAClick', { source: el.getAttribute('data-cta') }));
  });
})();
