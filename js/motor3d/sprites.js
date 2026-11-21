// =====================================================
// Sprites 64×64 (dibujados con código, sin imágenes)
//   enemigos (con cuadros de caminar/atacar y restos), objetos, armas en el suelo,
//   proyectiles, lanzables y efectos (explosiones, gas, chispas, hielo).
// Truco heredado de Worodorox: un píxel con alfa 254 queda marcado como EMISIVO.
// Los personajes jugables están en motor3d/personajes3d.js.
// =====================================================
(function () {
  'use strict';
  const S = DM.config.SPR;
  const PAL = DM.paleta;
  const TX = DM.texturas;

  let lienzo = null;
  function spriteDesde(dibujar) {
    if (!lienzo) { lienzo = document.createElement('canvas'); lienzo.width = S; lienzo.height = S; }
    const c = lienzo.getContext('2d', { willReadFrequently: true });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.clearRect(0, 0, S, S);
    const r = function (x, y, w, h, col) { c.globalAlpha = 1; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // emisivo: se borra antes, porque pintar con alfa 254 sobre un píxel opaco daría alfa 255
    const e = function (x, y, w, h, col) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); c.clearRect(x, y, w, h); c.globalAlpha = 254 / 255; c.fillStyle = col; c.fillRect(x, y, w, h); c.globalAlpha = 1; };
    // círculo relleno (con función de color por píxel opcional)
    const o = function (cx, cy, rx, ry, col, emis, fn) {
      for (let j = Math.floor(cy - ry); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
        const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry, d = dx * dx + dy * dy;
        if (d > 1) continue;
        const cc = fn ? fn(dx, dy, d) : col;
        if (!cc) continue;
        (emis ? e : r)(i, j, 1, 1, cc);
      }
    };
    dibujar(r, e, o, c);
    const d = c.getImageData(0, 0, S, S).data;
    const L = new TX.Lienzo(S);
    for (let i = 0; i < S * S; i++) {
      if (d[i * 4 + 3] < 128) continue;
      L.px[i] = TX.empacar(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      L.em[i] = d[i * 4 + 3] === 254 ? 1 : 0;
    }
    return L;
  }
  function rgb(h, k) { const c = TX.hexARgb(h); return 'rgb(' + Math.min(255, c[0] * k | 0) + ',' + Math.min(255, c[1] * k | 0) + ',' + Math.min(255, c[2] * k | 0) + ')'; }
  // Esfera sombreada con luz desde arriba a la izquierda
  function esfera(base) { return function (dx, dy) { const k = 0.55 + 0.6 * Math.max(0, -dx * 0.5 - dy * 0.7) - 0.15 * (dx * dx + dy * dy); return rgb(base, k); }; }
  function cilindro(r, x, y, w, h, base, kMin) {
    for (let i = 0; i < w; i++) {
      const k = (kMin || 0.35) + (1 - (kMin || 0.35)) * Math.sin(Math.PI * (i + 0.5) / w);
      r(x + i, y, 1, h, rgb(base, k * 1.2));
    }
  }

  // =====================================================
  // ZOMBIS (criogenizados): piel helada, traje rasgado, ojos rojos
  // =====================================================
  function zombi(op) {
    // op: { cuadro, ataque, piel, traje, ancho, encorvado, hinchado }
    return spriteDesde(function (r, e, o) {
      const piel = op.piel || '#a9cfe0', pielS = rgb(piel, 0.72), pielO = rgb(piel, 0.48);
      const traje = op.traje || '#3b5566', trajeS = rgb(traje, 0.66), trajeL = rgb(traje, 1.3);
      const cu = op.cuadro, dx = cu ? 1 : 0, enc = op.encorvado || 0, an = op.ancho || 0;
      const top = 6 + enc;
      // Piernas
      r(25 - an / 2, 43, 6, 17, trajeS); r(33 + an / 2, 43, 6, 17 - cu, trajeS);
      r(25 - an / 2, 43, 2, 17, traje); r(33 + an / 2, 43, 2, 16, traje);
      r(24 - an / 2, 59, 8, 4, piel); r(33 + an / 2, 59 - cu, 8, 4, piel);
      // Torso (hinchado: barriga redonda con pústulas)
      if (op.hinchado) {
        o(32 + dx, 34, 15, 12, null, false, function (x, y) { const k = 0.6 + 0.5 * Math.max(0, -x * 0.4 - y * 0.6); return rgb('#8fb59a', k); });
        for (const p of [[25, 30], [36, 37], [30, 41], [39, 29]]) { e(p[0] + dx, p[1], 2, 2, '#c9ff5a'); r(p[0] + dx, p[1] + 2, 2, 1, '#4f6f3a'); }
        r(22 + dx, 22, 20, 5, traje); r(22 + dx, 22, 20, 1, trajeL);
      } else {
        r(22 + dx - an / 2, 22 + enc, 20 + an, 22 - enc, traje);
        r(36 + dx + an / 2, 22 + enc, 6, 22 - enc, trajeS);
        r(22 + dx - an / 2, 22 + enc, 20 + an, 2, trajeL);
        r(27 + dx, 24 + enc, 10, 2, '#0f5a6b');
        r(30 + dx, 30, 5, 6, piel); r(33 + dx, 30, 2, 6, pielS);
        r(25 + dx, 27 + enc, 3, 3, '#0f5a6b'); e(26 + dx, 28 + enc, 1, 1, PAL.cian);
      }
      for (let k = 0; k < 8; k++) r(22 + dx + k * 2 + (k & 1), 22 + enc + (k & 1), 1, 1, '#c8fbff');
      // Brazos (al atacar, adelante y arriba)
      const ay = op.ataque ? -6 : cu ? 1 : 0;
      r(17 + dx - an, 23 + enc, 5, 9, traje); r(42 + dx + an, 23 + enc, 5, 9, trajeS);
      r(14 + dx - an, 28 + ay + enc, 8, 7, piel); r(42 + dx + an, 28 - ay + enc + (op.ataque ? -12 : 0), 8, 7, pielS);
      for (let k = 0; k < 4; k++) { r(14 + dx - an + k * 2, 35 + ay + enc, 1, 3, pielS); r(43 + dx + an + k * 2, 35 - ay + enc + (op.ataque ? -12 : 0), 1, 3, pielO); }
      // Cabeza
      const hx = 26 + dx + cu, hy = top + cu;
      r(29 + dx, 19 + enc, 6, 4, pielS);
      r(hx, hy, 12, 14, piel); r(hx + 9, hy, 3, 14, pielS); r(hx, hy + 13, 12, 1, pielO);
      r(hx + 1, hy - 1, 10, 3, '#2a3440'); r(hx + 3, hy - 1, 1, 1, '#c8fbff');
      r(hx + 2, hy + 5, 3, 2, '#1a2430'); r(hx + 7, hy + 5, 3, 2, '#1a2430');
      e(hx + 3, hy + 6, 1, 1, PAL.rojo); e(hx + 8, hy + 6, 1, 1, PAL.rojo);
      r(hx + 4, hy + 10, 4, op.ataque ? 3 : 2, '#3a1a24'); r(hx + 5, hy + 10, 1, 1, '#c8c4b0');
    });
  }
  // Restos de un zombi (montón de hielo y ropa)
  function zombiRestos(piel) {
    return spriteDesde(function (r, e, o) {
      o(32, 58, 16, 5, null, false, function (x, y) { return rgb('#3b5566', 0.7 + 0.3 * -y); });
      o(26, 56, 6, 4, piel || '#a9cfe0');
      for (let k = 0; k < 9; k++) e(18 + k * 3.3, 53 + (k % 3), 2, 2, k % 2 ? '#c8fbff' : '#9fe8f5');
    });
  }

  // =====================================================
  // ROBOTS
  // =====================================================
  function dron(cuadro, carga) {
    return spriteDesde(function (r, e, o) {
      const cx = 32, cy = 30;
      r(8, 18, 16, 3, '#3a3a52'); r(40, 18, 16, 3, '#3a3a52');
      r(8, 18, 16, 1, '#7a828d'); r(40, 18, 16, 1, '#7a828d');
      for (let i = 0; i < 18; i++) {
        if (((i + cuadro) & 1) === 0) { r(1 + i, 15, 1, 1, '#8d93ad'); r(45 + i, 15, 1, 1, '#8d93ad'); }
        if (((i + cuadro) % 3) === 0) { r(1 + i, 14, 1, 1, '#4a4f63'); r(45 + i, 16, 1, 1, '#4a4f63'); }
      }
      r(8, 16, 4, 6, '#2a2a3c'); r(52, 16, 4, 6, '#2a2a3c');
      o(cx, cy, 14, 14, null, false, function (x, y, d) { const v = Math.round(58 * (0.35 + 0.55 * Math.max(0, -x * 0.5 - y * 0.7) - (d > 0.8 ? 0.15 : 0)) + 20); return 'rgb(' + v + ',' + v + ',' + (v + 22) + ')'; });
      r(cx - 14, cy + 3, 29, 2, '#16151f');
      r(cx - 13, cy + 3, 4, 1, '#6b1010'); r(cx + 10, cy + 3, 4, 1, '#6b1010');
      o(cx, cy - 2, 7, 7, null, false, function (x, y, d) { return d > 0.62 ? '#4a4f63' : '#07060d'; });
      const ojo = carga ? '#ffffff' : PAL.rojo;
      o(cx, cy - 2, 3.6, 3.6, null, true, function (x, y, d) { return d < 0.2 ? '#ffd0d0' : ojo; });
      e(cx - 2, cy - 5, 1, 1, '#ffffff');
      r(cx - 3, cy + 13, 6, 5, '#2a2a3c'); e(cx - 1, cy + 17, 2, 2, cuadro || carga ? PAL.rojo : PAL.rojoOsc);
      r(cx + 6, cy - 19, 1, 6, '#4a4f63'); e(cx + 6, cy - 20, 1, 1, cuadro ? PAL.rojo : '#6b1010');
    });
  }
  function guardian(cuadro, ataque) {
    return spriteDesde(function (r, e, o) {
      const pie = cuadro ? 1 : 0;
      // Piernas hidráulicas
      r(18, 46, 9, 16 - pie, '#2d3140'); r(37, 46 + pie, 9, 16 - pie, '#2d3140');
      r(19, 46, 2, 15, '#565d67'); r(38, 46, 2, 15, '#565d67');
      r(15, 60 - pie, 14, 4, '#16151f'); r(35, 60, 14, 4, '#16151f');
      // Torso blindado
      r(12, 16, 40, 32, '#3a3d54'); r(12, 16, 40, 3, '#7a828d'); r(44, 16, 8, 32, '#2a2a3c');
      for (let y = 24; y < 46; y += 5) r(16, y, 30, 1, '#1a1c26');
      for (let x = 12; x < 52; x++) { const on = (x >> 2) & 1; (on ? e : r)(x, 44, 1, 3, on ? PAL.rojo : '#15151a'); }
      // Hombreras y cañones
      r(4, 14, 10, 12, '#4a4f63'); r(50, 14, 10, 12, '#4a4f63');
      r(2, 24 + (ataque ? -4 : 0), 8, 14, '#2a2a3c'); r(54, 24 + (ataque ? -4 : 0), 8, 14, '#2a2a3c');
      e(4, 36 + (ataque ? -4 : 0), 4, 3, ataque ? '#ffd0d0' : PAL.rojoOsc); e(56, 36 + (ataque ? -4 : 0), 4, 3, ataque ? '#ffd0d0' : PAL.rojoOsc);
      // Cabeza con visor rojo
      r(22, 4, 20, 13, '#2d3140'); r(22, 4, 20, 2, '#565d67');
      r(24, 9, 16, 5, '#0b0c12'); e(25, 10, 14, 3, PAL.rojo); e(29, 10, 6, 1, '#ffd0d0');
      r(31, 0, 2, 4, '#4a4f63'); e(31, 0, 2, 1, PAL.rojo);
    });
  }
  function chatarra() {
    return spriteDesde(function (r, e) {
      r(16, 54, 32, 8, '#3a3d54'); r(22, 50, 12, 5, '#565d67'); r(38, 52, 6, 3, '#2a2a3c');
      r(18, 58, 4, 2, '#16151f'); e(28, 56, 2, 1, PAL.rojoOsc); e(40, 49, 1, 1, '#ffd34a');
    });
  }

  // =====================================================
  // OBJETOS
  // =====================================================
  function frasco(tam, liquido, claro, halo) {
    return spriteDesde(function (r, e, o) {
      const w = tam, h = Math.round(tam * 1.35), x0 = 32 - w / 2, y0 = 62 - h;
      if (halo) for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
        const d = Math.hypot(i - 32, (j - (y0 + h / 2)) * 0.9);
        if (d < w * 0.95 && d > w * 0.75 && ((i * 3 + j) % 4 === 0)) e(i, j, 1, 1, halo);
      }
      r(32 - w * 0.2, y0 - 10, w * 0.4, 5, '#7a828d'); r(32 - w * 0.2, y0 - 10, w * 0.4, 1, '#c8cbd6');
      r(32 - w * 0.15, y0 - 5, w * 0.3, 5, '#4f6f82'); r(32 - w * 0.1, y0 - 5, 1, 5, '#c8fbff');
      cilindro(r, x0, y0, w, h, '#6e8ca0', 0.4);
      for (let j = y0 + 3; j < y0 + h - 1; j++) for (let i = x0 + 1; i < x0 + w - 1; i++) {
        const k = Math.sin(Math.PI * (i - x0) / w);
        e(i, j, 1, 1, k > 0.8 ? claro : liquido);
      }
      e(x0 + 3, y0 + 5, 2, 2, '#ffffff');
      r(x0 + w * 0.2, y0 + h * 0.45, w * 0.6, h * 0.3, '#e6e3ff');
      r(31, y0 + h * 0.48, 2, h * 0.24, PAL.rojo); r(28, y0 + h * 0.55, 8, 2, PAL.rojo);
      r(x0 + 1, y0 + 2, 1, h - 4, '#c8fbff');
    });
  }
  function chaleco(color, dorado) {
    return spriteDesde(function (r, e) {
      const c1 = dorado ? '#e8b923' : color, c2 = rgb(c1, 0.6);
      r(18, 34, 28, 26, c1); r(18, 34, 28, 2, rgb(c1, 1.4)); r(40, 34, 6, 26, c2);
      r(26, 34, 12, 6, '#07060d'); r(18, 34, 6, 6, '#07060d00');
      r(22, 44, 20, 2, c2); r(22, 50, 20, 2, c2);
      e(30, 46, 4, 3, dorado ? '#fff4c0' : PAL.cian);
      if (dorado) for (let k = 0; k < 6; k++) e(16 + k * 7, 30 + (k & 1) * 30, 2, 2, '#ffd34a');
    });
  }
  function nucleo() {
    return spriteDesde(function (r, e, o) {
      for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const d = Math.hypot(i - 32, j - 40); if (d < 20 && d > 15 && (i + j) % 3 === 0) e(i, j, 1, 1, PAL.cianOsc); }
      r(22, 56, 20, 6, '#3a3a52'); r(22, 56, 20, 1, '#7a828d');
      o(32, 40, 11, 11, null, true, function (x, y, d) { return d < 0.15 ? '#ffffff' : d < 0.45 ? PAL.cianClaro : PAL.cian; });
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; e(32 + Math.cos(a) * 14, 40 + Math.sin(a) * 14, 2, 2, '#c8fbff'); }
    });
  }
  // Arma pesada en el suelo: silueta con su color
  function armaSuelo(id) {
    const a = DM.ARMAS[id];
    return spriteDesde(function (r, e) {
      const col = a.color || '#4a4f63';
      for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const d = Math.hypot(i - 32, (j - 56) * 2.5); if (d < 22 && d > 18 && (i % 3 === 0)) e(i, j, 1, 1, '#8a6d12'); }
      const f = a.forma;
      const largo = f === 'escopeta' ? 36 : f === 'canon' || f === 'desintegrador' ? 34 : f === 'ballesta' ? 32 : 28;
      const x0 = 32 - largo / 2;
      r(x0, 46, largo, 6, rgb(col, 1)); r(x0, 46, largo, 1, rgb(col, 1.6)); r(x0, 51, largo, 1, rgb(col, 0.5));
      r(x0 + largo * 0.55, 51, 5, 7, '#2a2a3c');                 // empuñadura
      if (f === 'ballesta') { r(x0 - 2, 40, 2, 18, '#7a828d'); r(x0, 48, largo + 4, 1, '#c8cbd6'); }
      if (f === 'soplete' || f === 'rociador') { r(x0 + 6, 40, 10, 6, rgb(col, 0.8)); e(x0 - 2, 47, 3, 3, col); }
      if (f === 'escopeta') r(x0, 44, largo * 0.7, 2, '#3a3a52');
      if (f === 'laser' || f === 'canon' || f === 'desintegrador') { e(x0 - 1, 47, 3, 4, col); e(x0 + largo * 0.3, 44, 6, 2, col); }
      if (f === 'desintegrador') { for (let k = 0; k < 5; k++) e(x0 + 4 + k * 6, 42, 3, 3, PAL.verde); }
      e(x0 + largo - 4, 47, 2, 2, PAL.amarilloClaro);
    });
  }
  function granada(armada) { return spriteDesde(function (r, e, o) { o(32, 56, 6, 7, null, false, esfera('#4a5a3a')); r(30, 48, 4, 3, '#7a828d'); r(34, 47, 4, 2, '#8d93ad'); if (armada) e(31, 55, 2, 2, PAL.rojo); }); }
  function mina(luz) { return spriteDesde(function (r, e, o) { o(32, 60, 10, 3, null, false, esfera('#3a3a52')); r(26, 57, 12, 2, '#565d67'); (luz ? e : r)(31, 56, 2, 2, luz ? PAL.rojo : PAL.rojoOsc); }); }
  function bengala(ardiendo, k) {
    return spriteDesde(function (r, e, o) {
      r(26, 58, 12, 3, '#6b1010'); r(26, 58, 12, 1, '#a01818');
      if (ardiendo) { o(37, 54 - k, 4, 5 + k, null, true, function (x, y, d) { return d < 0.3 ? '#ffffff' : d < 0.6 ? '#ffd34a' : '#ff8a2b'; }); for (let q = 0; q < 4; q++) e(34 + q * 2, 44 - q * 2 - k, 1, 1, '#ffd34a'); }
    });
  }
  function empSprite() { return spriteDesde(function (r, e, o) { r(26, 52, 12, 10, '#2a2a3c'); r(26, 52, 12, 1, '#7a828d'); e(28, 54, 8, 2, PAL.cian); o(32, 49, 3, 3, null, true, function () { return PAL.cianClaro; }); }); }
  function torreta(cuadro) {
    return spriteDesde(function (r, e) {
      r(22, 58, 20, 4, '#2a2a3c'); r(30, 46, 4, 12, '#3a3a52');
      r(24, 38, 16, 10, '#4a4f63'); r(24, 38, 16, 1, '#8d93ad'); r(38, 41, 12, 3, '#2a2a3c');
      e(27, 41, 3, 3, cuadro ? PAL.cian : PAL.cianOsc); e(48, 41, 2, 3, cuadro ? '#ffd34a' : '#8a6d12');
    });
  }
  function carta() {
    return spriteDesde(function (r, e) {
      r(20, 58, 24, 5, '#d8d4c0'); r(20, 58, 24, 1, '#f4f0e0'); r(22, 60, 14, 1, '#4a4f63'); r(22, 61, 18, 1, '#4a4f63');
      e(41, 56, 2, 2, PAL.cian);
    });
  }

  // =====================================================
  // PROYECTILES (pequeños; el motor los dibuja con poca altura)
  // =====================================================
  function bala(tipo) {
    return spriteDesde(function (r, e, o) {
      const c = 32, y = 32;
      switch (tipo) {
        case 'piedra': o(c, y, 4, 4, null, false, esfera('#8a7a6a')); break;
        case 'tuerca': o(c, y, 5, 5, null, false, function (x, yy, d) { return d < 0.3 ? null : '#9aa2ad'; }); break;
        case 'tapa': o(c, y, 7, 3, null, false, esfera('#c8cbd6')); e(c - 2, y - 1, 2, 1, '#ffffff'); break;
        case 'tenedor': r(c - 6, y, 10, 1, '#e6e3ff'); r(c + 4, y - 2, 4, 1, '#e6e3ff'); r(c + 4, y, 4, 1, '#e6e3ff'); r(c + 4, y + 2, 4, 1, '#e6e3ff'); r(c + 3, y - 2, 1, 5, '#e6e3ff'); break;
        case 'perno': r(c - 5, y - 1, 10, 3, '#e8b923'); r(c + 4, y - 2, 2, 5, '#8a6d12'); break;
        case 'ampolla': o(c, y, 3, 5, null, true, function () { return '#9fe8f5'; }); r(c - 1, y - 7, 2, 2, '#7a828d'); break;
        case 'varilla': r(c - 14, y, 28, 2, '#c8cbd6'); r(c + 12, y - 1, 3, 4, '#7a828d'); break;
        case 'plasma': o(c, y, 7, 7, null, true, function (x, yy, d) { return d < 0.25 ? '#ffffff' : d < 0.6 ? PAL.magentaClaro : PAL.magenta; }); break;
        case 'orbe': o(c, y, 8, 8, null, true, function (x, yy, d) { return d < 0.25 ? '#ffffff' : d < 0.6 ? '#ff9090' : PAL.rojo; }); break;
        case 'emp': o(c, y, 4, 4, null, true, function () { return PAL.cian; }); break;
        default: o(c, y, 4, 4, '#8d93ad');
      }
    });
  }

  // =====================================================
  // EFECTOS
  // =====================================================
  function explosion(k, estilo) {
    const cols = estilo === 'plasma' ? ['#ffffff', PAL.magentaClaro, PAL.magenta, PAL.magentaOsc] :
      estilo === 'frio' ? ['#ffffff', PAL.cianClaro, PAL.cian, PAL.cianOsc] : ['#ffffff', '#ffd34a', '#ff8a2b', '#a01818'];
    return spriteDesde(function (r, e, o) {
      const rad = 10 + k * 6, rnd = TX.azar(300 + k);
      o(32, 34, rad, rad * 0.9, null, true, function (x, y, d) {
        const n = d + (rnd() - 0.5) * 0.35;
        if (k === 3 && n > 0.55) return ((Math.round(x * 20) + Math.round(y * 20)) & 1) ? '#3a3a52' : null;
        return n < 0.25 - k * 0.05 ? cols[0] : n < 0.55 ? cols[1] : n < 0.85 ? cols[2] : cols[3];
      });
    });
  }
  function nube(k) {
    return spriteDesde(function (r, e, o) {
      const rnd = TX.azar(400 + k);
      for (let q = 0; q < 7; q++) {
        const x = 14 + rnd() * 36, y = 30 + rnd() * 26, rad = 6 + rnd() * 7;
        o(x, y, rad, rad * 0.8, null, true, function (dx, dy, d) { return (Math.round(dx * 9 + dy * 7 + k) & 1) ? (d < 0.5 ? '#a8ffbf' : '#3bd16a') : null; });
      }
    });
  }
  function chispas(col) {
    return spriteDesde(function (r, e) {
      for (let k = 0; k < 10; k++) { const a = k * 0.63, l = 6 + (k % 3) * 4; for (let q = 2; q < l; q++) e(32 + Math.cos(a) * q, 32 + Math.sin(a) * q, 1, 1, q < 4 ? '#ffffff' : col); }
    });
  }
  function particula(col) { return spriteDesde(function (r, e) { e(30, 30, 4, 4, col); e(31, 29, 2, 1, '#ffffff'); }); }

  // =====================================================
  // TRAMPAS COMO SPRITES
  // =====================================================
  // Láser: emisores a los lados y rayos magenta (0 apagado, 1 aviso, 2 activo)
  function laser(estado) {
    return spriteDesde(function (r, e) {
      r(0, 0, 3, 64, '#4a4f63'); r(61, 0, 3, 64, '#4a4f63'); r(0, 0, 3, 1, '#8d93ad'); r(61, 0, 3, 1, '#8d93ad');
      for (let y = 8; y < 64; y += 9) {
        e(1, y, 1, 2, estado ? PAL.magenta : '#3a0a30'); e(62, y, 1, 2, estado ? PAL.magenta : '#3a0a30');
        if (estado === 2) { e(3, y, 58, 1, PAL.magentaClaro); for (let x = 3; x < 61; x += 2) e(x, y - 1, 1, 1, PAL.magenta); for (let x = 4; x < 61; x += 2) e(x, y + 1, 1, 1, PAL.magenta); }
        else if (estado === 1) for (let x = 3; x < 61; x += 3) e(x, y, 1, 1, PAL.magentaOsc);
      }
    });
  }
  // Foco de radiación (el emisor sobre el piso)
  function foco(on) {
    return spriteDesde(function (r, e, o) {
      r(24, 56, 16, 7, '#2a2a3c'); r(24, 56, 16, 1, '#7a828d');
      o(32, 50, 7, 7, null, on, function (x, y, d) { return on ? (d < 0.3 ? '#ffffff' : PAL.magenta) : '#3a0a30'; });
      r(25, 49, 14, 1, '#16151f');
    });
  }


  // Barril tóxico (explota al destruirlo)
  function barril() {
    return spriteDesde(function (r, e) {
      cilindro(r, 17, 20, 30, 43, '#484c66', 0.3);
      [24, 41, 57].forEach(function (y) { cilindro(r, 16, y, 32, 3, '#6e748c', 0.3); });
      for (let i = 0; i < 30; i++) {
        const k = 0.5 + 0.5 * Math.sin(Math.PI * (i + 0.5) / 30);
        for (let j = 30; j < 38; j++) {
          const on = (((i + j) >> 2) & 1);
          if (on) e(17 + i, j, 1, 1, k > 0.75 ? PAL.magenta : PAL.magentaOsc); else r(17 + i, j, 1, 1, '#18101a');
        }
      }
      for (let i = -15; i <= 15; i++) for (let j = -4; j <= 4; j++) {
        if ((i * i) / 225 + (j * j) / 16 > 1) continue;
        if ((i * i) / 169 + (j * j) / 9 > 1) r(32 + i, 19 + j, 1, 1, '#5a6075');
        else e(32 + i, 19 + j, 1, 1, ((i + j * 3) % 5 === 0) ? PAL.magentaClaro : PAL.magenta);
      }
      e(26, 18, 2, 1, '#ffffff'); e(23, 23, 1, 4, PAL.magenta); e(38, 23, 1, 6, PAL.magenta);
    });
  }

  // alto = altura en el mundo de la textura completa de 64 px
  const ZOMBI = { piel: '#a9cfe0', traje: '#3b5566' };
  DM.sprites = {
    spriteDesde: spriteDesde, rgb: rgb, barril: barril(),
    enemigos: {
      lento: { cuadros: [zombi({ cuadro: 0 }), zombi({ cuadro: 1 })], ataque: zombi({ cuadro: 0, ataque: true }), restos: zombiRestos(), fps: 2.2, alto: 0.88 },
      corredor: { cuadros: [zombi({ cuadro: 0, piel: '#c0dbe6', traje: '#4a3a4e', ancho: -4, encorvado: 4 }), zombi({ cuadro: 1, piel: '#c0dbe6', traje: '#4a3a4e', ancho: -4, encorvado: 4 })], ataque: zombi({ cuadro: 0, piel: '#c0dbe6', traje: '#4a3a4e', ancho: -4, encorvado: 4, ataque: true }), restos: zombiRestos('#c0dbe6'), fps: 6, alto: 0.82 },
      hinchado: { cuadros: [zombi({ cuadro: 0, hinchado: true, piel: '#9fc4b0', ancho: 6 }), zombi({ cuadro: 1, hinchado: true, piel: '#9fc4b0', ancho: 6 })], ataque: zombi({ cuadro: 0, hinchado: true, piel: '#9fc4b0', ancho: 6, ataque: true }), restos: zombiRestos('#9fc4b0'), fps: 1.6, alto: 0.9 },
      dron: { cuadros: [dron(0, false), dron(1, false)], ataque: dron(0, true), restos: chatarra(), fps: 14, alto: 0.42 },
      guardian: { cuadros: [guardian(0, false), guardian(1, false)], ataque: guardian(0, true), restos: chatarra(), fps: 1.6, alto: 1.15 }
    },
    objetos: {
      elixirP: { tex: frasco(12, '#e8b923', '#ffd34a'), alto: 0.3 },
      elixirG: { tex: frasco(18, '#e8b923', '#ffd34a', '#8a6d12'), alto: 0.36 },
      chaleco: { tex: chaleco('#2a6b7a'), alto: 0.4 },
      blindaje: { tex: chaleco('#3a3d54'), alto: 0.44 },
      nucleo: { tex: nucleo(), alto: 0.46 },
      elixirTotal: { tex: frasco(22, '#ffd34a', '#ffffff', '#e8b923'), alto: 0.46 },
      blindajeTotal: { tex: chaleco('#e8b923', true), alto: 0.5 },
      carta: { tex: carta(), alto: 0.3 },
      'lanz:granada': { tex: granada(false), alto: 0.32 }, 'lanz:mina': { tex: mina(false), alto: 0.3 },
      'lanz:bengala': { tex: bengala(false, 0), alto: 0.32 }, 'lanz:emp': { tex: empSprite(), alto: 0.32 },
      'lanz:torreta': { tex: torreta(0), alto: 0.45 }
    },
    armaSuelo: {},
    balas: {},
    lanzados: {
      granada: [granada(false), granada(true)], mina: [mina(false), mina(true)],
      bengala: [bengala(true, 0), bengala(true, 1), bengala(true, 2)], emp: [empSprite()], torreta: [torreta(0), torreta(1)]
    },
    efectos: {
      fuego: [0, 1, 2, 3].map(function (k) { return explosion(k, 'fuego'); }),
      plasma: [0, 1, 2, 3].map(function (k) { return explosion(k, 'plasma'); }),
      frio: [0, 1, 2, 3].map(function (k) { return explosion(k, 'frio'); }),
      nube: [nube(0), nube(1)],
      chispa: chispas('#ffd34a'), chispaCian: chispas(PAL.cian),
      hielo: particula('#c8fbff'), metal: particula('#8d93ad'), fuegoP: particula('#ff8a2b'), magenta: particula(PAL.magenta)
    },
    trampas: { laser: [laser(0), laser(1), laser(2)], foco: [foco(false), foco(true)] }
  };
  DM.ARMAS_PESADAS.concat(['desintegrador']).forEach(function (id) { DM.sprites.armaSuelo[id] = { tex: armaSuelo(id), alto: 0.4 }; });
  ['piedra', 'tuerca', 'tapa', 'tenedor', 'perno', 'ampolla', 'varilla', 'plasma', 'orbe', 'emp'].forEach(function (b) { DM.sprites.balas[b] = bala(b); });
})();
