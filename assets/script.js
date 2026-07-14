// Trenta Querce — demo interactions
//
// FORM_ENDPOINT: per l'invio reale (senza client di posta) creare un form gratuito
// su https://formspree.io con l'email dell'azienda e incollare qui l'URL, es.
// 'https://formspree.io/f/abcdwxyz'. Se vuoto, il sito ripiega su mailto:.
var FORM_ENDPOINT = '';

(function () {
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  // wine modals + email mini-shop
  document.querySelectorAll('[data-modal]').forEach(function (card) {
    function open() {
      var dlg = document.getElementById(card.dataset.modal);
      if (dlg) dlg.showModal();
    }
    card.addEventListener('click', open);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  document.querySelectorAll('dialog.wine-modal').forEach(function (dlg) {
    var close = dlg.querySelector('.modal-close');
    if (close) close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
  });

  // wine enquiry cart: collect several wines, send one email
  var isEN = (document.documentElement.lang || 'it') === 'en';
  var L = isEN ? {
    added: 'Added ✓',
    bottles: 'bottles',
    send: 'Send enquiry',
    empty: 'Clear',
    title: 'Your wine enquiry',
    subject: 'Purchase enquiry — Trenta Querce wines',
    bodyIntro: 'Hello,\nI would like to receive prices, availability and shipping costs for:\n',
    bodyLine: '- {qty} bottles of {wine}\n',
    bodyOutro: '\nThank you!',
    sending: 'Sending…',
    sent: 'Enquiry sent ✓ We will reply by email.',
    sendError: 'Something went wrong — opening your email app instead.',
    bookingSubject: 'Availability enquiry — Trenta Querce',
    bookingSent: 'Thank you! Your enquiry has been sent — we will reply by email.',
    bookingSending: 'Sending…'
  } : {
    added: 'Aggiunto ✓',
    bottles: 'bottiglie',
    send: 'Invia richiesta',
    empty: 'Svuota',
    title: 'La tua richiesta',
    subject: 'Richiesta acquisto — vini Trenta Querce',
    bodyIntro: 'Buongiorno,\nvorrei ricevere prezzi, disponibilità e costi di spedizione per:\n',
    bodyLine: '- {qty} bottiglie di {wine}\n',
    bodyOutro: '\nGrazie!',
    sending: 'Invio…',
    sent: 'Richiesta inviata ✓ Vi risponderemo via email.',
    sendError: 'Qualcosa è andato storto — apriamo il tuo programma di posta.',
    bookingSubject: 'Richiesta disponibilità — Trenta Querce',
    bookingSent: 'Grazie! La richiesta è stata inviata — vi risponderemo via email.',
    bookingSending: 'Invio…'
  };

  // Real send via form endpoint when configured; returns false to signal
  // the caller to fall back to mailto:.
  function sendEnquiry(payload, onDone) {
    if (!FORM_ENDPOINT || !window.fetch) return false;
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { onDone(r.ok); }).catch(function () { onDone(false); });
    return true;
  }

  function mailtoFallback(subject, body) {
    window.location.href = 'mailto:info@trentaquerce.it' +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  var cart = [];
  try { cart = JSON.parse(sessionStorage.getItem('tq-cart') || '[]'); } catch (e) {}

  var bar = document.createElement('div');
  bar.className = 'cart-bar';
  bar.hidden = true;
  document.body.appendChild(bar);

  function saveCart() {
    try { sessionStorage.setItem('tq-cart', JSON.stringify(cart)); } catch (e) {}
  }

  function renderCart() {
    if (!cart.length) { bar.hidden = true; return; }
    var total = cart.reduce(function (n, it) { return n + it.qty; }, 0);
    var rows = cart.map(function (it, i) {
      return '<div class="cart-row"><span>' + it.qty + '× ' + it.wine + '</span>' +
             '<button class="cart-remove" data-i="' + i + '" aria-label="&times;">&times;</button></div>';
    }).join('');
    bar.innerHTML =
      '<p class="cart-title">' + L.title + '</p>' + rows +
      '<div class="cart-actions">' +
        '<button class="cart-clear">' + L.empty + '</button>' +
        '<button class="btn btn-primary cart-send">' + L.send + ' (' + total + ' ' + L.bottles + ')</button>' +
      '</div>';
    bar.hidden = false;

    bar.querySelectorAll('.cart-remove').forEach(function (b) {
      b.addEventListener('click', function () {
        cart.splice(parseInt(b.dataset.i, 10), 1);
        saveCart(); renderCart();
      });
    });
    bar.querySelector('.cart-clear').addEventListener('click', function () {
      cart = []; saveCart(); renderCart();
    });
    bar.querySelector('.cart-send').addEventListener('click', function () {
      var sendBtn = bar.querySelector('.cart-send');
      var body = L.bodyIntro;
      cart.forEach(function (it) {
        body += L.bodyLine.replace('{qty}', it.qty).replace('{wine}', it.wine);
      });
      body += L.bodyOutro;

      var started = sendEnquiry({
        _subject: L.subject,
        type: 'wine-order',
        wines: cart.map(function (it) { return it.qty + 'x ' + it.wine; }).join('; '),
        message: body
      }, function (ok) {
        if (ok) {
          cart = []; saveCart();
          bar.innerHTML = '<p class="cart-title">' + L.sent + '</p>';
          setTimeout(function () { renderCart(); }, 3500);
        } else {
          sendBtn.disabled = false;
          sendBtn.textContent = L.sendError;
          setTimeout(function () { mailtoFallback(L.subject, body); renderCart(); }, 1200);
        }
      });

      if (started) {
        sendBtn.disabled = true;
        sendBtn.textContent = L.sending;
      } else {
        mailtoFallback(L.subject, body);
      }
    });
  }

  document.querySelectorAll('.add-order').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = btn.closest('dialog');
      var qtyInput = dlg ? dlg.querySelector('input[type="number"]') : null;
      var qty = Math.max(1, parseInt(qtyInput && qtyInput.value ? qtyInput.value : '6', 10) || 1);
      var wine = btn.dataset.wine || '';
      var existing = cart.find(function (it) { return it.wine === wine; });
      if (existing) { existing.qty = qty; } else { cart.push({ wine: wine, qty: qty }); }
      saveCart(); renderCart();
      var original = btn.textContent;
      btn.textContent = L.added;
      setTimeout(function () {
        btn.textContent = original;
        if (dlg) dlg.close();
      }, 650);
    });
  });

  renderCart();

  // booking / availability form
  var form = document.querySelector('.form-card form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form-note');
      var submitBtn = form.querySelector('button[type="submit"]');
      var inputs = form.querySelectorAll('input, textarea');
      var fields = {};
      inputs.forEach(function (el) {
        var label = form.querySelector('label[for="' + el.id + '"]');
        fields[label ? label.textContent : el.id] = el.value;
      });

      var body = Object.keys(fields).map(function (k) {
        return k + ': ' + fields[k];
      }).join('\n');

      var started = sendEnquiry({
        _subject: L.bookingSubject,
        type: 'booking',
        _replyto: (form.querySelector('input[type="email"]') || {}).value || '',
        fields: fields,
        message: body
      }, function (ok) {
        submitBtn.disabled = false;
        if (ok) {
          form.reset();
          if (note) { note.textContent = L.bookingSent; note.style.fontWeight = '700'; }
        } else {
          if (note) note.textContent = L.sendError;
          setTimeout(function () { mailtoFallback(L.bookingSubject, body); }, 1200);
        }
      });

      if (started) {
        submitBtn.disabled = true;
        if (note) note.textContent = L.bookingSending;
      } else {
        mailtoFallback(L.bookingSubject, body);
      }
    });
  }
})();
