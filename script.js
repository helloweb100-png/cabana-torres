/* =========================================================
   Cabaña Torres · Valle del Potrero — script.js
   «Un día en el Valle: 9:00 → 19:00»
   Sin librerías. Todo está envuelto en safe(): si un módulo falla,
   el resto sigue y el contenido nunca queda oculto.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Única constante de WhatsApp (formato 52 + 10 dígitos) ---------- */
  const WHATSAPP_NUMBER = "527224126728";

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) root.classList.add('rm');
  const ANC = !RM;                                   // modo anclado (escenas con scroll)
  const FINE = matchMedia('(pointer: fine)').matches;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = n => String(n).padStart(2, '0');
  const safe = fn => { try { fn(); } catch (e) { console.warn('[cabaña]', e); } };

  /* =========================================================
     WhatsApp
     ========================================================= */
  const waURL = texto => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  function abrirWhatsApp(texto) {
    if (!WHATSAPP_NUMBER) return;
    window.open(waURL(texto), '_blank', 'noopener');
  }
  function setWA(el) {
    if (!WHATSAPP_NUMBER || el.tagName !== 'A') return;
    el.href = waURL(el.dataset.wa);
    el.target = '_blank';
    el.rel = 'noopener';
  }
  function initWA() {
    if (!WHATSAPP_NUMBER) {
      root.classList.add('sin-wa');
      const nota = $('#form-nota');
      if (nota) nota.hidden = false;
      return;
    }
    $$('[data-wa]').forEach(setWA);
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-wa]');
      if (!el) return;
      e.preventDefault();
      abrirWhatsApp(el.dataset.wa);
    });
    const flot = $('#wa-flot');
    if (flot) setTimeout(() => flot.classList.add('abierto'), 4000);
    if (flot) setTimeout(() => flot.classList.remove('abierto'), 9000);
  }

  /* =========================================================
     Cargador (máx. ~1.6 s antes de salir; respaldo CSS a los 2.5 s)
     ========================================================= */
  function initCargador() {
    const c = $('#cargador');
    if (!c) return;
    if (RM) { root.classList.add('hero-on'); return; }
    const pct = $('#carga-pct');
    const t0 = performance.now();
    const DUR = 1400;
    let hecho = false;

    const salir = () => {
      if (hecho) return;
      hecho = true;
      if (pct) pct.textContent = '09:00 → 100 %';
      c.classList.add('sale');
      setTimeout(() => root.classList.add('hero-on'), 450);
      setTimeout(() => c.classList.add('fuera'), 1000);
    };
    const paso = t => {
      const k = clamp((t - t0) / DUR);
      if (pct && !hecho) pct.textContent = `09:00 · ${Math.round(k * 100)} %`;
      if (k < 1 && !hecho) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);

    const cargada = new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
    const minimo = new Promise(r => setTimeout(r, 1450));
    Promise.all([cargada, minimo]).then(salir);
    setTimeout(salir, 1600);          // tope duro
    setTimeout(() => root.classList.add('hero-on'), 3200);   // respaldo del hero
  }

  /* =========================================================
     Guirnalda de papel picado (hero)
     ========================================================= */
  let guirnaldaMovil = null;
  function construirGuirnalda() {
    const g = $('#guirnalda');
    if (!g) return;
    const mob = innerWidth < 700;
    if (guirnaldaMovil === mob) return;
    guirnaldaMovil = mob;
    $$('.ban', g).forEach(b => b.remove());
    const colores = ['#E94E77', '#F5B400', '#2FA84F', '#2F6FDE', '#8E44AD', '#F07F1A', '#C8302F'];
    const cuerdas = [
      { n: mob ? 4 : 7, y0: 4, k: 40, desfase: 0 },
      { n: mob ? 4 : 7, y0: 12, k: 34, desfase: 1 }
    ];
    let c = 0;
    cuerdas.forEach(cd => {
      for (let i = 0; i < cd.n; i++) {
        const t = cd.desfase ? (i + 1) / (cd.n + 1) : (i + .5) / cd.n;
        const y = cd.y0 + cd.k * t * (1 - t);
        const b = document.createElement('div');
        b.className = 'ban';
        b.style.left = (t * 100).toFixed(2) + '%';
        b.style.top = (y / 30 * 100).toFixed(2) + '%';
        b.style.setProperty('--c', colores[c++ % colores.length]);
        b.style.setProperty('--dur', (3.2 + Math.random() * 1.4).toFixed(2) + 's');
        b.style.setProperty('--del', (-Math.random() * 4).toFixed(2) + 's');
        b.appendChild(document.createElement('i'));
        g.appendChild(b);
      }
    });
  }

  /* =========================================================
     Motor de progreso (corazón de la página)
     ========================================================= */
  const scrubs = [];
  const hooks = {};
  function registrarScrubs() {
    $$('[data-scrub]').forEach(el => scrubs.push({ el, modo: el.dataset.scrub || 'pin', p: -1 }));
  }
  function calcularP(s, r, vh) {
    let p;
    if (s.modo === 'flow') p = (vh - r.top) / (vh + r.height);
    else if (s.modo === 'out') p = -r.top / Math.max(1, r.height);
    else {
      const d = r.height - vh;
      p = d > 40 ? -r.top / d : (vh - r.top) / (vh + r.height);
    }
    return clamp(p);
  }
  function actualizarScrubs() {
    const vh = innerHeight;
    for (const s of scrubs) {
      const r = s.el.getBoundingClientRect();
      const p = calcularP(s, r, vh);
      if (Math.abs(p - s.p) > .0004 || s.p < 0) {
        s.p = p;
        s.el.style.setProperty('--p', p.toFixed(4));
        const h = hooks[s.el.id];
        if (h) h(p, s.el);
      }
    }
  }

  /* ---------- Progreso global, reloj del Valle, header ---------- */
  let ppAnt = -1, lastY = scrollY, vel = 0, raf = 0;
  let cab, progEl, hudEl, hudHora, velEls = [], navLinks = [], secsSpy = [];
  let menuAbierto = false;

  function momento(pp) { return pp < .2 ? 'amanecer' : pp < .5 ? 'mediodia' : pp < .8 ? 'tarde' : 'atardecer'; }
  function progresoPagina(y) {
    const max = root.scrollHeight - innerHeight;
    const pp = max > 0 ? clamp(y / max) : 0;
    if (Math.abs(pp - ppAnt) < .0005) return;
    ppAnt = pp;
    const v = pp.toFixed(4);
    if (progEl) progEl.style.setProperty('--pp', v);
    if (hudEl) hudEl.style.setProperty('--pp', v);
    const h = 9 + pp * 10;
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    if (hudHora) hudHora.textContent = `${pad(hh)}:${pad(mm)}`;
    const m = momento(pp);
    if (document.body.dataset.momento !== m) document.body.dataset.momento = m;
  }
  function cabecera(y, dy) {
    if (!cab) return;
    cab.classList.toggle('vidrio', y > 80);
    if (menuAbierto) return;
    if (dy > 6 && y > 240) cab.classList.add('oculto');
    else if (dy < -6 || y < 240) cab.classList.remove('oculto');
  }
  function scrollSpy() {
    const vh = innerHeight;
    let activo = null;
    for (const s of secsSpy) {
      const r = s.el.getBoundingClientRect();
      if (r.top <= vh * .4 && r.bottom > vh * .4) activo = s.id;
    }
    navLinks.forEach(a => a.classList.toggle('act', a.getAttribute('href') === '#' + activo));
  }
  function escribirVel() {
    const v = vel.toFixed(3);
    velEls.forEach(el => el.style.setProperty('--v', v));
  }

  function tick() {
    raf = 0;
    const y = scrollY;
    const dy = y - lastY;
    lastY = y;
    vel = lerp(vel, clamp(dy * .35, -12, 12), .2);
    actualizarScrubs();
    progresoPagina(y);
    cabecera(y, dy);
    scrollSpy();
    revelarGeo();
    if (!RM) {
      if (Math.abs(vel) > .02) { escribirVel(); pedir(); }
      else if (vel !== 0) { vel = 0; escribirVel(); }
    }
  }
  function pedir() { if (!raf) raf = requestAnimationFrame(tick); }

  /* =========================================================
     Revelados con respaldo por geometría
     ========================================================= */
  const revelables = new Set();
  let ioRev = null;
  function revelar(el) {
    el.classList.add('in');
    revelables.delete(el);
    if (ioRev) ioRev.unobserve(el);
  }
  function revelarGeo() {
    if (!revelables.size) return;
    const vh = innerHeight, vw = innerWidth;
    revelables.forEach(el => {
      const r = el.getBoundingClientRect();
      if ((r.width || r.height) && r.top < vh * .96 && r.bottom > 0 && r.left < vw * .98 && r.right > 0) revelar(el);
    });
  }
  function initReveal() {
    $$('.reveal, .card').forEach(el => revelables.add(el));
    if ('IntersectionObserver' in window) {
      ioRev = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) revelar(e.target); }),
        { threshold: .12, rootMargin: '0px 0px -6% 0px' });
      revelables.forEach(el => ioRev.observe(el));
    }
    if (RM) revelables.forEach(el => el.classList.add('in'));
    setTimeout(revelarGeo, 2000);
    setTimeout(revelarGeo, 4500);
  }

  /* =========================================================
     S2 · Manifiesto: palabra por palabra + contadores
     ========================================================= */
  let contado = false;
  function dividirPalabras(p) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
            else {
              const s = document.createElement('span');
              s.className = 'w';
              s.style.setProperty('--i', i++);
              s.textContent = tok;
              frag.appendChild(s);
            }
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(p);
    p.style.setProperty('--n', i);
    $$('mark', p).forEach(m => {
      const f = $('.w', m);
      m.dataset.i = f ? f.style.getPropertyValue('--i') : 0;
    });
    return i;
  }
  function contar() {
    if (contado) return;
    contado = true;
    $$('[data-count]').forEach(el => {
      const fin = +el.dataset.count, ini = +(el.dataset.from || 0);
      const pre = el.dataset.pre || '', suf = el.dataset.suf || '';
      const t0 = performance.now(), dur = 1600;
      const paso = t => {
        const k = clamp((t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + Math.round(lerp(ini, fin, e)) + suf;
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  }
  function initManifiesto() {
    const p = $('#manif-txt');
    if (!p || RM) return;
    const n = dividirPalabras(p);
    const marks = $$('mark', p);
    $$('[data-count]').forEach(el => {
      el.dataset.final = el.textContent;
      el.textContent = (el.dataset.pre || '') + (el.dataset.from || 0) + (el.dataset.suf || '');
    });
    setTimeout(() => { if (!contado && scrubs.find(s => s.el.id === 'valle' && s.p > .3)) contar(); }, 3000);
    hooks.valle = pr => {
      marks.forEach(m => m.classList.toggle('on', pr * 1.25 * n - (+m.dataset.i) >= 3));
      if (pr > .4) contar();
    };
  }

  /* =========================================================
     S3 · Un día en el Valle (reloj)
     ========================================================= */
  function construirDial() {
    const g = $('#dial-marcas');
    if (!g) return;
    const pt = (r, a) => { const t = a * Math.PI / 180; return [200 + r * Math.sin(t), 200 - r * Math.cos(t)]; };
    let h = '';
    for (let i = 0; i <= 10; i++) {
      const a = -135 + i * 27, mayor = i % 2 === 0;
      const [x1, y1] = pt(mayor ? 146 : 151, a), [x2, y2] = pt(mayor ? 171 : 166, a), [lx, ly] = pt(184, a);
      h += `<line class="tk${mayor ? ' tk-m' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      h += `<text class="lab" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${9 + i}</text>`;
    }
    for (let s = 0; s < 6; s++) {
      const [x, y] = pt(158, -135 + s * 54);
      h += `<circle class="est" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>`;
    }
    g.innerHTML = h;
  }
  function initDia() {
    const escenas = $$('.esc');
    if (!escenas.length) return;
    construirDial();
    if (!ANC) return;
    const dots = $$('#dots li');
    const est = $$('.est');
    const nombres = escenas.map(e => $('h3', e).textContent);
    const elHora = $('#dial-hora'), elEst = $('#dial-est');
    let idx = -1, ult = '';
    hooks.dia = p => {
      const i = Math.round(clamp(p * 5, 0, 5));
      if (i !== idx) {
        idx = i;
        escenas.forEach((e, j) => {
          e.classList.toggle('act', j === i);
          if (j === i) e.removeAttribute('inert'); else e.setAttribute('inert', '');
        });
        dots.forEach((d, j) => d.classList.toggle('on', j === i));
        est.forEach((c, j) => { c.classList.toggle('on', j === i); c.classList.toggle('pas', j < i); });
        if (elEst) elEst.textContent = nombres[i];
      }
      const h = 9 + p * 10, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      const t = `${pad(hh)}:${pad(mm)}`;
      if (t !== ult && elHora) { elHora.textContent = t; ult = t; }
    };
  }

  /* =========================================================
     S4 · La mesa (pestañas y filas)
     ========================================================= */
  function initMesa() {
    const tabs = $$('.tab'), list = $('#tabs');
    if (tabs.length) {
      const sel = i => {
        tabs.forEach((t, j) => {
          const on = i === j;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          const pn = document.getElementById(t.getAttribute('aria-controls'));
          if (pn) {
            pn.hidden = !on;
            if (on) $$('.reveal:not(.in)', pn).forEach((f, k) => setTimeout(() => revelar(f), 80 * k + 40));
          }
        });
        if (list) list.style.setProperty('--i', i);
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => sel(i));
        t.addEventListener('keydown', e => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            sel(j); tabs[j].focus(); e.preventDefault();
          }
        });
      });
    }
    $$('.fila').forEach(f => {
      $$('.ing li', f).forEach((li, k) => li.style.setProperty('--k', k));
      const b = $('button.fila-t', f);
      if (b) b.addEventListener('click', () => {
        const abierta = f.classList.toggle('abierta');
        b.setAttribute('aria-expanded', abierta ? 'true' : 'false');
      });
    });
  }

  /* =========================================================
     S6 · Aventura (carrusel anclado + selector de gotcha)
     ========================================================= */
  function medirAventura() {
    const sec = $('#aventura'), pista = $('#pista');
    if (!sec || !pista) return;
    const s = scrubs.find(x => x.el === sec);
    const horizontal = ANC && innerWidth >= 900;
    if (horizontal) {
      sec.style.height = '';
      pista.style.transform = 'none';
      const rec = Math.max(0, pista.scrollWidth - innerWidth);
      pista.style.transform = '';
      sec.style.setProperty('--recorrido', rec + 'px');
      sec.style.height = (innerHeight + rec) + 'px';
      if (s) s.modo = 'pin';
    } else {
      sec.style.height = '';
      sec.style.removeProperty('--recorrido');
      if (s) s.modo = 'flow';
    }
    const c = scrubs.find(x => x.el.id === 'cartas');
    if (c) c.modo = (ANC && innerWidth >= 900) ? 'pin' : 'flow';
    pedir();
  }
  function initAventura() {
    const pista = $('#pista'), barra = $('.av-barra');
    if (pista && barra) {
      pista.addEventListener('scroll', () => {
        const max = pista.scrollWidth - pista.clientWidth;
        barra.style.setProperty('--sp', max > 0 ? (pista.scrollLeft / max).toFixed(3) : 0);
      }, { passive: true });
    }
    const seg = $('#seg-gotcha');
    if (!seg) return;
    const btns = $$('button', seg), rod = $('#rod-in'), sr = $('#gotcha-sr'), cta = $('#cta-gotcha');
    const small = rod ? $('.card-precio small', rod.closest('.card')) : null;
    const sel = k => {
      btns.forEach((b, i) => { b.setAttribute('aria-checked', i === k ? 'true' : 'false'); b.tabIndex = i === k ? 0 : -1; });
      seg.style.setProperty('--k', k);
      if (rod) rod.style.setProperty('--k', k);
      const { precio, caps } = btns[k].dataset;
      if (sr) sr.textContent = `$${precio} con ${caps} cápsulas`;
      if (small) small.textContent = `con ${caps} cápsulas`;
      if (cta) { cta.dataset.wa = `Hola, quiero jugar gotcha en Cabaña Torres con ${caps} cápsulas ($${precio}). ¿Me ayudan?`; setWA(cta); }
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => sel(i));
      b.addEventListener('keydown', e => {
        if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
          const d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
          const j = (i + d + btns.length) % btns.length;
          sel(j); btns[j].focus(); e.preventDefault();
        }
      });
    });
    sel(0);
  }

  /* =========================================================
     S7 · Fiestas (chips + confeti)
     ========================================================= */
  const cfC = $('#confeti');
  let cfx = null, piezas = [], cfRaf = 0;
  const CF_COLORES = ['#E94E77', '#F5B400', '#2FA84F', '#2F6FDE', '#8E44AD', '#F07F1A', '#C8302F'];
  function confeti(x, y) {
    if (RM || !cfC) return;
    if (!cfx) cfx = cfC.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cfC.width = Math.round(innerWidth * dpr);
    cfC.height = Math.round(innerHeight * dpr);
    cfx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < 90; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.15;
      const v = 6 + Math.random() * 9;
      piezas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 9 + Math.random() * 8, h: 11 + Math.random() * 9, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, c: CF_COLORES[(Math.random() * CF_COLORES.length) | 0], life: 0 });
    }
    if (!cfRaf) cfRaf = requestAnimationFrame(cfLoop);
  }
  function cfLoop() {
    cfx.clearRect(0, 0, innerWidth, innerHeight);
    piezas = piezas.filter(p => p.y < innerHeight + 40 && p.life < 260);
    for (const p of piezas) {
      p.vy += .28; p.vx *= .99; p.vy *= .992;
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      cfx.save();
      cfx.translate(p.x, p.y); cfx.rotate(p.r);
      cfx.globalAlpha = p.life > 200 ? (260 - p.life) / 60 : 1;
      cfx.fillStyle = p.c;
      cfx.beginPath();
      cfx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
      cfx.moveTo(0, -p.h * .28); cfx.lineTo(p.w * .22, 0); cfx.lineTo(0, p.h * .28); cfx.lineTo(-p.w * .22, 0); cfx.closePath();
      cfx.fill('evenodd');
      cfx.restore();
    }
    if (piezas.length) cfRaf = requestAnimationFrame(cfLoop);
    else { cfRaf = 0; cfx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  let eventoSel = '';
  function initFiestas() {
    const TXT = {
      'Cumpleaños': 'Mesa larga, comida caliente y pasto para que los niños corran. Tú solo soplas las velitas.',
      'Bodas': 'Una celebración con montañas de fondo y la cocina de la casa para tus invitados.',
      'Revelación de género': 'El momento más esperado, con el bosque como telón.',
      'Fin de año': 'Cierra el año en el Valle: comida, convivencia y aire de montaña.',
      'Otro evento': 'Cuéntanos qué celebras y armamos el paquete contigo.'
    };
    const chips = $$('#ev-chips .chip'), txt = $('#ev-txt'), sel = $('#f-tipo');
    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(o => o.setAttribute('aria-pressed', o === ch ? 'true' : 'false'));
      eventoSel = ch.dataset.ev;
      if (txt) txt.textContent = TXT[eventoSel] || '';
      if (sel) sel.value = 'Fiesta o evento';
      const r = ch.getBoundingClientRect();
      confeti(r.left + r.width / 2, r.top + r.height / 2);
    }));
    const cta = $('#cta-fiesta');
    if (cta) cta.addEventListener('click', () => { if (sel) sel.value = 'Fiesta o evento'; });
  }

  /* =========================================================
     S8 · La foto que se abre
     ========================================================= */
  let videoCargado = false;
  function cargarVideo() {
    if (videoCargado) return;
    videoCargado = true;
    const v = $('#vista-video');
    if (!v || RM || (navigator.connection && navigator.connection.saveData)) return;
    v.addEventListener('loadeddata', () => {
      if (v.videoWidth > v.videoHeight) { v.classList.add('ok'); v.play().catch(() => {}); }
    }, { once: true });
    v.load();
  }
  function initVista() {
    const sec = $('#vista');
    if (!sec) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { cargarVideo(); o.disconnect(); } }, { rootMargin: '600px 0px' }).observe(sec);
    }
    if (!ANC) return;
    hooks.vista = (p, el) => {
      const e = 1 - Math.pow(1 - clamp(p * 1.6), 3);
      el.style.setProperty('--e', e.toFixed(4));
    };
  }

  /* =========================================================
     S9 · Galería + lightbox
     ========================================================= */
  function initGaleria() {
    const botones = $$('.tile-btn');
    const dlg = $('#lightbox');
    if (!botones.length || !dlg) return;
    const img = $('#lb-img'), cont = $('#lb-cont');
    const n = botones.length;
    let idx = 0, ultFoco = null;
    const mostrar = i => {
      idx = (i + n) % n;
      const src = $('img', botones[idx]);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cont.textContent = `${pad(idx + 1)}/${pad(n)}`;
      [1, -1].forEach(d => { const o = $('img', botones[(idx + d + n) % n]); const pre = new Image(); pre.src = o.currentSrc || o.src; });
    };
    const abrir = i => {
      ultFoco = document.activeElement;
      mostrar(i);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    };
    const cerrar = () => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
    botones.forEach((b, i) => b.addEventListener('click', () => abrir(i)));
    $('#lb-prev').addEventListener('click', () => mostrar(idx - 1));
    $('#lb-next').addEventListener('click', () => mostrar(idx + 1));
    $('#lb-x').addEventListener('click', cerrar);
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') mostrar(idx + 1);
      else if (e.key === 'ArrowLeft') mostrar(idx - 1);
      else if (e.key === 'Escape') cerrar();
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) cerrar(); });
    dlg.addEventListener('close', () => { if (ultFoco && ultFoco.focus) ultFoco.focus(); });
    let x0 = null;
    dlg.addEventListener('pointerdown', e => { x0 = e.clientX; });
    dlg.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) mostrar(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* =========================================================
     S12 · Formulario, chips rápidos y moneda
     ========================================================= */
  function initFormulario() {
    const form = $('#form');
    if (!form) return;
    const ok = $('#form-ok'), tipo = $('#f-tipo'), fecha = $('#f-fecha');
    if (fecha) {
      const h = new Date();
      fecha.min = `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(h.getDate())}`;
    }
    const mapa = { comer: 0, aventura: 1, fiesta: 2 };
    const rapidos = $$('.rapidos .chip');
    rapidos.forEach(ch => ch.addEventListener('click', () => {
      if (tipo) tipo.selectedIndex = mapa[ch.dataset.pre];
      rapidos.forEach(o => o.classList.toggle('on', o === ch));
    }));
    if (tipo) tipo.addEventListener('change', () => rapidos.forEach(o => o.classList.toggle('on', mapa[o.dataset.pre] === tipo.selectedIndex)));
    const nombre = $('#f-nombre');
    if (nombre) nombre.addEventListener('input', () => nombre.classList.remove('err'));

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!WHATSAPP_NUMBER) return;
      const n = nombre.value.trim();
      if (!n) {
        nombre.classList.add('err');
        nombre.focus();
        ok.textContent = 'Cuéntanos tu nombre para armar tu mensaje.';
        return;
      }
      const personas = parseInt($('#f-personas').value, 10);
      let fechaTxt = '';
      if (fecha.value) {
        const [y, m, d] = fecha.value.split('-').map(Number);
        fechaTxt = new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      let msg = `Hola, soy ${n}. Me interesa: ${tipo.value}.`;
      if (personas > 0) msg += ` Somos ${personas} ${personas === 1 ? 'persona' : 'personas'}.`;
      msg += fechaTxt ? ` Fecha tentativa: ${fechaTxt}.` : ' Fecha tentativa: por definir.';
      if (eventoSel && tipo.value === 'Fiesta o evento') msg += ` Tipo de evento: ${eventoSel}.`;
      const extra = $('#f-msg').value.trim();
      if (extra) msg += ` ${extra}`;
      abrirWhatsApp(msg);
      ok.textContent = '¡Listo! Abrimos WhatsApp con tu mensaje. Si no se abrió, toca el botón otra vez.';
    });
  }

  /* =========================================================
     Interacciones de puntero (solo mouse): tilt, magnético, cursor
     ========================================================= */
  function initPuntero() {
    if (!FINE || RM) return;
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    const mw = $('.moneda-w'), mt = $('#moneda-tilt');
    if (mw && mt) {
      mw.addEventListener('pointermove', e => {
        const r = mw.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        mt.style.setProperty('--ry', (x * 30).toFixed(1) + 'deg');
        mt.style.setProperty('--rx', (-y * 24).toFixed(1) + 'deg');
      });
      mw.addEventListener('pointerleave', () => { mt.style.setProperty('--rx', '0deg'); mt.style.setProperty('--ry', '0deg'); });
    }
    $$('.btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * .18, dy = (e.clientY - (r.top + r.height / 2)) * .28;
        b.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
    // parallax del hero
    const hero = $('#inicio');
    if (hero) {
      let mx = 0, my = 0, pend = false;
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - .5) * 2;
        my = ((e.clientY - r.top) / r.height - .5) * 2;
        if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; hero.style.setProperty('--mx', mx.toFixed(3)); hero.style.setProperty('--my', my.toFixed(3)); }); }
      });
    }
    // cursor-puntada
    const c = $('#cursor');
    if (c) {
      const lab = $('span', c);
      let x = 0, y = 0, tx = 0, ty = 0, vivo = false, loop = 0;
      const mover = () => {
        x = lerp(x, tx, .22); y = lerp(y, ty, .22);
        c.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        loop = (Math.abs(tx - x) > .2 || Math.abs(ty - y) > .2) ? requestAnimationFrame(mover) : 0;
      };
      addEventListener('pointermove', e => {
        tx = e.clientX; ty = e.clientY;
        if (!vivo) { vivo = true; x = tx; y = ty; c.classList.add('on'); }
        const t = e.target.closest ? e.target.closest('[data-cursor],a,button,summary,input,select,textarea,label,[role="tab"]') : null;
        const ver = !!(t && t.dataset && t.dataset.cursor);
        c.classList.toggle('ver', ver);
        c.classList.toggle('grande', !!t && !ver);
        if (ver) lab.textContent = t.dataset.cursor;
        if (!loop) loop = requestAnimationFrame(mover);
      }, { passive: true });
      root.addEventListener('mouseleave', () => { c.classList.remove('on'); vivo = false; });
    }
  }

  /* =========================================================
     Header, menú móvil, anclas
     ========================================================= */
  function initCabecera() {
    cab = $('#cab');
    const burger = $('#burger'), menu = $('#menu-m');
    if (burger && menu) {
      const set = abierto => {
        menuAbierto = abierto;
        menu.classList.toggle('abierto', abierto);
        menu.inert = !abierto;
        burger.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        burger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        root.classList.toggle('menu-abierto', abierto);
        if (abierto && cab) cab.classList.remove('oculto');
      };
      burger.addEventListener('click', () => set(!menuAbierto));
      $$('a', menu).forEach(a => a.addEventListener('click', () => set(false)));
      addEventListener('keydown', e => { if (e.key === 'Escape' && menuAbierto) { set(false); burger.focus(); } });
      addEventListener('resize', () => { if (innerWidth >= 900 && menuAbierto) set(false); });
    }
    navLinks = $$('.nav a');
    secsSpy = ['dia', 'mesa', 'aventura', 'fiestas', 'ubicacion'].map(id => ({ id, el: document.getElementById(id) })).filter(s => s.el);
    const volver = $('#volver');
    if (volver) volver.addEventListener('click', () => scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }));
  }

  /* =========================================================
     Horario en vivo (hora de México)
     ========================================================= */
  function initHorario() {
    const arco = $('#hc-arco'), hora = $('#hc-hora');
    if (!arco || !hora) return;
    const fmt = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: 'numeric', minute: 'numeric', hour12: false });
    const act = () => {
      const parts = fmt.formatToParts(new Date());
      const h = (+parts.find(p => p.type === 'hour').value) % 24;
      const m = +parts.find(p => p.type === 'minute').value;
      const frac = clamp((h + m / 60 - 9) / 10);
      arco.setAttribute('stroke-dashoffset', (100 - frac * 100).toFixed(1));
      hora.textContent = `${h}:${pad(m)}`;
    };
    act();
    setInterval(act, 60000);
  }

  /* =========================================================
     Partículas (luciérnagas / estrellas)
     ========================================================= */
  function Particulas(canvas, { desktop = 70, movil = 30, modo = 'luci' } = {}) {
    if (!canvas || RM) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const S = 32;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = S;
    const sc = sprite.getContext('2d');
    const gr = sc.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,246,176,1)');
    gr.addColorStop(.25, 'rgba(244,210,31,.8)');
    gr.addColorStop(1, 'rgba(244,210,31,0)');
    sc.fillStyle = gr; sc.fillRect(0, 0, S, S);

    let w = 0, h = 0, ps = [], visible = false, raf = 0, t = 0;
    const mouse = { x: -999, y: -999 };

    function crear() {
      const n = innerWidth < 700 ? movil : desktop;
      ps = [];
      for (let i = 0; i < n; i++) {
        ps.push({
          x0: Math.random() * w, y: Math.random() * h,
          r: modo === 'estrellas' ? .6 + Math.random() * 1.8 : 1 + Math.random() * 2,
          sp: .12 + Math.random() * .45, amp: 8 + Math.random() * 26,
          fr: .4 + Math.random() * .8, ph: Math.random() * 6.28, tw: .8 + Math.random() * 1.8, ox: 0, oy: 0
        });
      }
    }
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      crear();
    }
    function frame() {
      raf = 0;
      if (!visible || document.hidden) return;
      t += .016;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        if (modo === 'luci') { p.y -= p.sp; if (p.y < -10) { p.y = h + 10; p.x0 = Math.random() * w; } }
        else { p.y -= p.sp * .12; if (p.y < -10) p.y = h + 10; }
        const x = p.x0 + Math.sin(t * p.fr + p.ph) * (modo === 'estrellas' ? p.amp * .25 : p.amp);
        const dx = x + p.ox - mouse.x, dy = p.y + p.oy - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 12100) { const d = Math.sqrt(d2) || 1, f = (110 - d) / 110; p.ox += dx / d * f * 3; p.oy += dy / d * f * 3; }
        p.ox *= .94; p.oy *= .94;
        ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * p.tw + p.ph));
        const s = p.r * 6;
        ctx.drawImage(sprite, x + p.ox - s / 2, p.y + p.oy - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    const arrancar = () => { if (visible && !document.hidden && !raf) raf = requestAnimationFrame(frame); };
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; arrancar(); }).observe(canvas);
    else { visible = true; }
    document.addEventListener('visibilitychange', arrancar);
    addEventListener('pointermove', e => {
      if (!visible) return;
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    resize();
    arrancar();
  }

  /* =========================================================
     Arranque
     ========================================================= */
  function init() {
    cab = $('#cab'); progEl = $('#progreso'); hudEl = $('#hud'); hudHora = $('#hud-hora');
    velEls = [$('#guirnalda'), $('#cintas')].filter(Boolean);

    safe(initCargador);
    safe(initWA);
    safe(initCabecera);
    safe(construirGuirnalda);
    safe(registrarScrubs);
    safe(initManifiesto);
    safe(initDia);
    safe(initVista);
    safe(initMesa);
    safe(initAventura);
    safe(initFiestas);
    safe(initGaleria);
    safe(initFormulario);
    safe(initHorario);
    safe(initPuntero);
    safe(initReveal);
    safe(() => Particulas($('#luci-hero'), { desktop: 70, movil: 30, modo: 'luci' }));
    safe(() => Particulas($('#luci-fin'), { desktop: 110, movil: 50, modo: 'estrellas' }));
    safe(medirAventura);

    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', () => { safe(construirGuirnalda); safe(medirAventura); pedir(); });
    addEventListener('load', () => { safe(medirAventura); pedir(); setTimeout(() => { safe(medirAventura); pedir(); }, 600); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { safe(medirAventura); pedir(); });

    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
