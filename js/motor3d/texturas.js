// =====================================================
// Texturas procedurales 64×64 — dirección "D · Alarma neón"
// Todo se dibuja con código: no hay imágenes externas.
//
// Cada textura es un "Lienzo" con:
//   px: colores empaquetados (Uint32 en el orden del canvas). 0 = transparente.
//   em: 1 si el píxel es emisivo (neón: no lo oscurecen la luz ni la niebla)
//
// Las texturas animadas tienen varios cuadros. El motor pide la textura por
// número (id) y DM.texturas.actualizar(t) elige el cuadro de cada una.
//
// Reutiliza de Worodorox 3073 (motor3d/texturas.js): Lienzo, empacar, color,
// azar con semilla, trama, anillo, ruido y la base del panel metálico.
// Lo nuevo: degradados, manchas, abolladuras, cables, texto en pantallas,
// transparencias (rejillas) y el sistema de animación.
// =====================================================
(function () {
  'use strict';
  const T = DM.config.TEX;
  const PAL = DM.paleta;

  // ---------- Utilidades de color ----------
  function lim(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }
  function hexARgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // Empaqueta RGB en el orden que usa ImageData en equipos little-endian (ABGR)
  function empacar(r, g, b) { return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }
  function color(h, k) {
    if (k === undefined) k = 1;
    const c = hexARgb(h);
    return empacar(lim(c[0] * k), lim(c[1] * k), lim(c[2] * k));
  }
  function mezclaHex(h1, h2, t) {
    const a = hexARgb(h1), b = hexARgb(h2);
    return empacar(lim(a[0] + (b[0] - a[0]) * t), lim(a[1] + (b[1] - a[1]) * t), lim(a[2] + (b[2] - a[2]) * t));
  }
  // Escala el brillo de un color ya empaquetado
  function escalar(c, k) {
    return empacar(lim((c & 255) * k), lim(((c >>> 8) & 255) * k), lim(((c >>> 16) & 255) * k));
  }

  // Números pseudoaleatorios con semilla (las texturas salen siempre iguales)
  function azar(semilla) {
    let s = semilla >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Lienzo de dibujo para una textura ----------
  function Lienzo(tam) {
    this.t = tam || T;
    this.px = new Uint32Array(this.t * this.t);
    this.em = new Uint8Array(this.t * this.t);
  }
  Lienzo.prototype.pixC = function (x, y, v, e) {   // v ya empaquetado
    const t = this.t;
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= t || y >= t) return;
    const i = y * t + x;
    this.px[i] = v; this.em[i] = e ? 1 : 0;
  };
  Lienzo.prototype.pix = function (x, y, c, e) { this.pixC(x, y, color(c), e); };
  Lienzo.prototype.rect = function (x, y, w, h, c, e) {
    const v = color(c);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.pixC(i, j, v, e);
  };
  // Tramado (dithering): pinta en patrón de tablero de ajedrez
  Lienzo.prototype.trama = function (x, y, w, h, c, e) {
    const v = color(c);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (((i + j) & 1) === 0) this.pixC(i, j, v, e);
    }
  };
  // Degradado vertical (vertical = true) u horizontal entre dos colores
  Lienzo.prototype.grad = function (x, y, w, h, c1, c2, vertical, e) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const t = vertical ? j / Math.max(1, h - 1) : i / Math.max(1, w - 1);
      this.pixC(x + i, y + j, mezclaHex(c1, c2, t), e);
    }
  };
  Lienzo.prototype.anillo = function (cx, cy, r0, r1, c, e) {
    for (let j = Math.floor(cy - r1); j <= Math.ceil(cy + r1); j++) {
      for (let i = Math.floor(cx - r1); i <= Math.ceil(cx + r1); i++) {
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
        if (d >= r0 && d <= r1) this.pix(i, j, c, e);
      }
    }
  };
  Lienzo.prototype.linea = function (x0, y0, x1, y1, c, e) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
    const v = color(c);
    for (let k = 0; k <= n; k++) {
      const t = n ? k / n : 0;
      this.pixC(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), v, e);
    }
  };
  // Multiplica el brillo de una zona (sombras, suciedad, quemaduras)
  Lienzo.prototype.oscurecer = function (x, y, w, h, k) {
    const t = this.t;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (i < 0 || j < 0 || i >= t || j >= t) continue;
      const q = j * t + i;
      if (this.px[q] && !this.em[q]) this.px[q] = escalar(this.px[q], k);
    }
  };
  // Mancha irregular redonda (quemadura, abolladura): k < 1 oscurece, k > 1 aclara
  Lienzo.prototype.mancha = function (cx, cy, r, k, rnd) {
    const t = this.t;
    for (let j = Math.floor(cy - r); j <= cy + r; j++) for (let i = Math.floor(cx - r); i <= cx + r; i++) {
      if (i < 0 || j < 0 || i >= t || j >= t) continue;
      const d = Math.hypot(i - cx, j - cy) / r + (rnd() - 0.5) * 0.35;
      if (d > 1) continue;
      const q = j * t + i;
      if (!this.px[q] || this.em[q]) continue;
      this.px[q] = escalar(this.px[q], 1 + (k - 1) * (1 - d));
    }
  };
  // Variación sutil de brillo para que el metal no se vea plano
  Lienzo.prototype.ruido = function (rnd, amp) {
    for (let k = 0; k < this.px.length; k++) {
      const c = this.px[k];
      if (this.em[k] || c === 0) continue;
      this.px[k] = escalar(c, 1 + (rnd() * 2 - 1) * amp);
    }
  };
  // Texto con la fuente 3×5 (para pantallas)
  Lienzo.prototype.texto = function (str, x, y, c, e) {
    const L = this;
    DM.fuente.dibujarCrudo({ fillRect: function (a, b, w, h) { L.rect(a, b, w, h, c, e); } }, str, x, y, null, 1);
  };
  Lienzo.prototype.copia = function () {
    const L = new Lienzo(this.t);
    L.px.set(this.px); L.em.set(this.em);
    return L;
  };

  // Franjas diagonales de peligro
  function franjas(L, x, y, w, h, c1, c2, ancho, e1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const on = (((i + j) / ancho) | 0) & 1;
      L.pix(i, j, on ? c1 : c2, on && e1);
    }
  }

  // ---------- Colores de la nave (paleta Worodorox) ----------
  const Z = {
    base: '#2a2a3c', luz: '#3a3a52', luz2: '#4a4f63', sombra: '#16151f', negro: '#0b0a12',
    remache: '#7a828d', piso: '#14131c', pisoLinea: '#262536', techo: '#110f1a'
  };

  // ---------- Base común: panel metálico 2×2 con bisel y remaches ----------
  function panelBase(L, rnd) {
    L.grad(0, 0, T, T, '#323247', '#25253a', true);
    for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) {
      const x = px * 32, y = py * 32;
      L.rect(x, y, 32, 1, Z.luz2);
      L.rect(x, y, 1, 32, Z.luz);
      L.rect(x, y + 31, 32, 1, Z.negro);
      L.rect(x + 31, y, 1, 32, Z.sombra);
      [[3, 3], [27, 3], [3, 27], [27, 27]].forEach(function (p) {
        L.rect(x + p[0], y + p[1], 2, 2, Z.remache);
        L.pix(x + p[0], y + p[1], '#b4bac4');
        L.pix(x + p[0] + 1, y + p[1] + 2, Z.negro);
      });
    }
    if (rnd) L.ruido(rnd, 0.05);
  }

  // =====================================================
  // PAREDES
  // =====================================================

  // Pared metálica dañada (3 variantes para que el pasillo no se vea repetido)
  function texDanada(v) {
    const rnd = azar(101 + v * 17);
    const L = new Lienzo();
    panelBase(L, null);
    // Abolladuras (zona oscura con brillo en el borde superior)
    for (let k = 0; k < 3 + v; k++) {
      const cx = 6 + rnd() * 52, cy = 6 + rnd() * 52, r = 3 + rnd() * 5;
      L.mancha(cx, cy, r, 0.62, rnd);
      L.mancha(cx - 1, cy - r * 0.6, r * 0.5, 1.25, rnd);
    }
    // Rayones
    for (let k = 0; k < 6; k++) {
      const x0 = rnd() * 64, y0 = rnd() * 64, l = 5 + rnd() * 12, a = -0.4 + rnd() * 0.8;
      L.linea(x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, '#565b72');
    }
    // Quemadura de una explosión
    L.mancha(v === 1 ? 40 : 18, v === 2 ? 20 : 44, 13, 0.35, rnd);
    L.mancha(v === 1 ? 40 : 18, v === 2 ? 20 : 44, 7, 0.55, rnd);
    if (v === 0) {
      // Panel arrancado: se ven cables (rojo, cian, amarillo) y una chispa emisiva
      L.rect(36, 6, 22, 20, '#07060d');
      L.rect(36, 6, 22, 1, '#3a3a52');
      L.rect(36, 25, 22, 1, '#0b0a12');
      const cables = ['#4a1414', '#0b3a46', '#4f4214', '#2f3245'];
      for (let k = 0; k < 4; k++) {
        for (let x = 37; x < 57; x++) {
          const y = 9 + k * 4 + Math.round(Math.sin((x - 36) / 20 * Math.PI) * (2 + k));   // cables colgando
          L.pix(x, y, cables[k]); L.pix(x, y + 1, escalarHex(cables[k], 0.6));
        }
      }
      L.pix(47, 15, '#ffd34a', 1); L.pix(48, 14, '#ffffff', 1); L.pix(49, 15, '#ffd34a', 1);
      L.pix(46, 13, '#22e4ff', 1);
      // Esquina doblada
      for (let j = 0; j < 7; j++) L.rect(51 + j, 26 + j, 7 - j, 1, '#4a4f63');
    } else if (v === 1) {
      // Fuga de refrigerante: chorreado cian oscuro con escarcha
      for (let k = 0; k < 5; k++) {
        const x = 8 + k * 3 + (rnd() * 2 | 0);
        L.rect(x, 30, 2, 18 + (rnd() * 14 | 0), '#16404c');
      }
      L.trama(6, 28, 18, 4, '#9fe8f5');
      L.pix(10, 29, '#c8fbff', 1);
    } else {
      // Rejilla de ventilación rota y franja de peligro sucia
      for (let i = 0; i < 5; i++) L.rect(10, 38 + i * 3, 18, 1, '#0b0a12');
      L.linea(10, 38, 27, 51, '#565b72');
      franjas(L, 0, 58, 64, 6, '#6b5a1a', '#141319', 4);
      L.oscurecer(0, 58, 64, 6, 0.8);
    }
    // Suciedad en la base
    L.trama(0, 60, 64, 4, '#0b0a12');
    L.ruido(rnd, 0.06);
    return L;
  }
  function escalarHex(h, k) { const c = hexARgb(h); return '#' + [c[0] * k, c[1] * k, c[2] * k].map(function (v) { return ('0' + lim(v).toString(16)).slice(-2); }).join(''); }

  // Panel liso
  function texLisa() {
    const rnd = azar(120);
    const L = new Lienzo();
    panelBase(L, null);
    for (let i = 0; i < 5; i++) L.rect(38, 40 + i * 3, 20, 1, Z.negro);   // rejilla
    L.rect(6, 40, 14, 9, '#1c1b28'); L.rect(7, 41, 12, 1, '#3a3a52');      // placa
    L.texto('B4', 8, 43, '#8d93ad');
    L.trama(0, 60, 64, 4, Z.negro);
    L.ruido(rnd, 0.05);
    return L;
  }

  // Panel con tira de neón cian
  function texNeon() {
    const rnd = azar(130);
    const L = new Lienzo();
    panelBase(L, null);
    L.rect(0, 22, T, 14, Z.negro);
    L.trama(0, 23, T, 2, PAL.cianOsc, 1);
    L.trama(0, 33, T, 2, PAL.cianOsc, 1);
    L.rect(0, 26, T, 6, PAL.cian, 1);
    L.rect(0, 28, T, 2, PAL.cianClaro, 1);
    L.rect(0, 22, T, 1, Z.luz2);
    L.rect(0, 36, T, 1, Z.sombra);
    // Soportes del tubo
    for (let x = 6; x < T; x += 20) { L.rect(x, 24, 3, 10, '#3a3a52'); L.rect(x, 24, 3, 1, '#7a828d'); }
    // Luces de estado
    L.rect(8, 46, 4, 2, PAL.verde, 1); L.rect(14, 46, 4, 2, '#1d3a26');
    L.rect(20, 46, 4, 2, PAL.cian, 1);
    L.ruido(rnd, 0.05);
    return L;
  }

  // Tuberías
  function texTuberias() {
    const rnd = azar(140);
    const L = new Lienzo();
    L.grad(0, 0, T, T, '#14131c', '#0b0a12', true);
    const tubos = [[3, 12, '#4a4f63'], [20, 8, '#5a4f63'], [33, 16, '#4a4f63'], [53, 8, '#3d3a50']];
    tubos.forEach(function (t) {
      const x = t[0], w = t[1];
      for (let i = 0; i < w; i++) {
        const k = 0.35 + 0.85 * Math.sin(Math.PI * (i + 0.5) / w);   // sombreado cilíndrico
        const v = color(t[2], k);
        for (let y = 0; y < T; y++) L.pixC(x + i, y, v);
      }
      L.rect(x + (w >> 2), 0, 1, T, '#8d93ad');                       // brillo
      for (let y = 5; y < T; y += 18) { L.rect(x - 1, y, w + 2, 4, '#2a2a3c'); L.rect(x - 1, y, w + 2, 1, '#7a828d'); }
    });
    // Válvula roja
    L.anillo(41, 40, 3, 6, '#a01818'); L.rect(40, 34, 2, 12, '#ff3b3b');
    L.rect(35, 39, 12, 2, '#ff3b3b');
    // Goteo de condensación y vapor
    L.trama(33, 48, 16, 16, '#1d6b7a');
    L.pix(38, 52, PAL.cianClaro, 1); L.pix(42, 58, PAL.cianClaro, 1);
    L.ruido(rnd, 0.05);
    return L;
  }

  // Pantalla de pared con texto (3 variantes × 2 cuadros: cursor que parpadea)
  const TEXTOS_PANTALLA = [
    ['COMUNICADO', 'BLOQUE 4', 'FALLA CRIO', 'NIVEL 12%', '> EVACUAR'],
    ['SEGURIDAD', 'REG. 0417', 'DRONES: ON', 'NEUTRALIZAR', '> TODOS'],
    ['RUMBO:', 'TEMUKEITOR', 'NAVE SALVA', 'VIDAS: 1', '> HANGAR']
  ];
  function texPantalla(v, cuadro) {
    const rnd = azar(150 + v);
    const L = new Lienzo();
    panelBase(L, null);
    // Marco
    L.rect(3, 5, 58, 46, '#0b0a12');
    L.rect(3, 5, 58, 1, '#4a4f63');
    // Pantalla
    L.grad(5, 7, 54, 42, '#03161c', '#020a0e', true, 1);
    for (let y = 7; y < 49; y += 2) for (let x = 5; x < 59; x++) {   // líneas de barrido
      L.pixC(x, y, color('#041d24'), 1);
    }
    const lineas = TEXTOS_PANTALLA[v];
    // Encabezado invertido
    L.rect(5, 7, 54, 8, PAL.cianOsc, 1);
    L.texto(lineas[0], 7, 9, PAL.cianClaro, 1);
    for (let k = 1; k < lineas.length; k++) {
      const col = k === lineas.length - 1 ? PAL.cian : (k === 2 && v === 1 ? PAL.magenta : '#7fe9f7');
      L.texto(lineas[k], 7, 9 + k * 8, col, 1);
    }
    // Cursor que parpadea
    if (cuadro) L.rect(7 + DM.fuente.ancho(lineas[lineas.length - 1]) + 2, 9 + (lineas.length - 1) * 8, 3, 5, PAL.cian, 1);
    // Reflejo del vidrio
    L.linea(50, 9, 56, 15, '#0f3a44', 1);
    // Botonera inferior
    L.rect(8, 54, 6, 4, PAL.cianOsc); L.rect(16, 54, 6, 4, '#3a3a52'); L.rect(24, 54, 6, 4, '#3a3a52');
    L.rect(44, 54, 12, 4, cuadro ? PAL.rojo : PAL.rojoOsc, cuadro);
    L.ruido(rnd, 0.03);
    return L;
  }

  // Alarma roja giratoria (4 cuadros: el haz da la vuelta)
  function texAlarma(cuadro) {
    const rnd = azar(160);
    const L = new Lienzo();
    panelBase(L, null);
    // Placa de advertencia con franjas rojas
    franjas(L, 6, 44, 52, 8, '#6b1010', '#141319', 4);
    L.rect(14, 45, 36, 6, '#0b0a12');
    L.texto('ALERTA', 20, 46, cuadro % 2 ? PAL.rojo : '#8a2020', cuadro % 2);
    // Base del foco
    L.rect(20, 32, 24, 8, '#2a2a3c'); L.rect(20, 32, 24, 1, '#7a828d'); L.rect(18, 38, 28, 3, '#16151f');
    // Cúpula roja: un lado brilla según el cuadro (haz giratorio)
    const cx = 32, cy = 22, R = 12;
    for (let j = -R; j <= 10; j++) for (let i = -R; i <= R; i++) {
      const d = Math.hypot(i, j);
      if (d > R) continue;
      const ang = Math.atan2(j, i);
      const fase = cuadro * Math.PI / 2;
      const haz = Math.cos(ang - fase);
      const lit = haz > 0.3;
      const c = lit ? (d < 5 ? '#ffd0d0' : PAL.rojo) : (d < 6 ? '#8a2020' : PAL.rojoOsc);
      L.pix(cx + i, cy + j, c, lit);
    }
    L.anillo(cx, cy, 11, 12.5, '#3a3a52');                 // jaula
    L.rect(cx - 12, cy - 1, 24, 1, '#4a4f63');
    L.rect(cx - 1, cy - 12, 2, 22, '#4a4f63');
    L.pix(cx - 4, cy - 6, '#ffffff', 1);                   // brillo
    L.ruido(rnd, 0.04);
    return L;
  }

  // Rejilla de pared (los huecos son transparentes: px = 0)
  function texRejilla() {
    const L = new Lienzo();
    // Marco
    L.rect(0, 0, T, T, '#2a2a3c');
    L.rect(0, 0, T, 2, '#4a4f63'); L.rect(0, 0, 2, T, '#3a3a52');
    L.rect(0, 62, T, 2, '#0b0a12'); L.rect(62, 0, 2, T, '#16151f');
    // Interior: malla diagonal con huecos
    for (let y = 5; y < 59; y++) for (let x = 5; x < 59; x++) {
      const a = (x + y) % 8, b = (x - y + 64) % 8;
      const i = y * T + x;
      if (a < 2 || b < 2) {
        L.px[i] = color(a < 1 || b < 1 ? '#5a6075' : '#3a3d52');
        L.em[i] = 0;
      } else { L.px[i] = 0; L.em[i] = 0; }
    }
    // Barra horizontal de refuerzo
    L.rect(5, 30, 54, 4, '#2a2a3c'); L.rect(5, 30, 54, 1, '#7a828d');
    [[3, 3], [59, 3], [3, 59], [59, 59]].forEach(function (p) { L.rect(p[0], p[1], 2, 2, '#7a828d'); });
    return L;
  }

  // Cápsula criogénica (con escarcha; una variante con el vidrio roto y vacía)
  function texCapsula(rota) {
    const rnd = azar(170 + (rota ? 1 : 0));
    const L = new Lienzo();
    L.grad(0, 0, T, T, '#1c1b2b', '#121119', true);
    L.rect(8, 2, 48, 60, '#3a3d54');
    L.rect(8, 2, 48, 3, '#7a828d');
    L.rect(8, 59, 48, 3, '#16151f');
    // Vidrio
    L.grad(12, 7, 40, 46, '#0e3a44', '#0a2028', true);
    L.trama(12, 7, 40, 46, '#1d6b7a');
    if (!rota) {
      // Silueta del criogenizado dormido
      L.anillo(32, 15, 0, 4, '#0a1a24');
      L.rect(30, 19, 4, 3, '#0a1a24');
      L.rect(21, 22, 22, 5, '#0a1a24');
      L.rect(20, 27, 4, 15, '#0a1a24'); L.rect(40, 27, 4, 15, '#0a1a24');
      L.rect(25, 27, 14, 24, '#0a1a24');
      L.trama(12, 40, 40, 13, '#9fe8f5');                  // escarcha
    } else {
      // Vidrio roto: grietas y vacía
      L.rect(12, 7, 40, 46, '#06141a');
      L.linea(20, 8, 30, 30, '#9fe8f5'); L.linea(30, 30, 44, 22, '#9fe8f5');
      L.linea(30, 30, 26, 52, '#9fe8f5'); L.linea(30, 30, 50, 46, '#c8fbff');
      L.trama(12, 46, 40, 7, '#3b7d8a');
    }
    L.rect(15, 9, 2, 40, '#5fd3e6');                        // reflejo
    // Luces de estado
    L.rect(18, 56, 5, 2, PAL.cian, 1);
    L.rect(29, 56, 5, 2, rota ? PAL.rojoOsc : PAL.cian, !rota);
    L.rect(40, 56, 5, 2, PAL.rojo, 1);
    L.ruido(rnd, 0.04);
    return L;
  }

  // Compuerta con franjas magenta (la hoja que se desliza)
  function texPuerta() {
    const rnd = azar(180);
    const L = new Lienzo();
    L.grad(0, 0, T, T, '#34364a', '#24253a', true);
    // Franjas magenta de peligro arriba y abajo (emisivas a medias)
    franjas(L, 0, 0, T, 9, PAL.magenta, '#18101a', 5, true);
    franjas(L, 0, 55, T, 9, PAL.magenta, '#18101a', 5, true);
    L.rect(0, 9, T, 1, '#0b0a12'); L.rect(0, 54, T, 1, '#0b0a12');
    // Paneles de la hoja
    L.rect(4, 12, 25, 40, '#2d2f42'); L.rect(35, 12, 25, 40, '#2d2f42');
    L.rect(4, 12, 25, 1, '#4a4f63'); L.rect(35, 12, 25, 1, '#4a4f63');
    // Ventanilla con luz magenta del otro lado
    L.rect(9, 16, 15, 10, '#0b0a12');
    L.grad(10, 17, 13, 8, '#7a1466', '#3a0a30', true, 1);
    L.rect(10, 17, 13, 1, '#ffd0f5', 1);
    // Cerradura
    L.rect(40, 26, 15, 14, '#0b0a12');
    L.rect(42, 28, 11, 4, PAL.magenta, 1);
    L.rect(44, 29, 7, 2, PAL.magentaClaro, 1);
    L.rect(42, 35, 3, 3, PAL.cian, 1); L.rect(47, 35, 3, 3, '#3a3a52'); L.rect(52, 35, 1, 3, '#3a3a52');
    // Símbolo de peligro (triángulo)
    for (let j = 0; j < 10; j++) L.rect(16 - (j >> 1), 32 + j, (j >> 1) * 2 + 1, 1, PAL.magenta, 1);
    L.rect(16, 34, 1, 5, '#18101a'); L.pix(16, 40, '#18101a');
    // Rayones y manija
    L.rect(31, 12, 2, 40, '#0b0a12');
    L.rect(6, 46, 20, 2, '#4a4f63');
    L.ruido(rnd, 0.04);
    return L;
  }

  // Marco de la puerta (los costados del hueco)
  function texMarco() {
    const L = new Lienzo();
    L.grad(0, 0, T, T, '#262638', '#1a1a28', false);
    for (let y = 0; y < T; y += 8) { L.rect(0, y, T, 1, '#0b0a12'); L.rect(0, y + 1, T, 1, '#3a3a52'); }
    L.rect(28, 0, 8, T, '#0b0a12');
    L.rect(30, 0, 4, T, PAL.magentaOsc, 1);
    L.rect(31, 0, 2, T, PAL.magenta, 1);
    return L;
  }

  // Pared del ascensor (con botonera y flecha)
  function texAscensor() {
    const rnd = azar(190);
    const L = new Lienzo();
    panelBase(L, null);
    L.rect(4, 4, 56, 56, '#1f2030');
    L.rect(4, 4, 56, 1, '#4a4f63');
    franjas(L, 4, 54, 56, 6, PAL.amarillo, '#141319', 4);
    L.rect(22, 10, 20, 34, '#0b0a12');
    // Flechas arriba / abajo
    for (let j = 0; j < 6; j++) {
      L.rect(32 - j, 14 + j, j * 2 + 1, 1, PAL.cian, 1);
      L.rect(32 - j, 39 - j, j * 2 + 1, 1, PAL.cianOsc, 1);
    }
    L.rect(26, 24, 12, 7, '#06141a');
    L.texto('E', 30, 25, PAL.cianClaro, 1);
    L.texto('ASCENSOR', 16, 47, '#8d93ad');
    L.ruido(rnd, 0.04);
    return L;
  }

  // =====================================================
  // PISOS
  // =====================================================

  // Piso metálico con relieve de diamantes
  function texPiso(v) {
    const rnd = azar(200 + v);
    const L = new Lienzo();
    L.rect(0, 0, T, T, Z.piso);
    for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) {
      const x = px * 32, y = py * 32;
      L.rect(x, y, 32, 1, Z.pisoLinea); L.rect(x, y, 1, 32, Z.pisoLinea);
      L.rect(x, y + 31, 32, 1, '#09080e'); L.rect(x + 31, y, 1, 32, '#09080e');
      for (let j = 3; j < 29; j += 4) for (let i = 3 + ((j >> 2) & 1) * 2; i < 29; i += 4) {
        L.pix(x + i, y + j, '#232233'); L.pix(x + i + 1, y + j, '#0d0c13');
      }
      L.rect(x + 2, y + 2, 1, 1, Z.remache); L.rect(x + 29, y + 29, 1, 1, Z.remache);
    }
    if (v === 1) {
      // Marcas amarillas de pasillo
      L.rect(0, 28, T, 2, '#6b5a1a');
      for (let x = 0; x < T; x += 8) L.rect(x, 28, 4, 2, PAL.amarillo);
      L.oscurecer(0, 28, T, 2, 0.75);
    }
    for (let k = 0; k < 3; k++) L.mancha(rnd() * 64, rnd() * 64, 4 + rnd() * 6, 0.7, rnd);  // manchas de aceite
    L.ruido(rnd, 0.07);
    return L;
  }

  // Piso con fuga de plasma (3 cuadros: el charco late)
  function texPlasma(cuadro) {
    const rnd = azar(210);
    const L = texPiso(0);
    // Grieta
    L.linea(4, 10, 22, 26, '#05040a'); L.linea(22, 26, 40, 30, '#05040a');
    L.linea(40, 30, 60, 50, '#05040a'); L.linea(22, 26, 18, 56, '#05040a');
    // Charco magenta brillante con bordes tramados
    const r0 = 15 + cuadro * 1.5;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const d = Math.hypot(i - 32, (j - 32) * 1.25) + Math.sin(i * 0.7 + j * 0.4) * 2.2;
      if (d < r0 - 6) L.pix(i, j, ((i * 7 + j * 3 + cuadro * 5) % 11 === 0) ? '#ffffff' : (d < 5 ? PAL.magentaClaro : PAL.magenta), 1);
      else if (d < r0 - 2) L.pix(i, j, PAL.magenta, 1);
      else if (d < r0 && ((i + j) & 1)) L.pix(i, j, PAL.magentaOsc, 1);
      else if (d < r0 + 3 && ((i + j + cuadro) % 3 === 0)) L.pix(i, j, '#3a0a30');
    }
    // Burbujas
    const b = azar(220 + cuadro);
    for (let k = 0; k < 5; k++) L.anillo(22 + b() * 20, 22 + b() * 20, 0.5, 1.6, PAL.magentaClaro, 1);
    L.ruido(rnd, 0.02);
    return L;
  }

  // Rejilla de piso (huecos transparentes: ahí se ve el piso de abajo)
  function texRejillaPiso() {
    const L = new Lienzo();
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const i = y * T + x;
      const borde = x < 3 || y < 3 || x > 60 || y > 60;
      const barraX = (x % 8) < 2, barraY = (y % 16) < 2;
      if (borde) L.px[i] = color(x < 2 || y < 2 ? '#4a4f63' : '#2a2a3c');
      else if (barraY) L.px[i] = color((y % 16) === 0 ? '#5a6075' : '#2f3145');
      else if (barraX) L.px[i] = color((x % 8) === 0 ? '#4a4f63' : '#262738');
      else L.px[i] = 0;
    }
    [[1, 1], [61, 1], [1, 61], [61, 61]].forEach(function (p) { L.rect(p[0], p[1], 2, 2, '#8d93ad'); });
    return L;
  }

  // Escalera: peldaños que bajan, con borde amarillo
  function texEscalera() {
    const L = new Lienzo();
    for (let k = 0; k < 8; k++) {
      const y = k * 8, tono = 1 - k * 0.07;
      L.rect(0, y, T, 8, escalarHex('#2a2a3c', tono));
      L.rect(0, y, T, 2, escalarHex('#e8b923', tono * 0.85));
      L.rect(0, y + 7, T, 1, '#0b0a12');
    }
    L.rect(0, 0, 4, T, '#3a3a52'); L.rect(60, 0, 4, T, '#3a3a52');
    // Flecha cian
    for (let j = 0; j < 7; j++) L.rect(32 - j, 24 + j, j * 2 + 1, 1, PAL.cian, 1);
    L.rect(30, 31, 5, 8, PAL.cian, 1);
    return L;
  }

  // Plataforma del ascensor
  function texPlataforma() {
    const L = new Lienzo();
    L.rect(0, 0, T, T, '#1a1a26');
    franjas(L, 0, 0, T, 5, PAL.amarillo, '#141319', 4);
    franjas(L, 0, 59, T, 5, PAL.amarillo, '#141319', 4);
    franjas(L, 0, 0, 5, T, PAL.amarillo, '#141319', 4);
    franjas(L, 59, 0, 5, T, PAL.amarillo, '#141319', 4);
    L.anillo(32, 32, 14, 17, PAL.cianOsc, 1);
    L.anillo(32, 32, 15, 16, PAL.cian, 1);
    for (let j = 0; j < 6; j++) { L.rect(32 - j, 22 + j, j * 2 + 1, 1, PAL.cian, 1); L.rect(32 - j, 42 - j, j * 2 + 1, 1, PAL.cian, 1); }
    return L;
  }

  // =====================================================
  // TECHOS
  // =====================================================
  function texTecho(conLuz, encendida) {
    const rnd = azar(300 + (conLuz ? 1 : 0));
    const L = new Lienzo();
    L.rect(0, 0, T, T, Z.techo);
    L.rect(0, 0, T, 1, '#1f1d2e'); L.rect(0, 0, 1, T, '#1f1d2e');
    L.rect(0, 32, T, 1, '#08070d'); L.rect(32, 0, 1, T, '#08070d');
    for (let k = 0; k < 4; k++) L.rect(6 + k * 14, 50, 8, 2, '#08070d');   // ventilación
    if (conLuz) {
      L.rect(18, 26, 28, 12, '#2a2a3c');
      L.rect(18, 26, 28, 1, '#4a4f63');
      if (encendida) {
        L.rect(20, 28, 24, 8, '#c8c4ee', 1);
        L.rect(22, 30, 20, 4, '#ffffff', 1);
      } else L.rect(20, 28, 24, 8, '#3a3a52');
    }
    L.ruido(rnd, 0.05);
    return L;
  }

  // =====================================================
  // REGISTRO DE TEXTURAS Y ANIMACIÓN
  // =====================================================
  // lista[id] = { cuadros: [Lienzo], fps }   actual[id] = Lienzo del cuadro vigente
  const lista = [];
  const actual = [];
  function registrar(cuadros, fps) {
    lista.push({ cuadros: Array.isArray(cuadros) ? cuadros : [cuadros], fps: fps || 0 });
    actual.push(lista[lista.length - 1].cuadros[0]);
    return lista.length - 1;
  }

  const ID = {
    danada: [registrar(texDanada(0)), registrar(texDanada(1)), registrar(texDanada(2))],
    lisa: registrar(texLisa()),
    neon: registrar(texNeon()),
    tubos: registrar(texTuberias()),
    pantalla: [0, 1, 2].map(function (v) { return registrar([texPantalla(v, 0), texPantalla(v, 1)], 2); }),
    alarma: registrar([texAlarma(0), texAlarma(1), texAlarma(2), texAlarma(3)], 6),
    rejilla: registrar(texRejilla()),
    capsula: [registrar(texCapsula(false)), registrar(texCapsula(true))],
    puerta: registrar(texPuerta()),
    marco: registrar(texMarco()),
    ascensor: registrar(texAscensor()),
    piso: registrar(texPiso(0)),
    pisoMarcas: registrar(texPiso(1)),
    plasma: registrar([texPlasma(0), texPlasma(1), texPlasma(2), texPlasma(1)], 5),
    rejillaPiso: registrar(texRejillaPiso()),
    escalera: registrar(texEscalera()),
    plataforma: registrar(texPlataforma()),
    techo: registrar(texTecho(false)),
    techoLuz: registrar(texTecho(true, true)),
    techoLuzApagada: registrar(texTecho(true, false))
  };


  // =====================================================
  // NUEVAS (fases 2-5): interruptor, terminal, secuencia, aplastador, reactor,
  // estación, criogenia y pisos de trampas
  // =====================================================
  function texInterruptor(on) {
    const L = new Lienzo(); panelBase(L, azar(500));
    L.rect(14, 10, 36, 44, '#0b0a12'); L.rect(14, 10, 36, 1, '#4a4f63');
    franjas(L, 14, 46, 36, 8, PAL.magenta, '#18101a', 4, on);
    L.rect(26, 16, 12, 26, '#1c1b28');
    const y = on ? 18 : 30;
    L.rect(29, y, 6, 10, '#8d93ad'); L.rect(29, y, 6, 2, '#c8cbd6');
    L.rect(18, 14, 4, 4, on ? PAL.magenta : PAL.verde, 1);
    L.texto(on ? 'ON' : 'OFF', 40, 14, on ? PAL.magenta : PAL.verde, 1);
    return L;
  }
  function texTerminal(cuadro) {
    const L = new Lienzo(); panelBase(L, azar(510));
    L.rect(4, 5, 56, 46, '#0b0a12');
    L.grad(6, 7, 52, 42, '#140406', '#08020a', true, 1);
    L.rect(6, 7, 52, 8, PAL.rojoOsc, 1); L.texto('SEGURIDAD', 9, 9, '#ffd0d0', 1);
    L.texto('CONFIDENCIAL', 8, 19, PAL.magenta, 1);
    for (let k = 0; k < 4; k++) L.rect(8, 28 + k * 5, 20 + ((k * 13) % 26), 2, '#8a2a3a', 1);
    if (cuadro) L.rect(8, 46, 4, 2, PAL.rojo, 1);
    L.rect(10, 54, 44, 4, '#2a2a3c'); for (let k = 0; k < 8; k++) L.rect(12 + k * 5, 55, 3, 2, '#4a4f63');
    return L;
  }
  function texSecuencia() {
    const L = texPuerta().copia();
    franjas(L, 0, 0, T, 9, PAL.cian, '#0b1a20', 5, true);
    franjas(L, 0, 55, T, 9, PAL.cian, '#0b1a20', 5, true);
    L.rect(42, 28, 11, 4, PAL.cian, 1);
    return L;
  }
  function texAplastador() {
    const L = new Lienzo();
    L.rect(0, 0, T, T, '#2d3140');
    for (let y = 0; y < T; y += 8) { L.rect(0, y, T, 2, '#1a1c26'); L.rect(0, y + 2, T, 1, '#4a4f63'); }
    franjas(L, 0, 54, T, 10, PAL.rojo, '#15151a', 4, true);
    L.rect(24, 8, 16, 36, '#4a4f63'); L.rect(28, 8, 8, 36, '#8a93a8');
    L.ruido(azar(520), 0.05);
    return L;
  }
  function texReactor(cuadro) {
    const L = new Lienzo();
    L.rect(0, 0, T, T, '#0b0a12');
    for (let x = 4; x < T; x += 12) L.rect(x, 0, 4, T, '#2a2a3c');
    for (let y = 0; y < T; y++) {
      const k = 0.5 + 0.5 * Math.sin(y * 0.3 + cuadro * 1.6);
      for (let x = 8; x < T; x += 12) for (let i = 0; i < 8; i++) L.pix(x + i, y, k > 0.7 ? PAL.cianClaro : k > 0.35 ? PAL.cian : PAL.cianOsc, 1);
    }
    L.rect(0, 0, T, 4, '#3a3a52'); L.rect(0, 60, T, 4, '#3a3a52');
    return L;
  }
  function texEstacion() {
    const L = texPiso(0).copia();
    L.anillo(32, 32, 18, 22, PAL.verde, 1); L.anillo(32, 32, 14, 15, '#1d6b3a', 1);
    L.rect(30, 20, 4, 24, PAL.verde, 1); L.rect(20, 30, 24, 4, PAL.verde, 1);
    return L;
  }
  function texCrio() {
    const L = texPiso(0).copia(); const rnd = azar(530);
    L.trama(0, 0, T, T, '#3b7d8a');
    for (let k = 0; k < 30; k++) L.pix(rnd() * 64, rnd() * 64, '#c8fbff');
    return L;
  }
  // Piso electrificado: 0 apagado, 1 aviso (chispas), 2 descarga
  function texElectrico(estado) {
    const L = new Lienzo(); const rnd = azar(540 + estado);
    L.rect(0, 0, T, T, '#0d1218');
    for (let i = 0; i < T; i += 8) { L.rect(i, 0, 1, T, '#1e2a36'); L.rect(0, i, T, 1, '#1e2a36'); }
    franjas(L, 0, 0, T, 3, PAL.magenta, '#141319', 4, estado > 0); franjas(L, 0, 61, T, 3, PAL.magenta, '#141319', 4, estado > 0);
    if (estado >= 1) {
      const n = estado === 1 ? 10 : 70;
      for (let k = 0; k < n; k++) {
        let x = rnd() * T, y = rnd() * T;
        for (let s = 0; s < (estado === 2 ? 7 : 3); s++) { L.pix(x, y, estado === 2 ? '#ffffff' : PAL.cian, 1); x += rnd() * 4 - 2; y += rnd() * 4 - 2; }
      }
      if (estado === 2) L.trama(0, 0, T, T, PAL.magenta, 1);
    }
    return L;
  }
  function texGas(estado) {
    const L = texPiso(0).copia(); const rnd = azar(550 + estado);
    for (let k = 0; k < 4; k++) L.rect(8 + k * 14, 30, 6, 4, '#1d3a26');
    if (estado === 1) for (let k = 0; k < 14; k++) L.anillo(rnd() * T, rnd() * T, 1, 2, PAL.verde, 1);
    if (estado === 2) { L.trama(0, 0, T, T, '#3bd16a', 1); for (let k = 0; k < 20; k++) L.anillo(rnd() * T, rnd() * T, 0, 3, '#a8ffbf', 1); }
    return L;
  }
  function texVentila(dir) {
    const L = texPiso(0).copia();
    L.rect(4, 4, 56, 56, '#101018');
    for (let k = 0; k < 7; k++) L.rect(6, 8 + k * 7, 52, 2, '#22202f');
    for (let k = 0; k < 2; k++) for (let j = 0; j < 8; j++) {
      const a = 20 + k * 18 + j;
      [[a - j * 2 + 8, 24 + j], [a - j * 2 + 8, 40 - j]].forEach(function (pt) {
        let x = pt[0], y = pt[1];
        for (let r = 0; r < dir; r++) { const t = x; x = T - 1 - y; y = t; }
        L.rect(x, y, 2, 2, PAL.cianClaro, 1);
      });
    }
    return L;
  }
  function texBaldosa(simbolo) {
    const L = new Lienzo();
    L.rect(0, 0, T, T, '#0f0c1a'); L.rect(2, 2, 60, 60, '#1a1530'); L.rect(2, 2, 60, 1, '#2d2650');
    const c = '#7ff3ff';
    if (simbolo === 0) { L.rect(18, 18, 28, 3, c, 1); L.rect(18, 43, 28, 3, c, 1); L.rect(18, 18, 3, 28, c, 1); L.rect(43, 18, 3, 28, c, 1); }
    else if (simbolo === 1) L.anillo(32, 32, 11, 14, c, 1);
    else for (let j = 0; j < 26; j++) {
      const m = j >> 1, y = 19 + j;
      if (j >= 24) L.rect(32 - m, y, 2 * m + 1, 1, c, 1);
      else { L.rect(32 - m - 1, y, 2, 1, c, 1); L.rect(32 + m, y, 2, 1, c, 1); }
    }
    return L;
  }
  function texAvisoAplastador() {
    const L = new Lienzo();
    for (let x = 0; x < T; x++) for (let y = 0; y < T; y++) L.pix(x, y, (((x + y) >> 3) & 1) ? PAL.rojo : '#1a0a0a', ((x + y) >> 3) & 1);
    return L;
  }
  function texBaseFoco() {
    const L = texPiso(0).copia();
    L.anillo(32, 32, 20, 24, PAL.magentaOsc, 1);
    franjas(L, 10, 10, 44, 4, PAL.magenta, '#141319', 4, true);
    return L;
  }

  const ID2 = {
    interruptor: [registrar(texInterruptor(false)), registrar(texInterruptor(true))],
    terminal: registrar([texTerminal(0), texTerminal(1)], 2),
    secuencia: registrar(texSecuencia()),
    aplastador: registrar(texAplastador()),
    reactor: registrar([texReactor(0), texReactor(1), texReactor(2), texReactor(3)], 6),
    estacion: registrar(texEstacion()),
    crio: registrar(texCrio()),
    electrico: [registrar(texElectrico(0)), registrar([texElectrico(1), texElectrico(1)], 1), registrar([texElectrico(2), (function () { const L = texElectrico(2); L.ruido(azar(9), 0.2); return L; })()], 14)],
    gas: [registrar(texGas(0)), registrar(texGas(1)), registrar([texGas(2), texGas(2)], 3)],
    ventila: [registrar(texVentila(0)), registrar(texVentila(1)), registrar(texVentila(2)), registrar(texVentila(3))],
    baldosa: [registrar(texBaldosa(0)), registrar(texBaldosa(1)), registrar(texBaldosa(2))],
    avisoAplastador: registrar(texAvisoAplastador()),
    baseFoco: registrar(texBaseFoco())
  };
  Object.assign(ID, ID2);

  // Variante "estable" por casilla (para que no se repita la misma textura en fila)
  function hash(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }

  // Id de textura de una pared según su tipo y su posición
  function idPared(tipo, x, y) {
    const P = DM.PARED;
    switch (tipo) {
      case P.DANADA: return ID.danada[hash(x, y) % 3];
      case P.NEON: return ID.neon;
      case P.TUBOS: return ID.tubos;
      case P.PANTALLA: return ID.pantalla[hash(x, y) % 3];
      case P.ALARMA: return ID.alarma;
      case P.REJILLA: return ID.rejilla;
      case P.CAPSULA: return ID.capsula[hash(x, y) % 4 === 0 ? 1 : 0];
      case P.PUERTA: return ID.puerta;
      case P.ASCENSOR: return ID.ascensor;
      case P.LISA: return ID.lisa;
      case P.INTERRUPTOR: return ID.interruptor[0];
      case P.TERMINAL: return ID.terminal;
      case P.SECUENCIA: return ID.secuencia;
      case P.APLASTADOR: return ID.aplastador;
      case P.REACTOR: return ID.reactor;
      default: return ID.danada[0];
    }
  }
  function idSuelo(tipo) {
    const S = DM.SUELO;
    switch (tipo) {
      case S.VARIANTE: return ID.pisoMarcas;
      case S.PLASMA: return ID.plasma;
      case S.REJILLA: return ID.rejillaPiso;
      case S.ESCALERA: return ID.escalera;
      case S.ASCENSOR: return ID.plataforma;
      case S.ESTACION: return ID.estacion;
      case S.CRIO: return ID.crio;
      default: return ID.piso;
    }
  }

  // Elige el cuadro de cada textura animada según el reloj de la partida.
  // La alarma usa la misma fase que la luz roja (DM.luces.fases) para ir sincronizada.
  function actualizar(t, fases) {
    for (let i = 0; i < lista.length; i++) {
      const e = lista[i];
      if (e.cuadros.length < 2) continue;
      const n = e.cuadros.length;
      let k = ((Math.floor(t * e.fps) % n) + n) % n;
      if (i === ID.alarma && fases) k = Math.floor(fases.giroAlarma * 4) % 4;
      actual[i] = e.cuadros[k];
    }
    // Lámpara que parpadea: el motor la cambia por la apagada cuando corresponde
  }

  DM.texturas = {
    Lienzo: Lienzo,
    ID: ID,
    lista: lista,
    actual: actual,
    idPared: idPared,
    idSuelo: idSuelo,
    actualizar: actualizar,
    // utilidades para otros módulos (sprites, HUD)
    azar: azar,
    empacar: empacar,
    color: color,
    escalar: escalar,
    hexARgb: hexARgb
  };
})();
