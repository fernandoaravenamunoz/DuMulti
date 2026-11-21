// =====================================================
// Raycaster de varios pisos (480×234 + barra del HUD)
//
// Base: raycaster DDA de Worodorox 3073 (paredes por columnas, piso y techo
// por filas, sprites con z-buffer, niebla y píxeles emisivos).
// Lo nuevo en DuMulti:
//  - Iluminación por mapa de luz con colores (neón, alarmas, plasma) y tramado Bayer.
//  - Puertas corredizas tipo Wolfenstein: hoja delgada al centro de la casilla
//    que se desliza de lado, con marco en los costados.
//  - Rejillas de pared transparentes: el rayo sigue de largo y la rejilla se
//    dibuja encima de lo que hay detrás (hasta 3 capas por columna).
//  - Rejillas de piso: en los huecos se dibuja el piso de ABAJO como un segundo
//    plano a una planta de profundidad (con su luz, niebla y sprites).
//    Desde abajo pasa lo mismo hacia arriba: se ve el techo del piso superior.
//    Costo casi nulo: solo se calcula en los píxeles del hueco.
//    Límite conocido: a través de la rejilla no se dibujan las paredes del otro piso.
//
// Todo se dibuja en un búfer de enteros (Uint32Array) y se copia de una vez.
// =====================================================
(function () {
  'use strict';
  const C = DM.config;
  const A = C.ANCHO, VH = C.VISTA_ALTO, T = C.TEX, TM = T - 1, S = C.SPR, SM = S - 1;
  const P = C.PROYECCION, LR = C.LUZ_RES, NIEBLA = C.NIEBLA_DIST, NEM = C.NIEBLA_EMISIVO;
  const TX = DM.texturas, ID = TX.ID;
  const SU = DM.SUELO;

  // Color de la niebla (la oscuridad de la nave)
  const nf = TX.hexARgb(DM.paleta.fondo);
  const NR = nf[0], NG = nf[1], NB = nf[2];
  const FONDO = TX.empacar(NR, NG, NB);
  // Color de la "tapa" de una pared vista desde arriba a través de una rejilla
  const TAPA = TX.color('#16151f');

  // Tramado Bayer 4×4 (desplaza un poco la luz según el píxel: efecto retro de luz tramada)
  const BAYER = new Int8Array(16);
  [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].forEach(function (v, i) {
    BAYER[i] = Math.round((v / 15 - 0.5) * 2 * C.TRAMADO_LUZ);
  });

  // Propiedades de las paredes en tablas (más rápido que buscar en objetos)
  const ES_PUERTA = new Uint8Array(256), ES_TRANSP = new Uint8Array(256);
  for (const k in DM.PAREDES) {
    if (DM.PAREDES[k].puerta) ES_PUERTA[k] = 1;
    if (DM.PAREDES[k].transparente) ES_TRANSP[k] = 1;
  }

  let ctxDestino = null, imagen = null, buf = null;
  const zbuf = new Float32Array(A);        // distancia de la pared sólida por columna
  const zRej = new Float32Array(A);        // distancia de la rejilla más cercana por columna
  const mascRej = new Uint8Array(A * VH);  // 1 = píxel tapado por una barra de rejilla
  const mascOtro = new Uint8Array(A * VH); // 1 = se ve el piso de abajo, 2 = el de arriba
  let render3d = [];                       // datos de dibujo por piso (texturas por casilla)

  // Capas transparentes de la columna actual (rejillas)
  const MAX_CAPAS = 3;
  const capaTex = new Int32Array(MAX_CAPAS), capaDist = new Float32Array(MAX_CAPAS);
  const capaTx = new Int32Array(MAX_CAPAS), capaLado = new Uint8Array(MAX_CAPAS), capaLuz = new Int32Array(MAX_CAPAS);

  function iniciar(ctx) {
    ctxDestino = ctx;
    imagen = ctx.createImageData(A, VH);
    buf = new Uint32Array(imagen.data.buffer);
  }

  // Prepara las texturas de cada casilla de cada piso (una vez por mapa)
  function preparar(mapa) {
    render3d = mapa.pisos.map(function (p, n) {
      const t = p.ancho * p.alto;
      const pared = new Uint8Array(t), suelo = new Uint8Array(t), techo = new Uint8Array(t);
      const parpadean = [];
      const arriba = mapa.pisos[n + 1];
      for (let y = 0; y < p.alto; y++) for (let x = 0; x < p.ancho; x++) {
        const i = p.indice(x, y);
        pared[i] = p.paredes[i] ? TX.idPared(p.paredes[i], x, y) : 0;
        suelo[i] = TX.idSuelo(p.suelo[i]);
        techo[i] = ID.techo;
        // El techo bajo una rejilla del piso de arriba es la misma rejilla
        if (arriba && !arriba.paredes[i] && arriba.suelo[i] === SU.REJILLA) techo[i] = ID.rejillaPiso;
      }
      for (const l of p.lamparas) {
        const i = p.indice(l.x, l.y);
        if (techo[i] === ID.techo) techo[i] = ID.techoLuz;
        if (l.parpadea) parpadean.push(i);
      }
      return { pared: pared, suelo: suelo, techo: techo, parpadean: parpadean, visto: new Uint8Array(t) };
    });
  }

  // Texturas que cambian con el estado del mundo: trampas, interruptores, aplastadores
  function actualizarDinamico(mundo) {
    const mapa = mundo.mapa;
    for (const t of mundo.trampas) {
      const R = render3d[t.piso], p = mapa.pisos[t.piso], i = p.indice(t.x, t.y);
      let id = ID.piso;
      switch (t.car) {
        case 'x': id = ID.electrico[t.fase]; break;
        case 'g': id = ID.gas[t.fase]; break;
        case 'k': id = t.fase === 1 ? ID.avisoAplastador : ID.piso; R.pared[i] = p.paredes[i] ? ID.aplastador : 0; break;
        case '>': id = ID.ventila[0]; break;
        case 'v': id = ID.ventila[1]; break;
        case '<': id = ID.ventila[2]; break;
        case '^': id = ID.ventila[3]; break;
        case '1': case '2': case '3': id = ID.baldosa[+t.car - 1]; break;
        case 'f': id = ID.baseFoco; break;
        default: id = ID.piso;
      }
      R.suelo[i] = id;
    }
    mapa.interruptores.forEach(function (s, k) {
      const R = render3d[s.piso], p = mapa.pisos[s.piso];
      const st = mundo.interruptores[k];
      const on = mundo.modo === 'coop' ? !(st.mantenido > mundo.tiempo) : st.activoHasta > mundo.tiempo;
      R.pared[p.indice(s.x, s.y)] = ID.interruptor[on ? 1 : 0];
    });
    // Campaña: consolas encendidas y zona de salida activa
    if (!mapa.consolas.length && !mapa.salidas.length) return;
    const st = mundo.estadoRed || (mundo.reglas && mundo.reglas.estado ? mundo.reglas.estado() : null);
    const camp = st && st.modo === 'campana';
    mapa.consolas.forEach(function (c, k) {
      const on = camp && st.consolas && st.consolas[k] >= 1;
      render3d[c.piso].pared[mapa.pisos[c.piso].indice(c.x, c.y)] = ID.consola[on ? 1 : 0];
    });
    const activa = camp && st.salida;
    for (const s of mapa.salidas) render3d[s.piso].suelo[mapa.pisos[s.piso].indice(s.x, s.y)] = ID.salida[activa ? 1 : 0];
  }

  // ---------- Sombreado: luz de color (escala 64) + niebla (k, nr, ng, nb en escala 256) ----------
  function tono(c, lr, lg, lb, k, nr, ng, nb) {
    let r = ((c & 255) * lr) >> 6, g = (((c >>> 8) & 255) * lg) >> 6, b = (((c >>> 16) & 255) * lb) >> 6;
    if (r > 255) r = 255;
    if (g > 255) g = 255;
    if (b > 255) b = 255;
    return 0xff000000 | (((b * k + nb) >> 8) << 16) | (((g * k + ng) >> 8) << 8) | ((r * k + nr) >> 8);
  }

  // =====================================================
  // render(cam, mundo, sprites)
  //   cam: { x, y, ang, pitch (−1..1), camZ, piso }
  //   sprites: [{ x, y, z, piso, tex (Lienzo 64), alto }]
  // =====================================================
  function render(cam, mundo, sprites) {
    const mapa = mundo.mapa;
    const piso = mapa.pisos[cam.piso];
    const R = render3d[cam.piso];
    const pisoAb = mapa.pisos[cam.piso - 1], Rab = render3d[cam.piso - 1];
    const pisoAr = mapa.pisos[cam.piso + 1], Rar = render3d[cam.piso + 1];
    const LZ = DM.luces.datos[cam.piso];
    const LZab = DM.luces.datos[cam.piso - 1], LZar = DM.luces.datos[cam.piso + 1];
    const act = TX.actual;
    const an = piso.ancho, al = piso.alto;

    // Lámparas que parpadean: cambian su textura según la fase actual
    const enc = DM.luces.fases.lamparaEncendida;
    for (const Rp of render3d) for (const i of Rp.parpadean) Rp.techo[i] = enc ? ID.techoLuz : ID.techoLuzApagada;

    const dirX = Math.cos(cam.ang), dirY = Math.sin(cam.ang);
    const plX = -dirY * C.PLANO, plY = dirX * C.PLANO;
    const hor = Math.round(VH / 2 + cam.pitch * C.PITCH_MAX);
    const camZ = cam.camZ, cx = cam.x, cy = cam.y;

    const mitad = DM.raycaster.calidad === 'media';
    mascOtro.fill(0);
    mascRej.fill(0);
    zRej.fill(1e9);

    // ---------- 1) Piso y techo, fila por fila ----------
    const rx0 = dirX - plX, ry0 = dirY - plY;
    const rx1 = dirX + plX, ry1 = dirY + plY;
    for (let y = 0; y < VH; y++) {
      const p = y - hor;
      const fila = y * A;
      if (p === 0) { buf.fill(FONDO, fila, fila + A); continue; }
      const esPiso = p > 0;
      const dist = esPiso ? (camZ * P) / p : ((1 - camZ) * P) / -p;
      const t = dist / NIEBLA;
      if (t >= 1) { buf.fill(FONDO, fila, fila + A); continue; }
      // Niebla de esta fila (enteros en escala 256)
      const k = ((1 - t) * 256) | 0, nr = (NR * t * 256) | 0, ng = (NG * t * 256) | 0, nb = (NB * t * 256) | 0;
      const te = t * NEM;
      const ke = ((1 - te) * 256) | 0, nre = (NR * te * 256) | 0, nge = (NG * te * 256) | 0, nbe = (NB * te * 256) | 0;
      const sx = dist * (rx1 - rx0) / A, sy = dist * (ry1 - ry0) / A;
      let fx = cx + dist * rx0, fy = cy + dist * ry0;
      const texIds = esPiso ? R.suelo : R.techo;
      // Otro piso visto por los huecos de la rejilla
      const otro = esPiso ? pisoAb : pisoAr, Rot = esPiso ? Rab : Rar, LZot = esPiso ? LZab : LZar;
      const q = esPiso ? (camZ + 1) / camZ : (2 - camZ) / (1 - camZ);
      const bfila = (y & 3) << 2;
      for (let x = 0; x < A; x++, fx += sx, fy += sy) {
        // Calidad media: el piso y el techo se calculan cada 2 píxeles (casi la mitad del trabajo)
        if (mitad && (x & 1)) { buf[fila + x] = buf[fila + x - 1]; mascOtro[fila + x] = mascOtro[fila + x - 1]; continue; }
        const mx = fx | 0, my = fy | 0;
        if (mx < 0 || my < 0 || mx >= an || my >= al || fx < 0 || fy < 0) { buf[fila + x] = FONDO; continue; }
        const ic = my * an + mx;
        const tex = act[texIds[ic]];
        const ti = ((((fy - my) * T) | 0) & TM) * T + ((((fx - mx) * T) | 0) & TM);
        const c = tex.px[ti];
        if (c === 0) {
          // Hueco de rejilla: se ve el otro piso, una planta más lejos
          if (!otro) { buf[fila + x] = FONDO; continue; }
          const gx = cx + (fx - cx) * q, gy = cy + (fy - cy) * q;
          const t2 = t * q;
          if (t2 >= 1) { buf[fila + x] = FONDO; mascOtro[fila + x] = esPiso ? 1 : 2; continue; }
          const k2 = ((1 - t2) * 256) | 0, nr2 = (NR * t2 * 256) | 0, ng2 = (NG * t2 * 256) | 0, nb2 = (NB * t2 * 256) | 0;
          const mx2 = Math.floor(gx), my2 = Math.floor(gy);
          let col = TAPA, lr = 64, lg = 64, lb = 64, emis = 0;
          if (mx2 >= 0 && my2 >= 0 && mx2 < otro.ancho && my2 < otro.alto) {
            const ic2 = my2 * otro.ancho + mx2;
            if (!otro.paredes[ic2]) {
              const tex2 = act[esPiso ? Rot.suelo[ic2] : Rot.techo[ic2]];
              const ti2 = ((((gy - my2) * T) | 0) & TM) * T + ((((gx - mx2) * T) | 0) & TM);
              col = tex2.px[ti2] || TAPA;
              emis = tex2.em[ti2];
            }
            const li2 = ((gy * LR) | 0) * LZot.LW + ((gx * LR) | 0);
            lr = LZot.luzR[li2]; lg = LZot.luzG[li2]; lb = LZot.luzB[li2];
          }
          buf[fila + x] = emis ? tono(col, 64, 64, 64, k2, nr2, ng2, nb2) : tono(col, lr, lg, lb, k2, nr2, ng2, nb2);
          mascOtro[fila + x] = esPiso ? 1 : 2;
          continue;
        }
        if (tex.em[ti]) { buf[fila + x] = tono(c, 64, 64, 64, ke, nre, nge, nbe); continue; }
        const li = ((fy * LR) | 0) * LZ.LW + ((fx * LR) | 0);
        const bay = BAYER[bfila | (x & 3)];
        buf[fila + x] = tono(c, LZ.luzR[li] + bay, LZ.luzG[li] + bay, LZ.luzB[li] + bay, k, nr, ng, nb);
      }
    }

    // ---------- 2) Sprites del otro piso (solo se ven por los huecos de las rejillas) ----------
    if (sprites && sprites.length) dibujarSprites(cam, sprites, dirX, dirY, plX, plY, hor, true);

    // ---------- 3) Paredes, columna por columna ----------
    const paredes = piso.paredes, idPared = R.pared, visto = R.visto;
    visto[Math.floor(cy) * an + Math.floor(cx)] = 1;
    for (let x = 0; x < A; x++) {
      const camX = 2 * x / A - 1;
      const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mx = Math.floor(cx), my = Math.floor(cy);
      const ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
      let pasoX, pasoY, sdx, sdy;
      if (rdx < 0) { pasoX = -1; sdx = (cx - mx) * ddx; } else { pasoX = 1; sdx = (mx + 1 - cx) * ddx; }
      if (rdy < 0) { pasoY = -1; sdy = (cy - my) * ddy; } else { pasoY = 1; sdy = (my + 1 - cy) * ddy; }

      let lado = 0, n = 0, capas = 0, prevPuerta = false;
      let finTex = -1, finDist = 1e9, finTx = 0, finLado = 0;
      while (n++ < 64) {
        if (sdx < sdy) { sdx += ddx; mx += pasoX; lado = 0; }
        else { sdy += ddy; my += pasoY; lado = 1; }
        if (mx < 0 || my < 0 || mx >= an || my >= al) break;
        const ic = my * an + mx;
        visto[ic] = 1;                       // mapa automático: casillas que el jugador ya vio
        const tipo = paredes[ic];
        if (!tipo) { prevPuerta = false; continue; }

        if (ES_PUERTA[tipo]) {
          // Hoja de la puerta: plano al centro de la casilla
          const pu = mapa.puertas[piso.puerta[ic]];
          const ap = pu ? pu.apertura : 0;
          let d = -1, frac = 0;
          if (pu && pu.eje === 'y') {        // plano x = mx + 0,5
            d = (mx + 0.5 - cx) / rdx;
            const hy = cy + d * rdy;
            if (d > 0 && Math.floor(hy) === my) frac = hy - my; else d = -1;
          } else {                          // plano y = my + 0,5
            d = (my + 0.5 - cy) / rdy;
            const hx = cx + d * rdx;
            if (d > 0 && Math.floor(hx) === mx) frac = hx - mx; else d = -1;
          }
          if (d > 0 && frac >= ap) {
            finTex = idPared[ic]; finDist = d;
            finTx = (((frac - ap) * T) | 0) & TM;
            finLado = pu && pu.eje === 'y' ? 0 : 1;
            break;
          }
          prevPuerta = true;
          continue;
        }

        const perp = lado === 0 ? sdx - ddx : sdy - ddy;
        let paredX = lado === 0 ? cy + perp * rdy : cx + perp * rdx;
        paredX -= Math.floor(paredX);
        let tx = (paredX * T) | 0;
        if (lado === 0 && rdx < 0) tx = TM - tx;
        if (lado === 1 && rdy > 0) tx = TM - tx;

        if (ES_TRANSP[tipo]) {
          if (capas < MAX_CAPAS) {
            capaTex[capas] = idPared[ic]; capaDist[capas] = perp; capaTx[capas] = tx; capaLado[capas] = lado;
            capaLuz[capas] = indiceLuz(LZ, cx + rdx * perp * 0.98, cy + rdy * perp * 0.98, rdx, rdy);
            capas++;
          }
          prevPuerta = false;
          continue;
        }
        // Pared sólida (si venimos del hueco de una puerta, es el marco)
        finTex = prevPuerta ? ID.marco : idPared[ic];
        finDist = Math.max(0.0001, perp); finTx = tx; finLado = lado;
        break;
      }

      zbuf[x] = finDist;
      if (finTex >= 0) {
        const li = indiceLuz(LZ, cx + rdx * finDist, cy + rdy * finDist, rdx, rdy);
        columna(x, act[finTex], finDist, finTx, finLado, li, LZ, hor, camZ, false);
      }
      // Rejillas: de la más lejana a la más cercana
      for (let c = capas - 1; c >= 0; c--) {
        columna(x, act[capaTex[c]], capaDist[c], capaTx[c], capaLado[c], capaLuz[c], LZ, hor, camZ, true);
        if (capaDist[c] < zRej[x]) zRej[x] = capaDist[c];
      }
    }

    // ---------- 4) Sprites de este piso ----------
    if (sprites && sprites.length) dibujarSprites(cam, sprites, dirX, dirY, plX, plY, hor, false);

    ctxDestino.putImageData(imagen, 0, 0);
  }

  // Índice del mapa de luz justo delante de una pared (un poco hacia la cámara)
  function indiceLuz(LZ, wx, wy, rdx, rdy) {
    const l = Math.hypot(rdx, rdy);
    wx -= rdx / l * 0.08; wy -= rdy / l * 0.08;
    let sx = (wx * LR) | 0, sy = (wy * LR) | 0;
    if (sx < 0) sx = 0; else if (sx >= LZ.LW) sx = LZ.LW - 1;
    if (sy < 0) sy = 0; else if (sy >= LZ.LH) sy = LZ.LH - 1;
    return sy * LZ.LW + sx;
  }

  // Dibuja una columna de pared (o de rejilla, si transparente = true)
  function columna(x, tw, perp, tx, lado, li, LZ, hor, camZ, transparente) {
    const arriba = hor - (1 - camZ) * P / perp;
    const abajo = hor + camZ * P / perp;
    const y0 = Math.max(0, Math.ceil(arriba));
    const y1 = Math.min(VH, Math.ceil(abajo));
    if (y0 >= y1) return;
    const t = Math.min(1, perp / NIEBLA);
    const k = ((1 - t) * 256) | 0, nr = (NR * t * 256) | 0, ng = (NG * t * 256) | 0, nb = (NB * t * 256) | 0;
    const te = t * NEM;
    const ke = ((1 - te) * 256) | 0, nre = (NR * te * 256) | 0, nge = (NG * te * 256) | 0, nbe = (NB * te * 256) | 0;
    // Las caras norte/sur un poco más oscuras para dar volumen
    const ls = lado === 1 ? 52 : 64;
    const lr = (LZ.luzR[li] * ls) >> 6, lg = (LZ.luzG[li] * ls) >> 6, lb = (LZ.luzB[li] * ls) >> 6;
    const paso = T / (abajo - arriba);
    let texPos = (y0 - arriba) * paso;
    const px = tw.px, em = tw.em;
    const bcol = x & 3;
    for (let y = y0; y < y1; y++) {
      const i = ((texPos | 0) & TM) * T + tx;
      texPos += paso;
      const c = px[i];
      if (c === 0) continue;              // hueco de la rejilla
      const o = y * A + x;
      if (em[i]) buf[o] = tono(c, 64, 64, 64, ke, nre, nge, nbe);
      else {
        const bay = BAYER[((y & 3) << 2) | bcol];
        buf[o] = tono(c, lr + bay, lg + bay, lb + bay, k, nr, ng, nb);
      }
      if (transparente) mascRej[o] = 1;
    }
  }

  // ---------- Sprites (de lejos a cerca) ----------
  // otroPiso = true: solo los de los pisos vecinos, y solo en los píxeles de los huecos
  const ordenados = [];
  function dibujarSprites(cam, sprites, dirX, dirY, plX, plY, hor, otroPiso) {
    const invDet = 1 / (plX * dirY - dirX * plY);
    ordenados.length = 0;
    for (const s of sprites) {
      const dp = s.piso - cam.piso;
      if (otroPiso ? (dp !== 1 && dp !== -1) : dp !== 0) continue;
      const dx = s.x - cam.x, dy = s.y - cam.y;
      s._d = dx * dx + dy * dy;
      ordenados.push(s);
    }
    ordenados.sort(function (a, b) { return b._d - a._d; });
    for (const s of ordenados) {
      const dp = s.piso - cam.piso;
      const sx = s.x - cam.x, sy = s.y - cam.y;
      const tX = invDet * (dirY * sx - dirX * sy);
      const tY = invDet * (-plY * sx + plX * sy);
      if (tY <= 0.12) continue;
      const tam = s.alto * P / tY;
      if (tam < 1) continue;
      const centroX = (A / 2) * (1 + tX / tY);
      const base = hor + (cam.camZ - (s.z || 0) - dp) * P / tY;
      const top = base - tam;
      const izq = centroX - tam / 2;
      const xa = Math.max(0, Math.ceil(izq)), xb = Math.min(A, Math.ceil(izq + tam));
      const ya = Math.max(0, Math.ceil(top)), yb = Math.min(VH, Math.ceil(base));
      if (xa >= xb || ya >= yb) continue;
      const t = Math.min(1, tY * (otroPiso ? 1.15 : 1) / NIEBLA);
      if (t >= 1) continue;
      const k = ((1 - t) * 256) | 0, nr = (NR * t * 256) | 0, ng = (NG * t * 256) | 0, nb = (NB * t * 256) | 0;
      const te = t * NEM;
      const ke = ((1 - te) * 256) | 0, nre = (NR * te * 256) | 0, nge = (NG * te * 256) | 0, nbe = (NB * te * 256) | 0;
      const luz = DM.luces.en(s.piso, s.x, s.y);
      const lr = luz[0], lg = luz[1], lb = luz[2];
      const tex = s.tex, kk = S / tam;
      const mascara = otroPiso ? (dp < 0 ? 1 : 2) : 0;
      const siempre = !!s.siempre, brillo = !!s.brillo;
      for (let x = xa; x < xb; x++) {
        const tapado = !otroPiso && tY >= zbuf[x];
        if (tapado && !siempre) continue;
        const tcol = ((x - izq) * kk) | 0;
        if (tcol < 0 || tcol > SM) continue;
        const detrasRejilla = !otroPiso && tY > zRej[x];
        for (let y = ya; y < yb; y++) {
          const o = y * A + x;
          if (otroPiso && mascOtro[o] !== mascara) continue;
          if (tapado && ((x + y) & 1)) continue;          // visto a través de la pared: tramado
          if (detrasRejilla && mascRej[o] && !siempre) continue;
          const tfil = ((y - top) * kk) | 0;
          if (tfil < 0 || tfil > SM) continue;
          const i = tfil * S + tcol;
          const c = tex.px[i];
          if (c === 0) continue;
          buf[o] = (tex.em[i] || brillo || tapado) ? tono(c, 64, 64, 64, ke, nre, nge, nbe) : tono(c, lr, lg, lb, k, nr, ng, nb);
        }
      }
    }
  }

  DM.raycaster = {
    calidad: 'alta',        // 'alta' | 'media' (main.js la baja sola si faltan cuadros)
    iniciar: iniciar,
    preparar: preparar,
    actualizarDinamico: actualizarDinamico,
    visto: function (n) { return render3d[n] ? render3d[n].visto : null; },
    render: render,
    zbuf: zbuf
  };
})();
