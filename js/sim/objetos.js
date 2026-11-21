// =====================================================
// Objetos del mapa (simulación pura): elixires, escudos, armas pesadas,
// lanzables y premios mayores. Se recogen al pasar por encima.
// Las armas pesadas recogidas reemplazan a la anterior, que queda en el suelo.
// Los premios mayores se anuncian a todos y reaparecen cada 60–90 s (versus).
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;
  const C = DM.config;

  function permitido(mundo, tipo) {
    const c = mundo.conf;
    if (mundo.modo === 'coop') return true;
    if (tipo.indexOf('arma:') === 0) {
      const a = tipo.slice(5);
      if (c.soloPropias) return false;
      return a === 'desintegrador' ? c.desintegrador : !!c.armas[a];
    }
    if (tipo.indexOf('lanz:') === 0) return !!c.objetos[tipo.slice(5)];
    if (DM.OBJETOS[tipo] && DM.OBJETOS[tipo].premio) return !!c.premios[tipo];
    return c.objetos[tipo] !== false;
  }

  function preparar(mundo) {
    const def = mundo.mapa.def;
    mundo.items = [];
    for (const o of def.objetos || []) {
      if (!permitido(mundo, o.tipo)) continue;
      mundo.items.push(nuevo(mundo, o, true));
    }
    if (mundo.modo === 'versus') {
      for (const pr of def.premios || []) {
        if (!permitido(mundo, pr.tipo)) continue;
        const it = nuevo(mundo, pr, true);
        it.activo = false; it.tRep = 25 + mundo.azar() * 20; it.premio = true;
        mundo.items.push(it);
      }
      if (def.suprema && permitido(mundo, 'arma:desintegrador')) {
        const it = nuevo(mundo, { piso: def.suprema.piso, x: def.suprema.x, y: def.suprema.y, tipo: 'arma:desintegrador' }, true);
        it.activo = false; it.tRep = 60; it.premio = true; it.suprema = true;
        mundo.items.push(it);
      }
    }
  }

  function nuevo(mundo, o, fijo) {
    return { id: mundo.nuevoId(), tipo: o.tipo, piso: o.piso, x: o.x + (fijo ? 0.5 : 0), y: o.y + (fijo ? 0.5 : 0), activo: true, tRep: 0, fijo: fijo, municion: o.municion || null, premio: !!(DM.OBJETOS[o.tipo] && DM.OBJETOS[o.tipo].premio), avisado: false };
  }

  // Hace aparecer un premio del mapa (cooperativo: en momentos clave)
  function aparecerPremio(mundo, tipo) {
    const def = mundo.mapa.def;
    let pos = null;
    if (tipo === 'arma:desintegrador') pos = def.suprema;
    else pos = (def.premios || []).find(function (p) { return p.tipo === tipo; });
    if (!pos) return;
    const it = nuevo(mundo, { piso: pos.piso, x: pos.x, y: pos.y, tipo: tipo }, true);
    it.premio = true; it.unaVez = true; it.suprema = tipo === 'arma:desintegrador';
    mundo.items.push(it);
    mundo.evento({ t: 'anuncio', texto: (it.suprema ? 'EL DESINTEGRADOR' : DM.OBJETOS[tipo].nombre) + ' APARECIO', color: 'verde' });
  }

  // Deja un arma en el suelo (al recoger otra pesada)
  function soltarArma(mundo, j) {
    if (!j.pesada) return;
    mundo.items.push({ id: mundo.nuevoId(), tipo: 'arma:' + j.pesada.id, piso: j.piso, x: j.x, y: j.y, activo: true, tRep: 0, fijo: false, municion: j.pesada.municion, tNoTomar: mundo.tiempo + 1, dueno: j.id });
    j.pesada = null;
  }

  // Intenta aplicar un objeto al jugador. Devuelve true si lo consumió.
  function tomar(mundo, j, it) {
    const t = it.tipo;
    if (t.indexOf('arma:') === 0) {
      const id = t.slice(5), a = DM.ARMAS[id];
      if (j.pesada && j.pesada.id === id) {
        if (j.pesada.municion >= a.municion) return false;
        j.pesada.municion = Math.min(a.municion * 2, j.pesada.municion + (it.municion || a.municion));
      } else {
        soltarArma(mundo, j);
        j.pesada = { id: id, municion: it.municion || a.municion };
        j.arma = 4; j.cargaT = 0;
      }
      if (a.suprema) mundo.evento({ t: 'anuncio', texto: j.nombre + ' TIENE EL DESINTEGRADOR', color: 'magenta' });
      return true;
    }
    if (t.indexOf('lanz:') === 0) {
      const id = t.slice(5), L = DM.LANZABLES[id];
      if (j.lanzables[id] >= L.max) return false;
      j.lanzables[id]++;
      if (j.lanzables[j.lanzSel] <= 0) j.lanzSel = id;
      return true;
    }
    const o = DM.OBJETOS[t];
    const vmax = Math.max(j.vidaMax, C.VIDA_MAX_SOBRE);
    if (o.vida) { if (j.vida >= j.vidaMax) return false; j.vida = Math.min(j.vidaMax, j.vida + o.vida); return true; }
    if (o.escudo) { if (j.escudo >= C.ESCUDO_MAX) return false; j.escudo = Math.min(C.ESCUDO_MAX, j.escudo + o.escudo); return true; }
    if (o.vidaTotal) { j.vida = vmax; j.ef.veneno = 0; anunciarPremio(mundo, j, o); return true; }
    if (o.escudoTotal) { j.escudo = C.ESCUDO_MAX; anunciarPremio(mundo, j, o); return true; }
    if (o.dios) {
      // En cooperativo, solo un jugador puede tener el núcleo a la vez
      if (mundo.modo === 'coop') for (const id in mundo.jugadores) if (mundo.jugadores[id].ef.dios > 0 && id !== j.id) return false;
      j.ef.dios = o.dios; anunciarPremio(mundo, j, o); return true;
    }
    return false;
  }
  function anunciarPremio(mundo, j, o) {
    mundo.evento({ t: 'anuncio', texto: j.nombre + ' TIENE ' + (o.dios ? 'EL NUCLEO' : 'EL ' + o.nombre) + '!', color: 'cian', premio: true });
  }

  function paso(mundo, dt) {
    const rep = DM.REAPARICION_OBJETOS[mundo.conf.reaparicionObjetos || 'normal'] || 20;
    for (let i = mundo.items.length - 1; i >= 0; i--) {
      const it = mundo.items[i];
      if (!it.activo) {
        it.tRep -= dt;
        if (it.premio && !it.avisado && it.tRep <= 5) {
          it.avisado = true;
          const nombre = it.suprema ? 'EL DESINTEGRADOR' : DM.OBJETOS[it.tipo].nombre;
          mundo.evento({ t: 'anuncio', texto: nombre + ' APARECE EN 5 SEGUNDOS', color: 'amarillo' });
        }
        if (it.tRep <= 0) { it.activo = true; it.avisado = false; mundo.evento({ t: 'reaparece', id: it.id, premio: it.premio }); }
        continue;
      }
      for (const id in mundo.jugadores) {
        const j = mundo.jugadores[id];
        if (j.estado !== 'vivo' || j.piso !== it.piso) continue;
        if (it.tNoTomar && mundo.tiempo < it.tNoTomar && it.dueno === j.id) continue;
        if (Math.hypot(j.x - it.x, j.y - it.y) > 0.55) continue;
        if (!tomar(mundo, j, it)) continue;
        mundo.evento({ t: 'recoger', id: j.id, tipo: it.tipo, premio: it.premio });
        if (!it.fijo || it.unaVez) { mundo.items.splice(i, 1); break; }
        it.activo = false;
        if (it.premio) it.tRep = it.suprema ? 120 : DM.REAPARICION_PREMIOS[0] + mundo.azar() * (DM.REAPARICION_PREMIOS[1] - DM.REAPARICION_PREMIOS[0]);
        else {
          const o = DM.OBJETOS[it.tipo];
          it.tRep = rep * (o ? o.reaparece : 1.5);
        }
        break;
      }
    }
  }

  DM.Objetos = { preparar: preparar, paso: paso, aparecerPremio: aparecerPremio, soltarArma: soltarArma };
})();
