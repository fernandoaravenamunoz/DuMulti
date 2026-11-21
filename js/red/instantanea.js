// =====================================================
// Instantáneas del estado y comandos compactos (sin DOM: se puede probar en Node)
//
// El anfitrión envía ~20 veces por segundo una INSTANTÁNEA con números redondeados
// (no objetos grandes): jugadores, enemigos, proyectiles, torretas, nubes y reglas.
// Los objetos del mapa, las puertas y los barriles solo viajan cuando cambian.
// Los clientes envían sus COMANDOS compactos con número de secuencia.
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;

  const r2 = function (v) { return Math.round(v * 100) / 100; };
  const r1 = function (v) { return Math.round(v * 10) / 10; };

  // ---------- Comandos ----------
  // [seq, avance, lateral, banderas, ang, pitch, arma]
  // banderas: 1 correr, 2 disparo, 4 usar, 8 usarToque, 16 lanzar, 32 recargar, 64 cambiaLanzable, 128 táctil
  function comprimirCmd(c) {
    const b = (c.correr ? 1 : 0) | (c.disparo ? 2 : 0) | (c.usar ? 4 : 0) | (c.usarToque ? 8 : 0) | (c.lanzar ? 16 : 0) | (c.recargar ? 32 : 0) | (c.cambiaLanzable ? 64 : 0) | (c.tactil ? 128 : 0) | (c.ping ? 256 : 0);
    return [c.seq, r2(c.avance), r2(c.lateral), b, Math.round(c.ang * 1000) / 1000, r2(c.pitch), c.arma || 0];
  }
  function expandirCmd(a) {
    const b = a[3];
    return { seq: a[0], avance: a[1], lateral: a[2], correr: !!(b & 1), disparo: !!(b & 2), usar: !!(b & 4), usarToque: !!(b & 8), lanzar: !!(b & 16), recargar: !!(b & 32), cambiaLanzable: !!(b & 64), tactil: !!(b & 128), ping: !!(b & 256), ang: a[4], pitch: a[5], arma: a[6], tolerancia: (b & 128) ? DM.config.ANGULO_APUNTAR_TACTIL : DM.config.ANGULO_APUNTAR };
  }
  // Une los toques de un comando descartado con el siguiente (para no perderlos)
  function unirToques(a, b) {
    b.usarToque = b.usarToque || a.usarToque; b.lanzar = b.lanzar || a.lanzar; b.recargar = b.recargar || a.recargar;
    b.cambiaLanzable = b.cambiaLanzable || a.cambiaLanzable; b.ping = b.ping || a.ping; if (!b.arma) b.arma = a.arma;
    return b;
  }

  // ---------- Jugadores ----------
  // Lo que todos ven de cada jugador
  const J = ['puesto', 'personaje', 'equipo', 'piso', 'x', 'y', 'ang', 'pitch', 'camZ', 'estado', 'arma', 'pesada', 'cargaT', 'disparando', 'ataque', 'andar', 'bajas', 'muertes', 'puntos', 'dios', 'proteccion', 'transicion', 'tCaido', 'reviviendo', 'tReaparecer', 'vida'];
  // Lo que solo necesita el propio jugador
  const YO = ['vx', 'vy', 'escudo', 'vidaMax', 'cargador', 'recargando', 'lanzables', 'lanzSel', 'seq', 'congelado', 'ralentizado', 'aturdido', 'paralizado', 'veneno', 'hud', 'leidos'];

  function jugador(j, completo) {
    const o = [j.id, j.puesto, j.personaje, j.equipo, j.piso, r2(j.x), r2(j.y), Math.round(j.ang * 1000) / 1000, r2(j.pitch), r2(j.camZ), j.estado, j.arma,
      j.pesada ? [j.pesada.id, j.pesada.municion] : 0, r2(j.cargaT), r2(j.disparando), r2(j.ataque), r2(j.andar), j.bajas, j.muertes, j.puntos,
      r1(j.ef.dios), r1(j.ef.proteccion), j.transicion ? r2(j.transicion.t) : -1, r1(j.tCaido), r2(j.reviviendo), r1(j.tReaparecer), Math.ceil(j.vida)];
    if (completo) {
      o.push(r2(j.vx), r2(j.vy), Math.ceil(j.escudo), j.vidaMax, j.cargador, r2(j.recargando), j.lanzables, j.lanzSel, j.seq,
        r1(j.ef.congelado), r1(j.ef.ralentizado), r1(j.ef.aturdido), r1(j.ef.paralizado), r1(j.ef.veneno), r1(j.ef.hud), j.leidos);
    }
    return o;
  }
  function aplicarJugador(j, a) {
    let k = 1;
    for (const campo of J) {
      const v = a[k++];
      switch (campo) {
        case 'pesada': j.pesada = v ? { id: v[0], municion: v[1] } : null; break;
        case 'dios': j.ef.dios = v; break;
        case 'proteccion': j.ef.proteccion = v; break;
        case 'transicion': j.transicion = v >= 0 ? { t: v, hecho: v >= DM.config.TRANSICION / 2 } : null; break;
        default: j[campo] = v;
      }
    }
    if (a.length > k) {
      for (const campo of YO) {
        const v = a[k++];
        if (['congelado', 'ralentizado', 'aturdido', 'paralizado', 'veneno', 'hud'].indexOf(campo) >= 0) j.ef[campo] = v;
        else j[campo] = v;
      }
    }
    j.propias = DM.ARMAS_PROPIAS[j.personaje];
    j.nombre = (DM.PERSONAJES[j.personaje] || {}).nombre || '?';
  }

  // ---------- Enemigos, proyectiles y demás ----------
  function enemigo(e) {
    return [e.id, e.tipo, e.piso, r2(e.x), r2(e.y), r2(e.z), r2(e.ang), r2(e.anim), r2(e.cargaT), e.apunta ? [r2(e.apunta.x), r2(e.apunta.y), r2(e.apunta.z)] : 0, e.muerto ? 1 : 0, r1(e.tMuerto || 0), e.ef.congelado > 0 ? 1 : 0, Math.ceil(e.vida), e.vidaMax];
  }
  function proyectil(p) { return [p.id, p.lanzable || p.bala, p.lanzable ? 1 : 0, p.piso, r2(p.x), r2(p.y), r2(p.z), p.armada ? 1 : 0, p.quieto ? 1 : 0]; }

  // ---------- Instantánea completa para un cliente ----------
  // estadoAnterior guarda lo último que se le mandó para enviar solo cambios
  function armar(mundo, paraId, ant, eventos) {
    const m = { t: 'e', tm: r2(mundo.tiempo), j: [], en: [], pr: [], to: [], nu: [], ev: eventos };
    for (const id in mundo.jugadores) m.j.push(jugador(mundo.jugadores[id], id === paraId));
    for (const e of mundo.enemigos) m.en.push(enemigo(e));
    for (const p of mundo.proyectiles) m.pr.push(proyectil(p));
    for (const t of mundo.torretas) m.to.push([t.id, t.piso, r2(t.x), r2(t.y), r2(t.ang)]);
    for (const n of mundo.nubes) m.nu.push([n.piso, r2(n.x), r2(n.y), r1(n.radio)]);
    m.re = mundo.reglas.estado();
    m.sw = mundo.interruptores.map(function (s) { return [r1(s.mantenido - mundo.tiempo), r1(s.activoHasta - mundo.tiempo), s.activador]; });
    // Solo si cambiaron:
    const ob = mundo.items.map(function (it) { return [it.id, it.tipo, it.piso, r2(it.x), r2(it.y), it.activo ? 1 : 0, it.premio ? 1 : 0, it.parpadea ? 1 : 0]; });
    const kOb = JSON.stringify(ob);
    if (kOb !== ant.ob) { m.ob = ob; ant.ob = kOb; }
    const pu = mundo.mapa.puertas.map(function (p) { return r1(p.apertura); });
    const kPu = pu.join(',');
    if (kPu !== ant.pu) { m.pu = pu; ant.pu = kPu; }
    const ba = mundo.barriles.map(function (b) { return b.muerto ? 1 : 0; }).join('');
    if (ba !== ant.ba) { m.ba = ba; ant.ba = ba; }
    return m;
  }

  DM.Instantanea = {
    comprimirCmd: comprimirCmd, expandirCmd: expandirCmd, unirToques: unirToques,
    armar: armar, aplicarJugador: aplicarJugador
  };
})();
