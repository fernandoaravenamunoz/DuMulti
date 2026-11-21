// =====================================================
// Armas en primera persona (dibujadas con código, una vez por arma)
// Plantillas ("forma" en js/datos/armas.js):
//   contacto: punos, manopla, barra, sarten, espatula, llave, destornillador
//   distancia propia: resortera, lanzador, tubo
//   pesadas: pistola, ballesta, escopeta, soplete, rociador, laser, canon, desintegrador
// Animaciones: balanceo al caminar, golpe (barrido), retroceso con fogonazo,
// chorro de los conos, brillo de carga y bajada al recargar.
// =====================================================
(function () {
  'use strict';
  const C = DM.config, PAL = DM.paleta;
  const cache = {};

  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rgb(h, k) { return DM.sprites.rgb(h, k); }
  // Trapecio relleno por filas (cañones en perspectiva)
  function trap(g, ya, yb, xa0, xa1, xb0, xb1, colFn) {
    for (let y = ya; y < yb; y++) {
      const t = (y - ya) / Math.max(1, yb - ya);
      const x0 = Math.round(xa0 + (xb0 - xa0) * t), x1 = Math.round(xa1 + (xb1 - xa1) * t);
      for (let x = x0; x < x1; x++) { g.fillStyle = colFn((x - x0) / Math.max(1, x1 - x0), t); g.fillRect(x, y, 1, 1); }
    }
  }
  const metal = function (base) { return function (u) { return rgb(base, 0.5 + 0.9 * Math.sin(Math.PI * u) - (u > 0.8 ? 0.2 : 0)); }; };

  // ---------- Puño (base de varias armas de contacto) ----------
  function puno(r0, guante) {
    const c = lienzo(80, 76), g = c.getContext('2d');
    const tx = DM.texturas, P = tx.hexARgb(r0.piel), R = tx.hexARgb(r0.ropa);
    const col = function (rgbA, k) { return 'rgb(' + Math.min(255, rgbA[0] * k | 0) + ',' + Math.min(255, rgbA[1] * k | 0) + ',' + Math.min(255, rgbA[2] * k | 0) + ')'; };
    for (let y = 40; y < 76; y++) {
      const a = (y - 40) / 36, x0 = 24 + a * 12, x1 = 54 + a * 20;
      for (let x = Math.floor(x0); x < x1; x++) { const u = (x - x0) / (x1 - x0); g.fillStyle = y < 46 ? col(P, (0.45 + 0.75 * Math.sin(Math.PI * u)) * 0.9) : col(R, 0.45 + 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.1))); g.fillRect(x, y, 1, 1); }
    }
    g.fillStyle = '#07060d'; g.fillRect(25, 45, 32, 2);
    g.fillStyle = '#22e4ff'; g.fillRect(27, 46, 26, 1);
    const base = guante ? tx.hexARgb(guante) : P;
    for (let y = 0; y < 48; y++) for (let x = 6; x < 70; x++) {
      const dx = (x + 0.5 - 38) / 29, dy = (y + 0.5 - 25) / 21, f = Math.pow(Math.abs(dx), 3) + Math.pow(Math.abs(dy), 3);
      if (f > 1) continue;
      let k = 0.95 - dx * 0.28 - dy * 0.32;
      if (f > 0.78) k *= 0.72;
      const fx = (x - 12) / 13;
      if (Math.abs(fx - Math.round(fx)) < 0.06 && fx > 0.5 && fx < 3.5 && y > 6 && y < 30) k *= 0.55;
      if (y > 3 && y < 11 && Math.abs(fx - Math.floor(fx) - 0.5) < 0.28 && fx > 0 && fx < 4) k *= 1.18;
      g.fillStyle = col(base, k); g.fillRect(x, y, 1, 1);
    }
    for (let y = 26; y < 40; y++) for (let x = 10; x < 46; x++) {
      const dx = (x + 0.5 - 27) / 18, dy = (y + 0.5 - 33) / 6.5;
      if (dx * dx + dy * dy > 1) continue;
      g.fillStyle = col(base, 1.05 - dy * 0.3 - dx * 0.12); g.fillRect(x, y, 1, 1);
    }
    if (guante) { g.fillStyle = PAL.cianClaro; for (let k = 0; k < 4; k++) g.fillRect(16 + k * 11, 5, 3, 2); }
    return c;
  }

  // ---------- Dibujo de cada forma (canvas 160×120, anclado abajo a la derecha) ----------
  function dibujarForma(id, pj) {
    const a = DM.ARMAS[id], f = a.forma, col = a.color || '#4a4f63';
    const r0 = pj.retrato;
    const c = lienzo(170, 120), g = c.getContext('2d');
    const R = function (x, y, w, h, cc) { g.fillStyle = cc; g.fillRect(x, y, w, h); };
    const mano = puno(r0);
    switch (f) {
      case 'manopla': g.drawImage(puno(r0, '#2a6b7a'), 80, 44); break;
      case 'barra': {
        // Barra en diagonal desde abajo a la derecha
        for (let k = 0; k < 90; k++) { const x = 150 - k * 0.9, y = 118 - k * 1.05; R(x, y, 9, 3, rgb(col, 0.6 + 0.5 * Math.sin(k * 0.05 + 1))); R(x, y, 9, 1, rgb(col, 1.4)); }
        if (id === 'porra') { R(57, 20, 14, 6, '#3a3a52'); }
        if (id === 'fierro') { for (let k = 0; k < 6; k++) R(66 + k * 3, 24 + k * 3, 2, 2, '#6b4a2a'); }
        g.drawImage(mano, 90, 60); break;
      }
      case 'sarten': {
        for (let y = 0; y < 60; y++) for (let x = 0; x < 76; x++) {
          const dx = (x - 38) / 38, dy = (y - 30) / 28, d = dx * dx + dy * dy;
          if (d > 1) continue;
          R(30 + x, 10 + y, 1, 1, d > 0.82 ? '#5a6075' : rgb('#2a2a3c', 0.8 + 0.5 * Math.max(0, -dx - dy)));
        }
        R(96, 64, 50, 9, '#16151f'); R(96, 64, 50, 2, '#4a4f63');
        g.drawImage(mano, 100, 54); break;
      }
      case 'espatula': {
        R(40, 30, 40, 30, '#c8cbd6'); R(40, 30, 40, 2, '#ffffff'); for (let k = 0; k < 4; k++) R(46 + k * 9, 36, 3, 18, '#8d93ad');
        for (let k = 0; k < 60; k++) R(80 + k, 56 + k * 0.6, 6, 4, '#3a2a1a');
        g.drawImage(mano, 98, 58); break;
      }
      case 'llave': {
        for (let k = 0; k < 80; k++) R(140 - k, 110 - k * 1.0, 10, 4, rgb(col, 0.7 + 0.4 * Math.sin(k * 0.1)));
        R(48, 16, 26, 20, rgb(col, 0.9)); R(56, 16, 10, 10, '#07060d00'); g.clearRect(56, 14, 10, 12); R(48, 16, 26, 2, PAL.cianClaro);
        g.drawImage(mano, 92, 60); break;
      }
      case 'destornillador': {
        R(70, 50, 34, 22, '#e8b923'); R(70, 50, 34, 3, '#ffd34a'); R(100, 56, 30, 12, '#2a2a3c');
        R(40, 58, 32, 5, '#8d93ad'); R(34, 59, 8, 3, '#c8cbd6');
        g.drawImage(mano, 96, 56); break;
      }
      case 'resortera': {
        R(70, 40, 8, 50, '#6b4a2a'); R(56, 16, 8, 30, '#6b4a2a'); R(84, 16, 8, 30, '#6b4a2a');
        R(56, 40, 36, 8, '#6b4a2a'); R(60, 14, 1, 2, '#3a2a1a');
        g.fillStyle = '#8a2a3a'; g.fillRect(58, 18, 2, 14); g.fillRect(88, 18, 2, 14);
        g.drawImage(mano, 52, 50); break;
      }
      case 'lanzador': {
        trap(g, 40, 84, 54, 92, 70, 130, metal(col));
        R(60, 34, 26, 8, rgb(col, 0.6)); R(62, 36, 22, 4, '#07060d');
        R(96, 70, 30, 14, '#2a2a3c');
        g.drawImage(mano, 92, 60); break;
      }
      case 'tubo': {
        trap(g, 20, 100, 74, 86, 64, 104, metal(col));
        R(74, 18, 12, 4, '#16151f');
        g.drawImage(mano, 70, 64); break;
      }
      default: {
        // Armas pesadas: cuerpo + cañón en perspectiva hacia el centro
        const largo = { pistola: 50, ballesta: 54, escopeta: 60, soplete: 50, rociador: 50, laser: 60, canon: 64, desintegrador: 70 }[f] || 54;
        const top = 96 - largo;
        if (f === 'escopeta') { trap(g, top, 96, 56, 70, 52, 82, metal(col)); trap(g, top, 96, 72, 86, 84, 114, metal(col)); }
        else trap(g, top, 96, 62, 86, 56, 120, metal(col));
        R(54, 94, 80, 26, rgb(col, 0.7)); R(54, 94, 80, 2, rgb(col, 1.5));
        if (f === 'ballesta') { R(20, top + 10, 130, 5, '#7a828d'); R(20, top + 10, 130, 1, '#c8cbd6'); R(74, top - 6, 2, 30, '#c8cbd6'); }
        if (f === 'soplete' || f === 'rociador') { R(124, 74, 34, 42, rgb(col, 0.8)); R(124, 74, 34, 3, rgb(col, 1.5)); R(132, 84, 18, 4, '#07060d'); }
        if (f === 'pistola') { for (let k = 0; k < 5; k++) R(66, top + 14 + k * 8, 16, 2, '#2a2a3c'); }
        if (f === 'laser' || f === 'canon' || f === 'desintegrador') {
          for (let k = 0; k < 6; k++) { g.globalAlpha = 0.9; R(64 + (k & 1) * 2, top + 8 + k * 10, 20, 3, f === 'desintegrador' ? PAL.verde : col); }
          g.globalAlpha = 1;
        }
        R(66, top, 20, 4, '#07060d');
        g.drawImage(mano, 110, 74);
      }
    }
    return c;
  }

  function obtener(id, pj) {
    const clave = id + '|' + pj;
    if (!cache[clave]) {
      const p = DM.PERSONAJES[pj] || DM.PERSONAJES.pirulo;
      if (id === 'punos') {
        const d = puno(p.retrato), iz = lienzo(80, 76), g = iz.getContext('2d');
        g.translate(80, 0); g.scale(-1, 1); g.drawImage(d, 0, 0);
        cache[clave] = { der: d, izq: iz };
      } else cache[clave] = { img: dibujarForma(id, p) };
    }
    return cache[clave];
  }

  // Fogonazo en la boca del arma
  function fogonazo(ctx, x, y, color, tam) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - tam / 4, y - tam / 4, tam / 2, tam / 2);
    ctx.fillStyle = color;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(x + Math.cos(a) * tam * 0.6 - 1, y + Math.sin(a) * tam * 0.6 - 1, 3, 3); }
  }

  function dibujar(ctx, jug, t) {
    if (jug.estado !== 'vivo') return;
    const VH = C.VISTA_ALTO, A = C.ANCHO;
    const id = jug.armaActual(), arma = DM.ARMAS[id];
    const andar = jug.andar;
    const bx = Math.cos(jug.bob) * 7 * andar;
    const by = Math.abs(Math.sin(jug.bob)) * 6 * andar + Math.sin(t * 1.6) * 1.2;
    const baja = jug.recargando > 0 ? 40 : 0;
    const a = jug.ataque;
    ctx.imageSmoothingEnabled = false;
    if (id === 'punos') {
      const o = obtener('punos', jug.personaje);
      let gx = 0, gy = 0, esc = 1;
      if (a > 0) { const e = a < 0.35 ? a / 0.35 : 1 - (a - 0.35) / 0.65, s = e * e * (3 - 2 * e); gx = -78 * s; gy = -34 * s; esc = 1 + 0.18 * s; }
      ctx.drawImage(o.izq, Math.round(A / 2 - 150 - bx * 0.7), Math.round(VH - 76 + 14 + by + (a > 0 ? 6 : 0)));
      ctx.drawImage(o.der, Math.round(A / 2 + 74 + bx + gx), Math.round(VH - 76 * esc + 12 + by + gy), Math.round(80 * esc), Math.round(76 * esc));
      return;
    }
    const img = obtener(id, jug.personaje).img;
    let x = A / 2 + 20 + bx, y = VH - 120 + 10 + by + baja, rot = 0;
    if (arma.tipo === 'melee' && a > 0) {
      // Golpe: barrido en arco hacia el centro
      const e = a < 0.4 ? a / 0.4 : 1 - (a - 0.4) / 0.6, s = e * e * (3 - 2 * e);
      x -= 70 * s; y -= 20 * s; rot = -0.6 * s;
    } else if (a > 0) {
      const e = Math.max(0, 1 - a * 3);
      y += 10 * e; x += 6 * e;
    }
    if (arma.tipo === 'melee' && arma.bloquea && a === 0) { x -= 46; y -= 8; }   // sartén en guardia
    ctx.save();
    ctx.translate(Math.round(x + 85), Math.round(y + 120));
    ctx.rotate(rot);
    ctx.drawImage(img, -85, -120);
    ctx.restore();
    // Boca del arma (aprox. arriba al centro del dibujo)
    const bocaX = Math.round(x + 76), bocaY = Math.round(y + (arma.forma === 'tubo' ? 18 : arma.pesada ? 96 - ({ pistola: 50, ballesta: 54, escopeta: 60, soplete: 50, rociador: 50, laser: 60, canon: 64, desintegrador: 70 }[arma.forma] || 54) : 34));
    if (arma.tipo !== 'melee' && arma.tipo !== 'cono' && a > 0 && a < 0.25) fogonazo(ctx, bocaX, bocaY, arma.color || PAL.amarilloClaro, arma.pesada ? 16 : 8);
    if (arma.tipo === 'cono' && jug.disparando > 0) {
      // Chorro: partículas que salen de la boca
      for (let k = 0; k < 26; k++) {
        const d = Math.random(), sx = bocaX - d * 60 + (Math.random() - 0.5) * d * 70, sy = bocaY - d * 40 + (Math.random() - 0.5) * d * 30;
        ctx.fillStyle = arma.calor ? (d < 0.3 ? '#ffffff' : d < 0.6 ? '#ffd34a' : '#ff8a2b') : (d < 0.4 ? '#ffffff' : PAL.cian);
        const w = 2 + d * 6; ctx.fillRect(sx, sy, w, w);
      }
    }
    if (jug.cargaT > 0) {
      const k = Math.min(1, jug.cargaT / (arma.carga || 1));
      ctx.fillStyle = arma.suprema ? PAL.verde : PAL.cian;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 40);
      ctx.fillRect(bocaX - 2 - k * 8, bocaY - 2 - k * 8, 4 + k * 16, 4 + k * 16);
      ctx.globalAlpha = 1;
    }
  }

  DM.ArmaFP = { preparar: function () {}, dibujar: dibujar };
})();
