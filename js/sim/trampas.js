// =====================================================
// Trampas (simulación pura). Todas AVISAN antes de activarse.
// Funcionan con el RELOJ de la partida: cada pantalla calcula la misma fase
// sin gastar red. Solo viaja por la red el estado de los interruptores.
// (Ciclos y reglas heredados de entidades/trampas.js de Worodorox 3073.)
//
//  x piso electrificado : apagado → chispas de aviso → descarga
//  l láser              : apagado → rayos tenues → activo
//  k aplastador         : franjas rojas → la casilla se cierra de golpe
//  g gas                : burbujas y siseo → nube intermitente (deja veneno)
//  < > ^ v descompresión: empuja en esa dirección
//  1 2 3 baldosas       : solo es seguro el símbolo que indica una pista
//  f foco de radiación  : un haz que barre la sala; parpadea antes de encenderse
//  ~ fuga de plasma     : siempre hace daño (magenta)
// Interruptores de sala: en cooperativo, mientras alguien mantiene USAR en el panel,
// las trampas de su zona se apagan. En versus, las trampas de la zona están
// apagadas y al usar el panel se encienden 6 s contra los rivales (la baja es tuya).
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;
  const C = DM.config;

  // [apagado, aviso, activo] en segundos
  const CICLOS = { x: [1.8, 0.8, 1.4], l: [1.2, 0.6, 1.2], k: [2.2, 0.8, 0.9], g: [2.0, 1.0, 2.0], f: [2.0, 1.0, 4.0] };
  const EMPUJE = { '>': [1, 0], 'v': [0, 1], '<': [-1, 0], '^': [0, -1] };
  const SIMBOLO = { '1': 0, '2': 1, '3': 2 };
  const DANIO = { x: 40, l: 50, g: 12, f: 25, plasma: 8, nube: 10 };
  const ACTIVO_INTERRUPTOR = 6, ESPERA_INTERRUPTOR = 10;

  function preparar(mundo) {
    const mapa = mundo.mapa;
    mundo.trampas = mapa.trampas.map(function (tr, k) {
      const c = CICLOS[tr.car];
      const t = { k: k, car: tr.car, piso: tr.piso, x: tr.x, y: tr.y, fase: 0, interruptor: -1, empHasta: 0, ang: 0 };
      if (c) { t.ciclo = c; t.periodo = c[0] + c[1] + c[2]; t.desfase = ((tr.x * 0.37 + tr.y * 0.61) % 1) * t.periodo; }
      if (tr.car === 'f') t.desfase = (tr.x + tr.y) % 3;
      // ¿Está en la zona de un interruptor?
      mapa.interruptores.forEach(function (s) {
        const z = s.zona;
        if (s.piso === tr.piso && tr.x >= z[0] && tr.x <= z[2] && tr.y >= z[1] && tr.y <= z[3]) t.interruptor = s.k;
      });
      return t;
    });
    mundo.interruptores = mapa.interruptores.map(function () { return { mantenido: 0, activoHasta: 0, espera: 0, activador: null }; });
  }

  // ¿Está encendida la trampa ahora? (configuración, EMP e interruptores)
  function encendida(mundo, t) {
    if (!mundo.conf.trampas) return false;
    if (t.empHasta > mundo.tiempo) return false;
    if (t.interruptor >= 0) {
      const s = mundo.interruptores[t.interruptor];
      if (mundo.modo === 'coop') return !(s.mantenido > mundo.tiempo);
      if (mundo.conf.interruptores) return s.activoHasta > mundo.tiempo;
    }
    return true;
  }

  // Fases y geometría (lo calculan anfitrión y clientes por igual)
  function estados(mundo) {
    const tiempo = mundo.tiempo, mapa = mundo.mapa;
    for (const t of mundo.trampas) {
      const on = encendida(mundo, t);
      if (t.ciclo) {
        const u = (tiempo + t.desfase) % t.periodo, c = t.ciclo;
        t.fase = !on ? 0 : u < c[0] ? 0 : u < c[0] + c[1] ? 1 : 2;
      } else t.fase = on ? 2 : 0;
      if (t.car === 'f') t.ang = tiempo * 0.9 + t.desfase * 2;
      if (t.car === 'k') {
        const p = mapa.pisos[t.piso], i = p.indice(t.x, t.y);
        const antes = p.paredes[i];
        p.paredes[i] = t.fase === 2 ? DM.PARED.APLASTADOR : 0;
        t.recienCerrado = !antes && p.paredes[i];
      }
    }
  }

  // Lista de cosas que las trampas afectan en un piso
  function afectados(mundo, piso) {
    const l = [];
    for (const id in mundo.jugadores) { const j = mundo.jugadores[id]; if (j.piso === piso && j.estado === 'vivo') l.push(j); }
    for (const e of mundo.enemigos) if (e.piso === piso && !e.muerto) l.push(e);
    return l;
  }
  function enCelda(o, x, y) { return Math.floor(o.x) === x && Math.floor(o.y) === y; }
  function credito(mundo, t) {
    if (t.interruptor < 0 || mundo.modo === 'coop') return null;
    return mundo.buscar(mundo.interruptores[t.interruptor].activador);
  }

  // Efectos (solo el anfitrión): daño, empujes y veneno
  function efectos(mundo, dt) {
    const mapa = mundo.mapa;
    for (const t of mundo.trampas) {
      if (t.fase !== 2 && !(t.car === 'k' && t.recienCerrado)) continue;
      const lista = afectados(mundo, t.piso);
      const info = { tipo: 'trampa', trampa: t.car, trampaDe: credito(mundo, t) };
      if (t.car === 'f') {
        // Haz de radiación: barre alrededor del foco
        for (const o of lista) {
          const dx = o.x - t.x - 0.5, dy = o.y - t.y - 0.5, d = Math.hypot(dx, dy);
          if (d > 4.5 || d < 0.3) continue;
          let da = Math.atan2(dy, dx) - t.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > 0.32) continue;
          if (!mapa.lineaVision(t.piso, t.x + 0.5, t.y + 0.5, o.x, o.y)) continue;
          mundo.danar(o, DANIO.f * dt, info);
        }
        continue;
      }
      for (const o of lista) {
        if (!enCelda(o, t.x, t.y)) continue;
        const vuela = o.clase === 'enemigo' && DM.ENEMIGOS[o.tipo].vuela;
        switch (t.car) {
          case 'x': if (!vuela) mundo.danar(o, DANIO.x * dt, info); break;
          case 'l': mundo.danar(o, DANIO.l * dt, info); break;
          case 'g':
            if (o.personaje === 'pantuflina') break;
            mundo.danar(o, DANIO.g * dt, info);
            if (o.ef) o.ef.veneno = Math.max(o.ef.veneno, 4);
            break;
          case 'k':
            if (t.recienCerrado) {
              mundo.danar(o, 999, { tipo: 'aplastar', trampa: 'k', trampaDe: info.trampaDe });
              mundo.evento({ t: 'aplastar', piso: t.piso, x: t.x + 0.5, y: t.y + 0.5 });
            }
            break;
          case '<': case '>': case '^': case 'v':
            if (vuela) break;
            if (o.empujeX !== undefined) { o.empujeX += EMPUJE[t.car][0] * 2.6; o.empujeY += EMPUJE[t.car][1] * 2.6; }
            else { o.golpeX += EMPUJE[t.car][0] * 2.6 * dt * 8; o.golpeY += EMPUJE[t.car][1] * 2.6 * dt * 8; }
            break;
          case '1': case '2': case '3':
            if (vuela || SIMBOLO[t.car] === mundo.mapa.def.baldosaSegura) break;
            if ((o._tZap || 0) > mundo.tiempo) break;
            o._tZap = mundo.tiempo + 0.6;
            mundo.danar(o, 15, info);
            mundo.evento({ t: 'zap', piso: t.piso, x: t.x + 0.5, y: t.y + 0.5 });
            if (o.golpeX !== undefined) { const a = Math.atan2(o.vy || 0, o.vx || 0); o.golpeX -= Math.cos(a) * 6; o.golpeY -= Math.sin(a) * 6; }
            break;
        }
      }
    }
    // Fugas de plasma (piso magenta) y nubes de gas de los hinchados
    for (let piso = 0; piso < mapa.pisos.length; piso++) {
      const p = mapa.pisos[piso];
      for (const o of afectados(mundo, piso)) {
        const i = p.indice(Math.floor(o.x), Math.floor(o.y));
        const vuela = o.clase === 'enemigo' && DM.ENEMIGOS[o.tipo].vuela;
        if (p.suelo[i] === DM.SUELO.PLASMA && !vuela) mundo.danar(o, DANIO.plasma * dt, { tipo: 'trampa', trampa: '~' });
        for (const n of mundo.nubes) {
          if (n.piso !== piso || o.clase === 'enemigo' || o.personaje === 'pantuflina') continue;
          if (Math.hypot(o.x - n.x, o.y - n.y) < n.radio) { mundo.danar(o, DANIO.nube * dt, { tipo: 'gas' }); o.ef.veneno = Math.max(o.ef.veneno, 3); }
        }
      }
    }
    for (let i = mundo.nubes.length - 1; i >= 0; i--) if (mundo.nubes[i].hasta < mundo.tiempo) mundo.nubes.splice(i, 1);
    // Veneno: daño lento mientras dura
    for (const id in mundo.jugadores) { const j = mundo.jugadores[id]; if (j.estado === 'vivo' && j.ef.veneno > 0) mundo.danar(j, 3 * dt, { tipo: 'veneno' }); }
  }

  // Usar un interruptor (versus: encender por 6 s; coop: se mantiene)
  function usarInterruptor(mundo, k, j, mantenido) {
    const s = mundo.interruptores[k];
    if (!s) return;
    if (mundo.modo === 'coop') {
      if (mantenido) { if (s.mantenido < mundo.tiempo) mundo.evento({ t: 'interruptor', k: k, on: false }); s.mantenido = mundo.tiempo + 0.15; s.activador = j.id; }
      return;
    }
    if (!mundo.conf.interruptores || !mundo.conf.trampas || s.espera > mundo.tiempo) return;
    s.activoHasta = mundo.tiempo + ACTIVO_INTERRUPTOR;
    s.espera = mundo.tiempo + ESPERA_INTERRUPTOR;
    s.activador = j.id;
    mundo.evento({ t: 'interruptor', k: k, on: true, id: j.id });
  }

  // Pulso EMP: apaga las trampas cercanas 5 s
  function emp(mundo, piso, x, y, radio, dur) {
    for (const t of mundo.trampas) if (t.piso === piso && Math.hypot(t.x + 0.5 - x, t.y + 0.5 - y) < radio) t.empHasta = mundo.tiempo + dur;
  }

  DM.Trampas = { preparar: preparar, estados: estados, efectos: efectos, usarInterruptor: usarInterruptor, emp: emp, encendida: encendida, CICLOS: CICLOS };
})();
