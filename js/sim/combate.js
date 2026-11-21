// =====================================================
// Combate (simulación pura): armas, aciertos, proyectiles, lanzables y explosiones
//
// Un ataque acierta solo si cumple tres condiciones:
//  1. LÍNEA DE VISIÓN: rayo DDA por la grilla. Paredes y puertas cerradas lo detienen;
//     rejillas y ventanas lo dejan pasar. Si el rayo baja por una rejilla del piso,
//     sigue en el piso de abajo (y al revés hacia arriba): se puede disparar entre pisos.
//  2. ALCANCE: cada arma tiene un máximo y algunas pierden daño con la distancia.
//  3. CAJA DE IMPACTO: el rayo debe pasar por el cilindro del objetivo, a la altura correcta
//     (la mirada arriba/abajo cuenta). La asistencia de puntería agranda un poco el alto.
//
// Objetivos (los entrega mundo.objetivos(piso)): jugadores, enemigos, barriles y torretas.
// Todos tienen: clase, piso, x, y, z (base), alto, radio.
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;
  const C = DM.config;
  const ARMAS = DM.ARMAS, LZ = DM.LANZABLES;

  // Pendiente vertical de la mirada (cuánto sube el rayo por casilla recorrida),
  // igual a lo que muestra la pantalla: el centro de la mira.
  function pendiente(pitch) { return pitch * C.PITCH_MAX / C.PROYECCION; }

  // ---------- Rayo de bala con paso entre pisos y rebotes ----------
  // Devuelve { objetivo, t, piso, x, y, z, tramos: [[piso, x0, y0, z0, x1, y1, z1], ...] }
  function rayo(mundo, o, opc) {
    const mapa = mundo.mapa;
    let piso = o.piso, px = o.x, py = o.y, pz = o.z;
    let dx = Math.cos(o.ang), dy = Math.sin(o.ang);
    const pend = o.pend;
    let resto = opc.alcance, rebotes = opc.rebotes || 0;
    const tramos = [];
    const asist = opc.asistencia || 0;
    const excluir = opc.excluir;
    let mejor = null;

    for (let vuelta = 0; vuelta < 3; vuelta++) {
      // DDA por la grilla desde (px, py) en dirección (dx, dy)
      let mx = Math.floor(px), my = Math.floor(py);
      const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9));
      const pasoX = dx < 0 ? -1 : 1, pasoY = dy < 0 ? -1 : 1;
      let sdx = dx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx;
      let sdy = dy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
      let tIni = 0, tFin = resto, zOff = 0, lado = 0, golpePared = false;
      let tramoPiso = piso, tramoT0 = 0;
      const segs = [];   // tramos rectos por piso: [piso, t0, t1, zOff]
      let t = 0;
      for (let n = 0; n < 80; n++) {
        let tSig;
        if (sdx < sdy) { tSig = sdx; } else { tSig = sdy; }
        if (tSig > resto) tSig = resto;
        // ¿Cruza el piso o el techo dentro de esta casilla?
        const zA = pz + zOff + pend * t, zB = pz + zOff + pend * tSig;
        let cambio = false;
        if (pend < 0 && zB < 0 && zA >= 0) {
          const tc = t + (0 - zA) / pend;
          const p = mapa.pisos[piso];
          const ic = p.dentro(mx, my) ? p.indice(mx, my) : -1;
          if (ic >= 0 && p.suelo[ic] === DM.SUELO.REJILLA && mapa.pisos[piso - 1]) {
            segs.push([piso, tramoT0, tc, zOff]); piso--; zOff += 1; tramoT0 = tc; cambio = true;
          } else { tFin = tc; break; }
        } else if (pend > 0 && zB > 1 && zA <= 1) {
          const tc = t + (1 - zA) / pend;
          const arriba = mapa.pisos[piso + 1];
          const ic = arriba && arriba.dentro(mx, my) ? arriba.indice(mx, my) : -1;
          if (ic >= 0 && !arriba.paredes[ic] && arriba.suelo[ic] === DM.SUELO.REJILLA) {
            segs.push([piso, tramoT0, tc, zOff]); piso++; zOff -= 1; tramoT0 = tc; cambio = true;
          } else { tFin = tc; break; }
        }
        if (cambio) continue;
        if (tSig >= resto) { tFin = resto; break; }
        // Pasar a la casilla siguiente
        if (sdx < sdy) { sdx += ddx; mx += pasoX; lado = 0; } else { sdy += ddy; my += pasoY; lado = 1; }
        t = tSig;
        if (!mapa.transparente(piso, mx, my)) { tFin = t; golpePared = true; break; }
      }
      segs.push([piso, tramoT0, tFin, zOff]);

      // Probar objetivos en cada tramo
      for (const s of segs) {
        const lista = mundo.objetivos(s[0]);
        for (const ob of lista) {
          if (ob === excluir || ob.muerto) continue;
          const pos = opc.rebobinar ? mundo.posHistorica(ob, opc.rebobinar) : ob;
          // Intersección rayo-círculo en el plano
          const fx = px - pos.x, fy = py - pos.y;
          const b = fx * dx + fy * dy, c = fx * fx + fy * fy - ob.radio * ob.radio;
          const disc = b * b - c;
          if (disc < 0) continue;
          let th = -b - Math.sqrt(disc);
          if (th < s[1]) th = -b + Math.sqrt(disc) > s[1] ? s[1] : -1;
          if (th < 0 || th > s[2]) continue;
          const zr = pz + s[3] + pend * th;
          const z0 = ob.z - asist, z1 = ob.z + ob.alto + asist;
          if (zr < z0 || zr > z1) continue;
          if (!mejor || th + (opc.recorrido || 0) < mejor.t) {
            mejor = { objetivo: ob, t: th + (opc.recorrido || 0), piso: s[0], x: px + dx * th, y: py + dy * th, z: zr };
          }
        }
        const xa = px + dx * s[1], ya = py + dy * s[1], xb = px + dx * s[2], yb = py + dy * s[2];
        tramos.push([s[0], xa, ya, pz + s[3] + pend * s[1], xb, yb, pz + s[3] + pend * s[2]]);
      }
      if (mejor) break;
      // Rebote en una pared metálica (láser de dron)
      if (golpePared && rebotes > 0) {
        const tp = mapa.pisos[piso].pared(mx, my);
        if (!DM.PAREDES[tp] || !DM.PAREDES[tp].metal) break;
        rebotes--;
        const hx = px + dx * tFin, hy = py + dy * tFin;
        resto -= tFin; opc.recorrido = (opc.recorrido || 0) + tFin;
        pz = pz + zOff + pend * tFin; px = hx - dx * 0.01; py = hy - dy * 0.01;
        if (lado === 0) dx = -dx; else dy = -dy;
        mundo.evento({ t: 'chispa', piso: piso, x: hx, y: hy, z: pz });
        continue;
      }
      if (!mejor) {
        const hx = px + dx * tFin, hy = py + dy * tFin;
        mejor = { objetivo: null, t: tFin, piso: piso, x: hx, y: hy, z: pz + zOff + pend * tFin, pared: golpePared };
      }
      break;
    }
    mejor.tramos = tramos;
    return mejor;
  }

  // Daño con caída por distancia
  function conCaida(arma, d) {
    if (!arma.caida || d <= arma.caida) return arma.danio;
    const k = Math.max(0.35, 1 - (d - arma.caida) / (arma.alcance - arma.caida) * 0.65);
    return arma.danio * k;
  }

  // Aplica el daño del arma más sus efectos (aturdir, ralentizar…)
  function golpear(mundo, ob, danio, arma, atacante, tipo, dirX, dirY) {
    let d = danio;
    if (ob.clase === 'enemigo' && DM.ENEMIGOS[ob.tipo].robot) {
      if (arma.robots) d *= arma.robots;
      if (atacante && atacante.personaje === 'gargolfo') d *= 1.5;
    }
    if (ob.clase === 'enemigo' && arma.noZombis && !DM.ENEMIGOS[ob.tipo].robot) return;
    const aplicado = mundo.danar(ob, d, { atacante: atacante, arma: arma, tipo: tipo });
    if (!aplicado) return;
    const e = ob.ef;
    if (e) {
      if (arma.aturdir) e.aturdido = Math.max(e.aturdido, arma.aturdir);
      if (arma.ralentizar) e.ralentizado = Math.max(e.ralentizado, arma.ralentizar);
      if (arma.congelar) e.congelado = Math.max(e.congelado, arma.congelar);
      if (arma.paralizar) e.paralizado = Math.max(e.paralizado, arma.paralizar);
    }
    if (arma.empuje && dirX !== undefined && ob.golpeX !== undefined) { ob.golpeX += dirX * arma.empuje; ob.golpeY += dirY * arma.empuje; }
  }

  // ---------- Origen del disparo de un jugador ----------
  function origen(j) { return { piso: j.piso, x: j.x, y: j.y, z: j.camZ - 0.04, ang: j.ang, pend: pendiente(j.pitch) }; }

  // ---------- Acciones de armas de un jugador en un paso ----------
  function accionesJugador(mundo, j, cmd, dt) {
    if (!j.vivo() || j.transicion) { j.cargaT = 0; return; }
    const conf = mundo.conf;
    // Cambio de arma
    if (cmd.arma) {
      let nueva = j.arma;
      if (cmd.arma >= 1 && cmd.arma <= 4) nueva = cmd.arma;
      else {
        const paso = cmd.arma === 5 ? 1 : -1;
        for (let k = 0; k < 4; k++) { nueva = ((nueva - 1 + paso + 4) % 4) + 1; if (nueva !== 4 || j.pesada) break; }
      }
      if (nueva === 4 && !j.pesada) nueva = j.arma;
      if (nueva !== j.arma) { j.arma = nueva; j.recarga = Math.max(j.recarga, 0.25); j.cargaT = 0; j.recargando = 0; mundo.evento({ t: 'cambioArma', id: j.id }); }
    }
    if (cmd.cambiaLanzable) {
      const L = DM.ORDEN_LANZABLES, i = L.indexOf(j.lanzSel);
      for (let k = 1; k <= L.length; k++) { const s = L[(i + k) % L.length]; if (j.lanzables[s] > 0) { j.lanzSel = s; break; } }
    }
    // Recarga del arma a distancia propia
    const idArma = j.armaActual();
    const arma = ARMAS[idArma];
    if (j.recargando > 0) {
      j.recargando -= dt;
      if (j.recargando <= 0) { j.cargador[idArma] = arma.cargador; mundo.evento({ t: 'recargado', id: j.id }); }
    } else if (arma.cargador && (cmd.recargar && j.cargador[idArma] < arma.cargador || j.cargador[idArma] <= 0)) {
      j.recargando = arma.recarga; j.rafaga = 0;
      mundo.evento({ t: 'recarga', id: j.id });
    }
    // Lanzables
    if (cmd.lanzar && j.ef.paralizado <= 0 && j.ef.aturdido <= 0) {
      if (j.lanzables[j.lanzSel] <= 0) accionesJugador.siguienteLanzable(j);
      if (j.lanzables[j.lanzSel] > 0 && mundo.permiteLanzable(j.lanzSel)) {
        j.lanzables[j.lanzSel]--;
        lanzar(mundo, j, j.lanzSel);
        if (j.lanzables[j.lanzSel] <= 0) accionesJugador.siguienteLanzable(j);
      }
    }
    if (j.ef.paralizado > 0 || j.ef.aturdido > 0) { j.cargaT = 0; return; }

    // Ráfaga en curso (tenedores)
    if (j.rafaga > 0) {
      j.tRafaga -= dt;
      if (j.tRafaga <= 0 && j.cargador[idArma] > 0) {
        j.rafaga--; j.tRafaga = 0.07; j.cargador[idArma]--;
        dispararProyectil(mundo, j, arma, idArma, origen(j));
      }
      return;
    }
    // Armas con carga: al apretar empiezan a cargar y disparan solas al terminar
    if (arma.tipo === 'carga' || arma.tipo === 'suprema') {
      if (j.cargaT > 0) {
        j.cargaT += dt;
        if (j.cargaT >= arma.carga) { j.cargaT = 0; disparar(mundo, j, arma, idArma); }
        return;
      }
      if (cmd.disparo && j.recarga <= 0 && j.pesada && j.pesada.municion > 0) {
        j.cargaT = 0.0001; mundo.evento({ t: 'carga', id: j.id, arma: idArma });
      }
      return;
    }
    if (!cmd.disparo || j.recarga > 0 || j.recargando > 0) return;
    if (arma.cargador && j.cargador[idArma] <= 0) return;
    disparar(mundo, j, arma, idArma);
  }
  accionesJugador.siguienteLanzable = function (j) {
    for (const s of DM.ORDEN_LANZABLES) if (j.lanzables[s] > 0) { j.lanzSel = s; return; }
  };

  // Gasta munición y ejecuta el ataque
  function disparar(mundo, j, arma, idArma) {
    j.recarga = arma.cadencia;
    j.ataque = 0.001;
    if (arma.cargador) j.cargador[idArma]--;
    if (arma.pesada && j.pesada) {
      j.pesada.municion -= arma.tipo === 'cono' ? 1 : 1;
      if (j.pesada.municion <= 0) {
        // Sin munición: vuelve al arma propia
        j.pesada = null; j.arma = 3;
        mundo.evento({ t: 'sinMunicion', id: j.id });
      }
    }
    mundo.evento({ t: 'disparo', id: j.id, arma: idArma, piso: j.piso, x: j.x, y: j.y });
    const o = origen(j);
    const asist = mundo.asistencia(j);
    const reb = mundo.rebobinarPara(j);
    switch (arma.tipo) {
      case 'melee': cuerpoACuerpo(mundo, j, arma, o); break;
      case 'hitscan': {
        const n = arma.perdigones || 1;
        for (let k = 0; k < n; k++) {
          const oo = Object.assign({}, o);
          if (arma.dispersion) { oo.ang += (mundo.azar() * 2 - 1) * arma.dispersion; oo.pend += (mundo.azar() * 2 - 1) * arma.dispersion * 0.6; }
          const r = rayo(mundo, oo, { alcance: arma.alcance, excluir: j, asistencia: asist, rebobinar: reb });
          if (r.objetivo) golpear(mundo, r.objetivo, conCaida(arma, r.t), arma, j, 'bala', Math.cos(oo.ang), Math.sin(oo.ang));
          if (k < 2) mundo.evento({ t: 'traza', arma: idArma, tramos: redondearTramos(r.tramos), golpe: !!r.objetivo });
        }
        break;
      }
      case 'proyectil':
        dispararProyectil(mundo, j, arma, idArma, o);
        if (arma.rafaga) { j.rafaga = arma.rafaga - 1; j.tRafaga = 0.07; }
        break;
      case 'cono': cono(mundo, j, arma, o); j.disparando = 0.15; break;
      case 'carga': {
        const r = rayo(mundo, o, { alcance: arma.alcance, excluir: j, asistencia: asist, rebotes: arma.rebotes, rebobinar: reb });
        if (r.objetivo) golpear(mundo, r.objetivo, arma.danio, arma, j, 'bala');
        mundo.evento({ t: 'traza', arma: idArma, tramos: redondearTramos(r.tramos), golpe: !!r.objetivo, laser: true });
        break;
      }
      case 'suprema': suprema(mundo, j, arma); break;
    }
  }

  function redondearTramos(tr) {
    return tr.map(function (s) { return s.map(function (v, i) { return i === 0 ? v : Math.round(v * 100) / 100; }); });
  }

  // ---------- Cuerpo a cuerpo: cono de ±25° ----------
  function cuerpoACuerpo(mundo, j, arma, o) {
    let mejor = null, md = 1e9;
    for (const ob of mundo.objetivos(j.piso)) {
      if (ob === j || ob.muerto) continue;
      const dx = ob.x - j.x, dy = ob.y - j.y, d = Math.hypot(dx, dy);
      if (d > arma.alcance + ob.radio) continue;
      let da = Math.atan2(dy, dx) - j.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > 0.44 + Math.atan2(ob.radio, Math.max(0.1, d))) continue;
      if (ob.z > 0.9 || ob.z + ob.alto < 0.15) continue;   // fuera de alcance vertical
      if (!mundo.mapa.lineaVision(j.piso, j.x, j.y, ob.x, ob.y)) continue;
      if (d < md) { md = d; mejor = ob; }
    }
    if (mejor) {
      const d = Math.max(0.01, md);
      golpear(mundo, mejor, arma.danio, arma, j, 'melee', (mejor.x - j.x) / d, (mejor.y - j.y) / d);
      mundo.evento({ t: 'impacto', piso: j.piso, x: mejor.x, y: mejor.y, z: 0.5 });
      return;
    }
    // Gargolfo derriba rejillas con su golpe
    if (j.personaje === 'gargolfo' && arma === ARMAS[j.propias[0]]) {
      const g = mundo.rayoPared(j.piso, j.x, j.y, Math.cos(j.ang), Math.sin(j.ang), arma.alcance + 0.3);
      if (g.tipo === DM.PARED.REJILLA) mundo.romperRejilla(j.piso, g.mx, g.my);
    }
  }

  // ---------- Cono continuo (soplete, rociador) ----------
  function cono(mundo, j, arma, o) {
    if (arma.calor) mundo.agregarCalor(j.piso, j.x + Math.cos(j.ang) * 1.2, j.y + Math.sin(j.ang) * 1.2, 0.6, 6);
    for (const ob of mundo.objetivos(j.piso)) {
      if (ob === j || ob.muerto) continue;
      const dx = ob.x - j.x, dy = ob.y - j.y, d = Math.hypot(dx, dy);
      if (d > arma.alcance + ob.radio) continue;
      let da = Math.atan2(dy, dx) - j.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > 0.38) continue;
      if (!mundo.mapa.lineaVision(j.piso, j.x, j.y, ob.x, ob.y)) continue;
      golpear(mundo, ob, arma.danio, arma, j, 'bala', dx / Math.max(0.1, d), dy / Math.max(0.1, d));
    }
  }

  // ---------- Desintegrador: destruye todo lo visible al frente ----------
  function suprema(mundo, j, arma) {
    let n = 0;
    for (let piso = 0; piso < mundo.mapa.pisos.length; piso++) {
      if (piso !== j.piso) continue;
      for (const ob of mundo.objetivos(piso).slice()) {
        if (ob === j || ob.muerto) continue;
        const dx = ob.x - j.x, dy = ob.y - j.y, d = Math.hypot(dx, dy);
        if (d > arma.alcance) continue;
        let da = Math.atan2(dy, dx) - j.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > 0.6) continue;
        if (!mundo.mapa.lineaVision(j.piso, j.x, j.y, ob.x, ob.y)) continue;
        golpear(mundo, ob, arma.danio, arma, j, 'suprema');
        n++;
      }
    }
    mundo.evento({ t: 'desintegrar', id: j.id, piso: j.piso, x: j.x, y: j.y, ang: j.ang, n: n });
  }

  // ---------- Proyectiles ----------
  function dispararProyectil(mundo, j, arma, idArma, o) {
    const disp = arma.dispersion || 0.01;
    const a = o.ang + (mundo.azar() * 2 - 1) * disp;
    const v = arma.vel;
    const cp = Math.cos(Math.atan(o.pend));
    mundo.proyectiles.push({
      id: mundo.nuevoId(), clase: 'proyectil', bala: arma.bala, arma: idArma, dueno: j.id,
      piso: o.piso, x: o.x + Math.cos(a) * 0.3, y: o.y + Math.sin(a) * 0.3, z: o.z,
      vx: Math.cos(a) * v * cp, vy: Math.sin(a) * v * cp, vz: Math.sin(Math.atan(o.pend)) * v,
      vida: arma.alcance / v, rebotes: arma.rebotes || 0, atraviesa: arma.atraviesa || 0,
      gravedad: arma.gravedad ? arma.gravedad * 9 : 0, golpeados: []
    });
  }

  // Proyectil de un enemigo (guardián)
  function proyectilEnemigo(mundo, e, objetivo, vel, danio, area) {
    const dx = objetivo.x - e.x, dy = objetivo.y - e.y, d = Math.max(0.1, Math.hypot(dx, dy));
    const zo = e.z + 0.6, zt = objetivo.z + objetivo.alto * 0.5;
    mundo.proyectiles.push({
      id: mundo.nuevoId(), clase: 'proyectil', bala: 'orbe', arma: null, dueno: e.id, enemigo: true,
      danio: danio, area: area, piso: e.piso, x: e.x + dx / d * 0.5, y: e.y + dy / d * 0.5, z: zo,
      vx: dx / d * vel, vy: dy / d * vel, vz: (zt - zo) / d * vel, vida: 6, rebotes: 0, atraviesa: 0, gravedad: 0, golpeados: []
    });
  }

  // ---------- Lanzables ----------
  function lanzar(mundo, j, tipo) {
    const L = LZ[tipo];
    const pend = pendiente(j.pitch) + 0.35;
    const a = Math.atan(pend), v = L.vel;
    mundo.proyectiles.push({
      id: mundo.nuevoId(), clase: 'proyectil', bala: tipo, lanzable: tipo, dueno: j.id,
      piso: j.piso, x: j.x + Math.cos(j.ang) * 0.3, y: j.y + Math.sin(j.ang) * 0.3, z: j.camZ - 0.1,
      vx: Math.cos(j.ang) * Math.cos(a) * v + j.vx * 0.5, vy: Math.sin(j.ang) * Math.cos(a) * v + j.vy * 0.5, vz: Math.sin(a) * v,
      vida: L.fusible || 30, rebotes: 99, atraviesa: 0, gravedad: 12, golpeados: [], quieto: false
    });
    mundo.evento({ t: 'lanzar', id: j.id, tipo: tipo });
  }

  // Avanza todos los proyectiles
  function pasoProyectiles(mundo, dt) {
    const mapa = mundo.mapa;
    const lista = mundo.proyectiles;
    for (let i = lista.length - 1; i >= 0; i--) {
      const p = lista[i];
      p.vida -= dt;
      let morir = false;
      if (!p.quieto) {
        const pasos = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 0.15));
        const h = dt / pasos;
        for (let s = 0; s < pasos && !morir; s++) {
          p.vz -= p.gravedad * h;
          const nx = p.x + p.vx * h, ny = p.y + p.vy * h;
          let nz = p.z + p.vz * h;
          const cxa = Math.floor(p.x), cya = Math.floor(p.y), cxb = Math.floor(nx), cyb = Math.floor(ny);
          // Paredes (las rejillas dejan pasar)
          if (!mapa.transparente(p.piso, cxb, cyb) || (p.lanzable && mapa.pisos[p.piso].bloqueo[mapa.pisos[p.piso].indice(Math.max(0, cxb), Math.max(0, cyb))])) {
            if (p.rebotes > 0) {
              p.rebotes--;
              if (cxb !== cxa && mapa.transparente(p.piso, cxa, cyb)) p.vx = -p.vx * (p.lanzable ? 0.5 : 1);
              else if (cyb !== cya && mapa.transparente(p.piso, cxb, cya)) p.vy = -p.vy * (p.lanzable ? 0.5 : 1);
              else { p.vx = -p.vx * 0.5; p.vy = -p.vy * 0.5; }
              if (p.lanzable) mundo.evento({ t: 'rebote', piso: p.piso, x: p.x, y: p.y });
              continue;
            }
            morir = true; break;
          }
          p.x = nx; p.y = ny;
          // Piso y techo (por las rejillas del piso se cae al piso de abajo)
          if (nz < 0) {
            const pp = mapa.pisos[p.piso], ic = pp.indice(cxb, cyb);
            if (pp.suelo[ic] === DM.SUELO.REJILLA && mapa.pisos[p.piso - 1] && !p.lanzable) { p.piso--; nz += 1; }
            else if (pp.suelo[ic] === DM.SUELO.REJILLA && mapa.pisos[p.piso - 1] && p.lanzable && p.lanzable !== 'mina') { p.piso--; nz += 1; }
            else if (p.lanzable) {
              nz = 0; p.vz = Math.abs(p.vz) * 0.35; p.vx *= 0.6; p.vy *= 0.6;
              if (Math.hypot(p.vx, p.vy) < 0.4 && Math.abs(p.vz) < 0.6) { p.quieto = true; p.vx = p.vy = p.vz = 0; alDetenerse(mundo, p); }
            } else { morir = true; }
          } else if (nz > 1) {
            if (p.lanzable) { nz = 1; p.vz = -Math.abs(p.vz) * 0.3; }
            else {
              const ar = mapa.pisos[p.piso + 1];
              if (ar && ar.suelo[ar.indice(cxb, cyb)] === DM.SUELO.REJILLA && !ar.paredes[ar.indice(cxb, cyb)]) { p.piso++; nz -= 1; }
              else morir = true;
            }
          }
          p.z = nz;
          if (morir) break;
          // Impacto con objetivos (los lanzables no golpean: rebotan o explotan por tiempo)
          if (p.lanzable) continue;
          for (const ob of mundo.objetivos(p.piso)) {
            if (ob.muerto || ob.id === p.dueno || p.golpeados.indexOf(ob.id) >= 0) continue;
            if (p.enemigo && ob.clase === 'enemigo' && DM.ENEMIGOS[ob.tipo].robot) continue;
            const d = Math.hypot(ob.x - p.x, ob.y - p.y);
            if (d > ob.radio + 0.08 || p.z < ob.z - 0.05 || p.z > ob.z + ob.alto + 0.05) continue;
            impactoProyectil(mundo, p, ob);
            if (p.atraviesa > 0) { p.atraviesa--; p.golpeados.push(ob.id); }
            else { morir = true; break; }
          }
        }
      }
      if (p.lanzable && p.vida <= 0 && !morir) { estallarLanzable(mundo, p); morir = true; }
      else if (morir || p.vida <= 0) {
        if (!p.lanzable) {
          const arma = p.arma ? ARMAS[p.arma] : null;
          const area = arma ? arma.area : p.area;
          if (area && !p.yaExploto) explotar(mundo, p.piso, p.x, p.y, Math.max(0, p.z), area, arma ? (arma.danioArea || arma.danio) : p.danio, mundo.buscar(p.dueno), arma || { nombre: 'ORBE' }, p.arma === 'ampollas' ? 'frio' : 'plasma');
          else mundo.evento({ t: 'impacto', piso: p.piso, x: p.x, y: p.y, z: p.z });
        }
        morir = true;
      }
      if (morir) lista.splice(i, 1);
    }
  }

  function impactoProyectil(mundo, p, ob) {
    const atacante = mundo.buscar(p.dueno);
    if (p.enemigo) {
      if (p.area) { explotar(mundo, p.piso, p.x, p.y, p.z, p.area, p.danio, atacante, { nombre: 'ORBE' }, 'plasma'); p.yaExploto = true; }
      else mundo.danar(ob, p.danio, { atacante: atacante, tipo: 'bala' });
      return;
    }
    const arma = ARMAS[p.arma];
    const v = Math.hypot(p.vx, p.vy) || 1;
    if (arma.area) { explotar(mundo, p.piso, p.x, p.y, p.z, arma.area, arma.danioArea || arma.danio, atacante, arma, p.arma === 'ampollas' ? 'frio' : 'plasma'); golpear(mundo, ob, arma.danio * 0.5, arma, atacante, 'bala'); p.yaExploto = true; }
    else golpear(mundo, ob, arma.danio, arma, atacante, 'bala', p.vx / v, p.vy / v);
    mundo.evento({ t: 'impacto', piso: p.piso, x: p.x, y: p.y, z: p.z });
  }

  // Un lanzable que se detiene en el piso
  function alDetenerse(mundo, p) {
    if (p.lanzable === 'mina') { p.armada = 1; p.vida = 600; }
    if (p.lanzable === 'bengala') { p.vida = LZ.bengala.duracion; mundo.agregarCalor(p.piso, p.x, p.y, LZ.bengala.duracion, 10, p.id); }
    if (p.lanzable === 'torreta') {
      p.vida = LZ.torreta.duracion;
      mundo.torretas.push({ id: mundo.nuevoId(), clase: 'torreta', piso: p.piso, x: p.x, y: p.y, z: 0, alto: 0.4, radio: 0.25, vida: LZ.torreta.vida, dueno: p.dueno, hasta: mundo.tiempo + LZ.torreta.duracion, tDisparo: 0, ang: 0 });
      p.vida = 0; p.muerta = true;
    }
  }

  function estallarLanzable(mundo, p) {
    const L = LZ[p.lanzable], due = mundo.buscar(p.dueno);
    if (p.lanzable === 'granada') explotar(mundo, p.piso, p.x, p.y, p.z, L.radio, L.danio, due, { nombre: 'GRANADA', explosivo: true }, 'fuego');
    else if (p.lanzable === 'mina' && p.armada) explotar(mundo, p.piso, p.x, p.y, 0.1, L.radio, L.danio, due, { nombre: 'MINA', explosivo: true }, 'fuego');
    else if (p.lanzable === 'emp') mundo.pulsoEMP(p.piso, p.x, p.y, L.radio, due);
  }

  // Minas armadas: explotan al pisarlas
  function pasoMinas(mundo) {
    for (const p of mundo.proyectiles) {
      if (p.lanzable !== 'mina' || !p.armada) continue;
      if (p.armada < 60) { p.armada++; continue; }   // se arma en 1 segundo
      const due = mundo.buscar(p.dueno);
      for (const ob of mundo.objetivos(p.piso)) {
        if (ob.muerto || ob.clase === 'barril' || ob.clase === 'torreta') continue;
        if (ob.clase === 'enemigo' && DM.ENEMIGOS[ob.tipo].vuela) continue;
        if (ob.clase === 'jugador' && !mundo.minaAfecta(due, ob)) continue;
        if (Math.hypot(ob.x - p.x, ob.y - p.y) < 0.55) { p.vida = 0; break; }
      }
    }
  }

  // ---------- Explosiones: el daño baja con la distancia y una pared en medio protege ----------
  function explotar(mundo, piso, x, y, z, radio, danio, atacante, arma, estilo) {
    mundo.evento({ t: 'explosion', piso: piso, x: x, y: y, z: z, r: radio, estilo: estilo || 'fuego' });
    const armaInfo = Object.assign({ explosivo: true }, arma || {});
    for (const ob of mundo.objetivos(piso).slice()) {
      if (ob.muerto) continue;
      const d = Math.hypot(ob.x - x, ob.y - y);
      if (d > radio + ob.radio) continue;
      if (Math.abs((ob.z + ob.alto / 2) - z) > radio) continue;
      if (!mundo.mapa.lineaVision(piso, x, y, ob.x, ob.y)) continue;
      const k = Math.max(0.2, 1 - d / (radio + ob.radio));
      if (estilo === 'frio' && ob.ef) ob.ef.ralentizado = Math.max(ob.ef.ralentizado, 2);
      mundo.danar(ob, danio * k, { atacante: atacante, arma: armaInfo, tipo: 'explosion' });
      if (ob.golpeX !== undefined && d > 0.05) { ob.golpeX += (ob.x - x) / d * 5 * k; ob.golpeY += (ob.y - y) / d * 5 * k; }
    }
  }

  // ---------- Torretas portátiles ----------
  function pasoTorretas(mundo, dt) {
    for (let i = mundo.torretas.length - 1; i >= 0; i--) {
      const t = mundo.torretas[i];
      if (t.muerto || mundo.tiempo > t.hasta) { mundo.evento({ t: 'impacto', piso: t.piso, x: t.x, y: t.y, z: 0.2 }); mundo.torretas.splice(i, 1); continue; }
      t.tDisparo -= dt;
      if (t.tDisparo > 0) continue;
      const due = mundo.buscar(t.dueno);
      let mejor = null, md = LZ.torreta.alcance;
      for (const ob of mundo.objetivos(t.piso)) {
        if (ob.muerto || ob === t || ob.clase === 'barril' || ob.clase === 'torreta') continue;
        if (ob.clase === 'jugador' && !mundo.sonRivales(due, ob)) continue;
        const d = Math.hypot(ob.x - t.x, ob.y - t.y);
        if (d < md && mundo.mapa.lineaVision(t.piso, t.x, t.y, ob.x, ob.y)) { md = d; mejor = ob; }
      }
      if (!mejor) { t.tDisparo = 0.2; continue; }
      t.tDisparo = LZ.torreta.cadencia;
      t.ang = Math.atan2(mejor.y - t.y, mejor.x - t.x);
      mundo.danar(mejor, LZ.torreta.danio, { atacante: due, arma: { nombre: 'TORRETA' }, tipo: 'bala' });
      mundo.evento({ t: 'traza', arma: 'torreta', tramos: [[t.piso, t.x, t.y, 0.3, mejor.x, mejor.y, mejor.z + mejor.alto * 0.5]], golpe: true });
    }
  }

  DM.Combate = {
    pendiente: pendiente, rayo: rayo, accionesJugador: accionesJugador,
    pasoProyectiles: pasoProyectiles, pasoMinas: pasoMinas, pasoTorretas: pasoTorretas,
    explotar: explotar, proyectilEnemigo: proyectilEnemigo, golpear: golpear
  };
})();
