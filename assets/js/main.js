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

  /* ---------- Deep-link da campagne ads: ?pos=... &utm_* ----------
     Esempio: /?pos=Tecnico%20Installatore#candidati
     Preseleziona la posizione nel form e traccia la provenienza. */
  (function applyDeepLink() {
    if (!posSelect) return;
    var params = new URLSearchParams(window.location.search);
    var pos = params.get('pos');
    if (pos) {
      var match = $$('option', posSelect).find(function (o) {
        return o.value === pos || o.textContent.trim() === pos;
      });
      if (match) posSelect.value = match.value || match.textContent.trim();
      if (sourceField) {
        var src = 'ad:' + pos;
        var utm = params.get('utm_source') || params.get('utm_campaign');
        if (utm) src += '|' + utm;
        sourceField.value = src;
      }
    }
  })();

  /* ---------- Validazione + submit form ---------- */
  const form = $('#applyForm');
  const feedback = $('#formFeedback');

  if (form) {
    form.addEventListener('submit', (e) => {
      feedback.className = 'form-feedback';
      feedback.textContent = '';

      // validazione nativa: se non valido, blocca l'invio e segnala
      if (!form.checkValidity()) {
        e.preventDefault();
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
          firstInvalid.focus();
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        feedback.classList.add('error');
        feedback.textContent = 'Controlla i campi obbligatori evidenziati.';
        return;
      }

      // Valido → emette la conversione, poi lascia partire l'INVIO NATIVO del form:
      // multipart con il CV in allegato verso FormSubmit, che reindirizza a grazie.html.
      // (Su hosting PHP/WordPress con action=submit.php il flusso nativo resta identico.)
      track('CompleteRegistration', {
        content_name: (posSelect && posSelect.value) || 'Candidatura',
        source: 'apply_form'
      });

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Invio in corso…';
      // NON chiamiamo preventDefault: il browser invia il form (con il file) e naviga
      // verso FormSubmit → grazie.html. (Riabilita il pulsante se la navigazione non parte.)
      window.setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Invia candidatura';
      }, 6000);
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
    // LinkedIn: fa scattare la conversione se è stato configurato un conversion_id per l'evento
    try {
      var lk = (window.FM_TRACKING && window.FM_TRACKING.linkedinConversions) || {};
      if (typeof window.lintrk === 'function' && lk[event]) {
        window.lintrk('track', { conversion_id: lk[event] });
      }
    } catch (e) {}
  }

  // CTA tracking (header / hero / sticky ecc.)
  $$('[data-cta]').forEach(el => {
    el.addEventListener('click', () => track('CTAClick', { source: el.getAttribute('data-cta') }));
  });
})();
