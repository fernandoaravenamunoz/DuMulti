// =====================================================
// Iluminación de neón por zonas (nuevo en DuMulti)
//
// Cada piso tiene un "mapa de luz" de 4×4 celdas de luz por casilla.
// Al cargar el mapa se calcula cuánta luz llega a cada celda desde cada fuente
// (tiras de neón, pantallas, alarmas, cápsulas, fugas de plasma, lámparas),
// con caída por distancia y sombras (las paredes tapan la luz).
//
// La luz se guarda separada en 4 CANALES para poder animarla sin recalcular:
//   0 fija | 1 alarma (pulsa en rojo) | 2 plasma (late lento) | 3 lámpara que parpadea
// En cada cuadro se mezclan los canales con su intensidad actual → luzR/G/B
// (enteros: 64 = luz normal). El raycaster solo lee esos números.
// =====================================================
(function () {
  'use strict';
  const C = DM.config, P = DM.PARED, S = DM.SUELO;
  const LR = C.LUZ_RES;

  function rgb(h, k) { const c = DM.texturas.hexARgb(h); return [c[0] / 255 * k, c[1] / 255 * k, c[2] / 255 * k]; }

  // Qué emite cada tipo de pared: color, intensidad, alcance (casillas) y canal
  const EMISORES = {};
  EMISORES[P.NEON] = { col: rgb('#22e4ff', 1.7), radio: 4.2, canal: 0 };
  EMISORES[P.PANTALLA] = { col: rgb('#22e4ff', 1.1), radio: 3.0, canal: 0 };
  EMISORES[P.ALARMA] = { col: rgb('#ff3b3b', 2.8), radio: 6.0, canal: 1 };
  EMISORES[P.CAPSULA] = { col: rgb('#9fe8f5', 0.9), radio: 2.8, canal: 0 };
  EMISORES[P.PUERTA] = { col: rgb('#ff2bd6', 0.8), radio: 2.2, canal: 0 };
  EMISORES[P.ASCENSOR] = { col: rgb('#22e4ff', 0.45), radio: 1.8, canal: 0 };
  EMISORES[P.TERMINAL] = { col: rgb('#ff3b3b', 0.7), radio: 2.4, canal: 0 };
  EMISORES[P.REACTOR] = { col: rgb('#22e4ff', 1.6), radio: 4.5, canal: 2 };
  EMISORES[P.INTERRUPTOR] = { col: rgb('#ff2bd6', 0.5), radio: 1.6, canal: 0 };
  const PLASMA = { col: rgb('#ff2bd6', 1.9), radio: 3.4, canal: 2 };
  const ESTACION = { col: rgb('#4dff8a', 0.9), radio: 2.4, canal: 0 };
  const LAMPARA = { col: rgb('#e6e3ff', 1.45), radio: 5.2, canal: 0 };

  const datos = [];   // un objeto por piso
  const fases = { alarma: 0, giroAlarma: 0, plasma: 1, parpadeo: 1, lamparaEncendida: true };

  // ¿La pared de esta casilla tapa la luz?
  function tapa(piso, x, y) {
    const t = piso.pared(x, y);
    if (!t) return false;
    const info = DM.PAREDES[t];
    return !(info.transparente || info.puerta);
  }

  // Línea de visión entre dos puntos (muestreo cada 0,2 casillas)
  function visible(piso, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 0.2);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (tapa(piso, Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t))) return false;
    }
    return true;
  }

  // Lista de fuentes de luz de un piso
  function fuentesDe(piso) {
    const lista = [];
    const vec = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < piso.alto; y++) for (let x = 0; x < piso.ancho; x++) {
      const i = piso.indice(x, y);
      const t = piso.paredes[i];
      if (t && EMISORES[t]) {
        // Una fuente por cada cara de la pared que da a un espacio libre
        for (const v of vec) {
          if (piso.pared(x + v[0], y + v[1]) !== 0) continue;
          lista.push({ x: x + 0.5 + v[0] * 0.56, y: y + 0.5 + v[1] * 0.56, e: EMISORES[t] });
        }
      } else if (!t && piso.suelo[i] === S.PLASMA) {
        lista.push({ x: x + 0.5, y: y + 0.5, e: PLASMA });
      } else if (!t && piso.suelo[i] === S.ESTACION) {
        lista.push({ x: x + 0.5, y: y + 0.5, e: ESTACION });
      }
    }
    for (const l of piso.lamparas) {
      lista.push({ x: l.x + 0.5, y: l.y + 0.5, e: l.parpadea ? { col: LAMPARA.col, radio: LAMPARA.radio, canal: 3 } : LAMPARA });
    }
    return lista;
  }

  // Calcula los canales de luz de todos los pisos (una vez, al cargar el mapa)
  let pisos = [];
  function preparar(mapa) {
    datos.length = 0;
    pisos = mapa.pisos;
    for (const piso of mapa.pisos) {
      const LW = piso.ancho * LR, LH = piso.alto * LR, n = LW * LH;
      const canales = [0, 1, 2, 3].map(function () { return new Float32Array(n * 3); });
      const fuentes = fuentesDe(piso);
      for (let sy = 0; sy < LH; sy++) for (let sx = 0; sx < LW; sx++) {
        const wx = (sx + 0.5) / LR, wy = (sy + 0.5) / LR;
        if (tapa(piso, Math.floor(wx), Math.floor(wy))) continue;
        const i = (sy * LW + sx) * 3;
        for (const f of fuentes) {
          const d = Math.hypot(wx - f.x, wy - f.y);
          if (d >= f.e.radio) continue;
          if (!visible(piso, f.x, f.y, wx, wy)) continue;
          const k = (1 - d / f.e.radio);
          const a = k * k;
          const ch = canales[f.e.canal];
          ch[i] += f.e.col[0] * a; ch[i + 1] += f.e.col[1] * a; ch[i + 2] += f.e.col[2] * a;
        }
      }
      datos.push({
        LW: LW, LH: LH, canales: canales,
        luzR: new Uint16Array(n), luzG: new Uint16Array(n), luzB: new Uint16Array(n)
      });
    }
    actualizar(0);
  }

  // Ruido determinista para el parpadeo (igual en todas las pantallas: depende del reloj)
  function ruido(k) { const s = Math.sin(k * 127.1) * 43758.5453; return s - Math.floor(s); }

  // Mezcla los canales con la intensidad de este instante
  function actualizar(t) {
    fases.giroAlarma = (t * 0.85) % 1;
    const c = 0.5 + 0.5 * Math.cos(fases.giroAlarma * Math.PI * 2);
    fases.alarma = 0.15 + 0.85 * c * c;
    fases.plasma = 0.72 + 0.28 * Math.sin(t * 2.3);
    const r = ruido(Math.floor(t * 9));
    fases.lamparaEncendida = r > 0.22;
    fases.parpadeo = fases.lamparaEncendida ? (r > 0.9 ? 0.6 : 1) : 0.08;

    const amb = C.LUZ_AMBIENTE, max = C.LUZ_MAX * 64;
    const f1 = fases.alarma, f2 = fases.plasma, f3 = fases.parpadeo;
    for (const d of datos) {
      const c0 = d.canales[0], c1 = d.canales[1], c2 = d.canales[2], c3 = d.canales[3];
      const n = d.luzR.length;
      for (let k = 0, i = 0; k < n; k++, i += 3) {
        const R = (amb * 0.95 + c0[i] + c1[i] * f1 + c2[i] * f2 + c3[i] * f3) * 64;
        const G = (amb * 0.82 + c0[i + 1] + c1[i + 1] * f1 + c2[i + 1] * f2 + c3[i + 1] * f3) * 64;
        const B = (amb * 1.3 + c0[i + 2] + c1[i + 2] * f1 + c2[i + 2] * f2 + c3[i + 2] * f3) * 64;
        d.luzR[k] = R > max ? max : R;
        d.luzG[k] = G > max ? max : G;
        d.luzB[k] = B > max ? max : B;
      }
    }
    // Luces dinámicas de este cuadro (disparos, explosiones, bengalas, trampas activas…)
    for (const l of dinamicas) {
      const d = datos[l.piso]; if (!d) continue;
      const r = l.r * LR, cx = l.x * LR, cy = l.y * LR;
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(d.LW - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(d.LH - 1, Math.ceil(cy + r));
      const mapaPiso = pisos[l.piso];
      for (let sy = y0; sy <= y1; sy++) for (let sx = x0; sx <= x1; sx++) {
        const dd = Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) / r;
        if (dd >= 1) continue;
        if (mapaPiso && tapa(mapaPiso, (sx / LR) | 0, (sy / LR) | 0)) continue;
        const a = (1 - dd) * (1 - dd) * l.k * 64, i = sy * d.LW + sx;
        d.luzR[i] = Math.min(max, d.luzR[i] + l.col[0] * a);
        d.luzG[i] = Math.min(max, d.luzG[i] + l.col[1] * a);
        d.luzB[i] = Math.min(max, d.luzB[i] + l.col[2] * a);
      }
    }
    dinamicas.length = 0;
  }
  // Agrega una luz que dura solo este cuadro (h = color hex, k = intensidad, r = radio en casillas)
  const dinamicas = [];
  const cacheCol = {};
  function agregar(piso, x, y, r, h, k) {
    const col = cacheCol[h] || (cacheCol[h] = rgb(h, 1));
    dinamicas.push({ piso: piso, x: x, y: y, r: r, col: col, k: k });
  }

  // Luz en un punto del mundo (para sprites): devuelve [r, g, b] en escala 64
  const salida = [64, 64, 64];
  function en(nPiso, x, y) {
    const d = datos[nPiso];
    if (!d) { salida[0] = salida[1] = salida[2] = 64; return salida; }
    let sx = Math.floor(x * LR), sy = Math.floor(y * LR);
    sx = sx < 0 ? 0 : sx >= d.LW ? d.LW - 1 : sx;
    sy = sy < 0 ? 0 : sy >= d.LH ? d.LH - 1 : sy;
    const i = sy * d.LW + sx;
    salida[0] = d.luzR[i]; salida[1] = d.luzG[i]; salida[2] = d.luzB[i];
    return salida;
  }

  DM.luces = { preparar: preparar, actualizar: actualizar, agregar: agregar, datos: datos, fases: fases, en: en };
})();
