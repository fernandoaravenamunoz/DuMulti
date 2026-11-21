// =====================================================
// Audio de DuMulti
//  - Efectos generados con Web Audio API (sin archivos), POSICIONALES:
//    el volumen baja con la distancia y el sonido se ubica a la izquierda/derecha.
//  - Música: los 4 MP3 de Pixabay en assets/musica/. Si falta algún archivo,
//    suena una pista synthwave generada (heredada de Worodorox 3073) para que
//    el juego nunca quede mudo.
//  - Volumen de música y de efectos por separado, y silencio (tecla M).
//    Las preferencias quedan guardadas en localStorage.
// Las pistas solo se reproducen dentro del juego: no hay opción de descargarlas.
//
// (El motor de efectos y el secuenciador son los de audio/synth.js de Worodorox.)
// =====================================================
(function () {
  'use strict';
  const C = DM.config;

  // ---------- Preferencias ----------
  const prefs = { musica: 0.6, efectos: 0.8, silencio: false };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(C.CLAVE_PREFS + '_audio') || '{}')); } catch (err) { /* nada */ }
  function guardar() { try { localStorage.setItem(C.CLAVE_PREFS + '_audio', JSON.stringify(prefs)); } catch (err) { /* nada */ } }

  let ctx = null, maestro = null, busMusica = null, busSfx = null, eco = null, ruido = null;
  const oyente = { x: 0, y: 0, ang: 0, piso: 0 };

  // ---------- Música de archivos ----------
  const ARCHIVOS = { menu: 'monume', coop: 'kulakovka', final: 'atlasaudio', versus: 'alex-morgan' };
  const RESPALDO = { menu: 'titulo', coop: 'z1', final: 'jefe', versus: 'z2' };
  const pistasMp3 = {};           // nombre → HTMLAudioElement (o false si no existe)
  let actual = null, nombreActual = null;

  function volMusica() { return prefs.silencio ? 0 : prefs.musica; }
  function cargarMp3(nombre) {
    if (pistasMp3[nombre] !== undefined) return pistasMp3[nombre];
    const a = new Audio();
    a.src = 'assets/musica/' + ARCHIVOS[nombre] + '.mp3';
    a.loop = true; a.preload = 'auto';
    a.addEventListener('error', function () { pistasMp3[nombre] = false; if (nombreActual === nombre) musica(nombre, true); });
    a.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    pistasMp3[nombre] = a;
    return a;
  }
  function musica(nombre, forzar) {
    if (nombre === nombreActual && !forzar) return;
    nombreActual = nombre;
    if (actual) { try { actual.pause(); } catch (err) { /* nada */ } actual = null; }
    synthMusica(null);
    if (!nombre || !ctx) return;
    const a = cargarMp3(nombre);
    if (a) {
      a.volume = volMusica(); a.currentTime = 0;
      const pr = a.play();
      if (pr && pr.catch) pr.catch(function () { /* el navegador puede bloquear hasta que haya un clic */ });
      actual = a;
    } else synthMusica(RESPALDO[nombre]);
  }

  // ---------- Inicio (debe ocurrir dentro de un clic o toque) ----------
  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); if (actual && actual.paused) actual.play().catch(function () {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    maestro = ctx.createGain(); maestro.gain.value = 0.9;
    maestro.connect(comp); comp.connect(ctx.destination);
    busMusica = ctx.createGain(); busMusica.connect(maestro);
    busSfx = ctx.createGain(); busSfx.connect(maestro);
    aplicarVolumen();
    eco = ctx.createDelay(1.0);
    const fb = ctx.createGain(); fb.gain.value = 0.35;
    const fe = ctx.createBiquadFilter(); fe.type = 'lowpass'; fe.frequency.value = 2400;
    eco.connect(fe); fe.connect(fb); fb.connect(eco);
    const se = ctx.createGain(); se.gain.value = 0.5; fe.connect(se); se.connect(busMusica);
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(programar, 25);
    if (nombreActual) musica(nombreActual, true);
  }
  function aplicarVolumen() {
    if (busMusica) busMusica.gain.value = volMusica() * 0.75;
    if (busSfx) busSfx.gain.value = prefs.silencio ? 0 : prefs.efectos;
    if (actual) actual.volume = volMusica();
  }

  // ---------- Instrumentos (Worodorox) ----------
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function osc(tipo, f, t, dur, vol, destino, filtro) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    let ult = o;
    if (filtro) {
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass';
      fl.frequency.setValueAtTime(filtro[0], t); fl.frequency.exponentialRampToValueAtTime(filtro[1], t + dur);
      fl.Q.value = 6; o.connect(fl); ult = fl;
    }
    ult.connect(g); g.connect(destino || busMusica);
    env(g, t, 0.005, vol, dur);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function golpeRuido(t, dur, vol, tipoFiltro, frec, destino) {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipoFiltro; f.frequency.value = frec;
    const g = ctx.createGain();
    s.connect(f); f.connect(g); g.connect(destino || busMusica);
    env(g, t, 0.002, vol, dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function barrido(tipo, f0, f1, dur, vol, t, destino) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    o.connect(g); g.connect(destino);
    env(g, t, 0.004, vol, dur);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- Música synthwave de respaldo (secuenciador de Worodorox) ----------
  const MENOR = { i: [0, 3, 7], VI: [8, 12, 15], III: [3, 7, 10], VII: [10, 14, 17], bII: [1, 5, 8] };
  const PISTAS = {
    titulo: { bpm: 88, raiz: 45, acordes: [MENOR.i, MENOR.VI, MENOR.III, MENOR.VII], bajo: 'lento', bombo: [0, 8], caja: [], hat: [], arp: 'lento', pad: 0.12 },
    z1: { bpm: 104, raiz: 45, acordes: [MENOR.i, MENOR.VI, MENOR.III, MENOR.VII], bajo: 'octavas', bombo: [0, 8, 10], caja: [4, 12], hat: [2, 6, 10, 14], arp: 'sube', pad: 0.08 },
    z2: { bpm: 118, raiz: 40, acordes: [MENOR.i, MENOR.i, MENOR.VII, MENOR.VI], bajo: 'galope', bombo: [0, 4, 8, 12], caja: [4, 12], hat: [2, 6, 10, 14, 15], arp: 'pulso', pad: 0.05 },
    jefe: { bpm: 132, raiz: 36, acordes: [MENOR.i, MENOR.bII, MENOR.i, MENOR.VII], bajo: 'galope', bombo: [0, 3, 4, 8, 11, 12], caja: [4, 12], hat: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], arp: 'rapido', pad: 0.07 }
  };
  let pista = null, paso = 0, compas = 0, siguiente = 0;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function synthMusica(nombre) { pista = nombre ? PISTAS[nombre] : null; if (ctx) { paso = 0; compas = 0; siguiente = ctx.currentTime + 0.1; } }
  function programar() {
    if (!ctx || !pista) return;
    const d16 = 60 / pista.bpm / 4;
    while (siguiente < ctx.currentTime + 0.12) { tocarPaso(siguiente, d16); siguiente += d16; paso = (paso + 1) % 16; if (paso === 0) compas++; }
  }
  function tocarPaso(t, d16) {
    const p = pista, acorde = p.acordes[compas % p.acordes.length], r = p.raiz;
    if (paso === 0 && p.pad) for (const n of acorde) osc('sawtooth', mtof(r + 24 + n), t, d16 * 15, p.pad / 3, busMusica, [1100, 900]);
    let nb = null;
    if (p.bajo === 'octavas') nb = paso % 2 === 0 ? (paso % 4 === 2 ? 12 : 0) : null;
    else if (p.bajo === 'galope') nb = [0, null, 0, 0, 12, null, 0, 0, 0, null, 0, 0, 12, null, 7, 0][paso];
    else if (p.bajo === 'lento') nb = paso === 0 || paso === 8 ? 0 : null;
    if (nb !== null) osc('sawtooth', mtof(r + acorde[0] + nb), t, p.bajo === 'lento' ? d16 * 7 : d16 * 1.6, 0.32, busMusica, [1400, 180]);
    let toca = false, nota = 0;
    if (p.arp === 'sube') { toca = paso % 2 === 0; nota = acorde[(paso / 2) % 3] + 24 + (paso >= 8 ? 12 : 0); }
    else if (p.arp === 'rapido') { toca = true; nota = acorde[paso % 3] + 24 + (Math.floor(paso / 3) % 2) * 12; }
    else if (p.arp === 'pulso') { toca = paso % 2 === 1; nota = acorde[0] + 24 + (paso % 4 === 3 ? 12 : 0); }
    else if (p.arp === 'lento') { toca = paso % 4 === 0; nota = acorde[(paso / 4) % 3] + 36; }
    if (toca) { const o = osc('square', mtof(r + nota), t, d16 * 0.9, 0.07, busMusica); const en = ctx.createGain(); en.gain.value = 0.6; o.connect(en); en.connect(eco); eco.delayTime.setValueAtTime(d16 * 3, t); }
    if (p.bombo.indexOf(paso) >= 0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); o.connect(g); g.connect(busMusica); env(g, t, 0.002, 0.9, 0.22); o.start(t); o.stop(t + 0.3); }
    if (p.caja.indexOf(paso) >= 0) { golpeRuido(t, 0.16, 0.35, 'bandpass', 1800); osc('triangle', 190, t, 0.08, 0.2); }
    if (p.hat.indexOf(paso) >= 0) golpeRuido(t, 0.04, 0.12, 'highpass', 7500);
  }

  // ---------- Efectos ----------
  // pos (opcional): { piso, x, y } para sonido posicional
  function sfx(nombre, pos, vol) {
    if (!ctx || prefs.silencio) return;
    let v = vol === undefined ? 1 : vol, pan = 0;
    if (pos && pos.x !== undefined) {
      const dx = pos.x - oyente.x, dy = pos.y - oyente.y, d = Math.hypot(dx, dy);
      v *= Math.max(0, 1 - d / 16) * (pos.piso !== undefined && pos.piso !== oyente.piso ? 0.45 : 1);
      if (d > 0.3) { let a = Math.atan2(dy, dx) - oyente.ang; pan = Math.sin(Math.atan2(Math.sin(a), Math.cos(a))); }
    }
    if (v <= 0.02) return;
    let destino = busSfx;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan * 0.8; p.connect(busSfx); destino = p; }
    const t = ctx.currentTime;
    const B = function (tipo, f0, f1, dur, vv) { barrido(tipo, f0, f1, dur, vv * v, t, destino); };
    const N = function (dur, vv, tipo, f) { golpeRuido(t, dur, vv * v, tipo, f, destino); };
    const O = function (tipo, f, dt, dur, vv) { osc(tipo, f, t + dt, dur, vv * v, destino); };
    switch (nombre) {
      case 'golpe': N(0.12, 0.35, 'bandpass', 600); B('triangle', 160, 60, 0.1, 0.3); break;
      case 'golpeMetal': N(0.3, 0.4, 'lowpass', 400); O('triangle', 90, 0, 0.3, 0.3); O('square', 720, 0, 0.12, 0.06); break;
      case 'corte': N(0.08, 0.3, 'highpass', 3000); B('sawtooth', 2000, 900, 0.06, 0.08); break;
      case 'chispazo': N(0.2, 0.3, 'highpass', 2500); B('square', 1400, 200, 0.18, 0.1); break;
      case 'lanzar': B('triangle', 900, 300, 0.12, 0.18); break;
      case 'soplo': N(0.15, 0.25, 'bandpass', 1500); B('sine', 600, 1200, 0.08, 0.1); break;
      case 'clavo': N(0.05, 0.3, 'highpass', 2000); O('square', 1600, 0, 0.03, 0.1); break;
      case 'escopeta': N(0.4, 0.6, 'lowpass', 1600); B('sawtooth', 300, 40, 0.3, 0.35); break;
      case 'ballesta': B('triangle', 220, 1100, 0.08, 0.2); N(0.1, 0.2, 'bandpass', 900); break;
      case 'soplete': N(0.14, 0.18, 'bandpass', 500); break;
      case 'rociador': N(0.14, 0.15, 'highpass', 4000); break;
      case 'laser': B('sawtooth', 1800, 200, 0.35, 0.3); B('square', 900, 100, 0.35, 0.15); break;
      case 'canon': B('sawtooth', 500, 60, 0.4, 0.35); N(0.3, 0.3, 'lowpass', 700); break;
      case 'desintegrador': B('sawtooth', 80, 2400, 0.6, 0.4); N(1.0, 0.5, 'lowpass', 1200); break;
      case 'carga': B('sine', 200, 1400, 1.0, 0.12); break;
      case 'cargaDron': B('square', 400, 1600, 0.9, 0.06); break;
      case 'disparoGuardian': B('sawtooth', 160, 50, 0.5, 0.3); break;
      case 'recarga': O('square', 400, 0, 0.04, 0.1); O('square', 300, 0.12, 0.04, 0.1); break;
      case 'recargado': O('square', 700, 0, 0.05, 0.12); break;
      case 'cambioArma': N(0.06, 0.2, 'bandpass', 2200); O('triangle', 500, 0.04, 0.05, 0.1); break;
      case 'recoger': [660, 880, 1320].forEach(function (f, i) { O('square', f, i * 0.05, 0.1, 0.12); }); break;
      case 'premio': [523, 659, 784, 1046, 1318].forEach(function (f, i) { O('square', f, i * 0.07, 0.18, 0.12); }); break;
      case 'puerta': N(0.5, 0.25, 'lowpass', 500); B('sawtooth', 80, 160, 0.45, 0.12); break;
      case 'paso': N(0.05, 0.1, 'bandpass', 250 + Math.random() * 120); break;
      case 'pasoCharco': N(0.09, 0.12, 'bandpass', 900); break;
      case 'gemido': B('sawtooth', 140 + Math.random() * 40, 90, 0.8, 0.12); B('sine', 220, 150, 0.8, 0.08); break;
      case 'zumbido': O('sawtooth', 110, 0, 0.5, 0.06); O('sawtooth', 114, 0, 0.5, 0.06); break;
      case 'explosion': N(0.9, 0.8, 'lowpass', 900); B('sine', 120, 30, 0.7, 0.6); break;
      case 'herido': B('square', 300, 60, 0.22, 0.25); N(0.12, 0.25, 'lowpass', 900); break;
      case 'muerte': B('sawtooth', 440, 40, 1.2, 0.3); break;
      case 'mordisco': N(0.1, 0.3, 'bandpass', 400); B('square', 200, 80, 0.1, 0.15); break;
      case 'mina': O('square', 1800, 0, 0.05, 0.12); break;
      case 'rebote': O('triangle', 700 + Math.random() * 300, 0, 0.05, 0.12); break;
      case 'siseo': N(0.8, 0.15, 'highpass', 4000); break;
      case 'hidraulica': B('sawtooth', 70, 140, 0.6, 0.15); break;
      case 'aviso': O('square', 880, 0, 0.1, 0.1); O('square', 660, 0.12, 0.1, 0.1); break;
      case 'anuncio': O('sine', 1046, 0, 0.15, 0.15); O('sine', 1568, 0.08, 0.2, 0.12); break;
      case 'oleada': [196, 247, 294, 392].forEach(function (f, i) { O('sawtooth', f, i * 0.12, 0.3, 0.12); }); break;
      case 'victoria': [523, 659, 784, 1046, 1318, 1568].forEach(function (f, i) { O('square', f, i * 0.1, 0.25, 0.12); }); break;
      case 'derrota': [392, 330, 262, 196].forEach(function (f, i) { O('sawtooth', f, i * 0.2, 0.4, 0.14); }); break;
      case 'revivir': [392, 523, 659, 784].forEach(function (f, i) { O('sine', f, i * 0.08, 0.25, 0.14); }); break;
      case 'interruptor': O('square', 600, 0, 0.05, 0.12); O('square', 900, 0.06, 0.06, 0.12); break;
      case 'emp': B('sine', 2000, 60, 0.7, 0.3); N(0.4, 0.2, 'highpass', 3000); break;
      case 'bloqueo': O('triangle', 1800, 0, 0.25, 0.2); O('triangle', 2400, 0, 0.2, 0.1); break;
      case 'zap': N(0.15, 0.3, 'highpass', 2500); O('square', 1200, 0, 0.08, 0.1); break;
      case 'clic': O('square', 1200, 0, 0.03, 0.08); break;
      case 'leer': O('sine', 880, 0, 0.08, 0.1); O('sine', 1320, 0.07, 0.1, 0.08); break;
    }
  }

  DM.Audio = {
    iniciar: iniciar, musica: musica, sfx: sfx, oyente: oyente,
    alternar: function () { prefs.silencio = !prefs.silencio; aplicarVolumen(); guardar(); return !prefs.silencio; },
    fijarVolumen: function (tipo, v) { prefs[tipo] = Math.max(0, Math.min(1, Math.round(v * 10) / 10)); aplicarVolumen(); guardar(); },
    get prefs() { return prefs; },
    get activo() { return !prefs.silencio; }
  };
})();
