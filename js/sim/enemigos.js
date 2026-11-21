// =====================================================
// Enemigos e IA (solo corre en el anfitrión o en el juego solo)
//
// ZOMBIS (lento, corredor, hinchado): buscan el CALOR. Cada 0,25 s se calcula un
//   "campo de calor" por piso (distancia por la grilla, cruzando escaleras) desde los
//   jugadores, las bengalas (atraen mucho más) y los sopletes encendidos.
//   Cada zombi baja por el campo hacia la fuente más cercana. Son inmunes al frío.
//   El corredor ataca por los flancos; el hinchado deja una nube de gas al morir.
// ROBOTS (dron, guardián): atacan a todo lo que se mueve, zombis incluidos.
//   Necesitan verte un momento para detectarte (Cachureo tarda más en ser detectada).
//   El dron vuela, apunta con un rayo de aviso y dispara un láser que se puede esquivar.
//   El guardián es lento y blindado, y lanza proyectiles lentos.
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;
  const C = DM.config;

  function Enemigo(id, tipo, pos) {
    const d = DM.ENEMIGOS[tipo];
    this.id = id; this.clase = 'enemigo'; this.tipo = tipo;
    this.piso = pos.piso; this.x = pos.x; this.y = pos.y;
    this.z = d.vuela || 0; this.alto = d.alto; this.radio = d.radio;
    this.vida = d.vida; this.vidaMax = d.vida;
    this.ang = 0; this.vx = 0; this.vy = 0; this.golpeX = 0; this.golpeY = 0;
    this.ef = { aturdido: 0, ralentizado: 0, congelado: 0, paralizado: 0, emp: 0, veneno: 0 };
    this.tAtaque = Math.random() * d.cadencia;
    this.cargaT = 0; this.apunta = null;     // dron: carga del láser y punto fijado
    this.objetivoId = null; this.tVisto = 0;
    this.anim = 0;                          // animación de ataque (0..1)
    this.muerto = false; this.tMuerto = 0;
    this.enEnlace = -1; this.lado = (id % 2) ? 1 : -1;
  }

  // ---------- Campo de calor (multipiso, cruza escaleras) ----------
  function campoCalor(mundo) {
    const mapa = mundo.mapa, P = mapa.pisos;
    if (!mundo.campo) {
      mundo.campo = P.map(function (p) { return new Float32Array(p.ancho * p.alto); });
      mundo.campoRobot = P.map(function (p) { return new Float32Array(p.ancho * p.alto); });
    }
    calcular(mundo, mundo.campo, true);
    calcular(mundo, mundo.campoRobot, false);
  }
  function calcular(mundo, campo, conCalor) {
    const mapa = mundo.mapa, P = mapa.pisos;
    const cola = [];
    for (let n = 0; n < P.length; n++) campo[n].fill(9999);
    function fuente(piso, x, y, v) {
      const p = P[piso], cx = Math.floor(x), cy = Math.floor(y);
      if (!p.dentro(cx, cy)) return;
      const i = p.indice(cx, cy);
      if (v < campo[piso][i]) { campo[piso][i] = v; cola.push(piso, i); }
    }
    for (const id in mundo.jugadores) {
      const j = mundo.jugadores[id];
      if (j.estado !== 'vivo' || j.ef.proteccion > 1) continue;
      fuente(j.piso, j.x, j.y, 0);
    }
    if (conCalor) for (const c of mundo.calor) fuente(c.piso, c.x, c.y, -c.fuerza);
    // Relajación tipo Dijkstra simple (la grilla es chica)
    let k = 0;
    while (k < cola.length) {
      const piso = cola[k++], i = cola[k++];
      const p = P[piso], v = campo[piso][i];
      const x = i % p.ancho, y = (i / p.ancho) | 0;
      const vec = [x + 1, y, x - 1, y, x, y + 1, x, y - 1];
      for (let q = 0; q < 8; q += 2) {
        const nx = vec[q], ny = vec[q + 1];
        if (!p.dentro(nx, ny)) continue;
        const ni = p.indice(nx, ny);
        const t = p.paredes[ni];
        if ((t && !DM.PAREDES[t].puerta) || p.bloqueo[ni]) continue;
        if (v + 1 < campo[piso][ni]) { campo[piso][ni] = v + 1; cola.push(piso, ni); }
      }
      // Escaleras: conectan con la llegada del otro piso
      const ie = p.enlace[i];
      if (ie >= 0 && mapa.extremos[ie].tipo === 'escalera') {
        const otro = mapa.extremos[mapa.extremos[ie].otro];
        const p2 = P[otro.piso], i2 = p2.indice(otro.x, otro.y);
        if (v + 1 < campo[otro.piso][i2]) { campo[otro.piso][i2] = v + 1; cola.push(otro.piso, i2); }
      }
    }
  }

  // Siguiente casilla bajando por el campo
  function rumbo(mundo, e, campo) {
    const p = mundo.mapa.pisos[e.piso];
    const cx = Math.floor(e.x), cy = Math.floor(e.y);
    const c = campo[e.piso];
    let mejor = c[p.indice(cx, cy)], bx = cx, by = cy;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!p.dentro(nx, ny)) continue;
      // Diagonal solo si las dos casillas de los lados están libres
      if (dx && dy && (mundo.mapa.solida(e.piso, cx + dx + 0.5, cy + 0.5) || mundo.mapa.solida(e.piso, cx + 0.5, cy + dy + 0.5))) continue;
      const v = c[p.indice(nx, ny)] + (dx && dy ? 0.41 : 0);
      if (v < mejor) { mejor = v; bx = nx; by = ny; }
    }
    if (bx === cx && by === cy) return null;
    return { x: bx + 0.5, y: by + 0.5 };
  }

  // Mover con colisión (igual que el jugador)
  function mover(mundo, e, mx, my) {
    const r = e.radio * 0.9, piso = e.piso, mapa = mundo.mapa;
    if (mx) { const nx = e.x + mx, bx = nx + Math.sign(mx) * r; if (!mapa.solida(piso, bx, e.y - r) && !mapa.solida(piso, bx, e.y + r)) e.x = nx; }
    if (my) { const ny = e.y + my, by = ny + Math.sign(my) * r; if (!mapa.solida(piso, e.x - r, by) && !mapa.solida(piso, e.x + r, by)) e.y = ny; }
  }

  function factor(e) {
    if (e.ef.paralizado > 0 || e.ef.emp > 0) return 0;
    let f = 1;
    if (e.ef.congelado > 0) f *= 0.15; else if (e.ef.ralentizado > 0) f *= 0.5;
    if (e.ef.aturdido > 0) f *= 0.2;
    return f;
  }

  // Jugador vivo más cercano en el mismo piso con línea de visión
  function jugadorVisible(mundo, e, max) {
    let mejor = null, md = max;
    for (const id in mundo.jugadores) {
      const j = mundo.jugadores[id];
      if (j.estado !== 'vivo' || j.piso !== e.piso) continue;
      const d = Math.hypot(j.x - e.x, j.y - e.y);
      if (d < md && mundo.mapa.lineaVision(e.piso, e.x, e.y, j.x, j.y)) { md = d; mejor = j; }
    }
    return mejor;
  }

  // ---------- Zombis ----------
  function pasoZombi(mundo, e, d, dt) {
    const f = factor(e);
    const j = jugadorVisible(mundo, e, 6);
    let meta = null;
    // Si tiene un jugador a la vista y cerca, va directo (el corredor se abre por el flanco)
    if (j && !mundo.calorFuerteCerca(e)) {
      meta = { x: j.x, y: j.y };
      const dd = Math.hypot(j.x - e.x, j.y - e.y);
      if (d.flanquea && dd > 1.6) {
        const nx = -(j.y - e.y) / dd, ny = (j.x - e.x) / dd;
        meta = { x: j.x + nx * e.lado * Math.min(1.4, dd * 0.4), y: j.y + ny * e.lado * Math.min(1.4, dd * 0.4) };
      }
      // Ataque cuerpo a cuerpo
      if (dd < d.alcance + C.RADIO_JUGADOR && e.tAtaque <= 0 && f > 0) {
        e.tAtaque = d.cadencia; e.anim = 0.001;
        mundo.danar(j, d.danio, { atacante: e, tipo: 'melee' });
        mundo.evento({ t: 'mordisco', piso: e.piso, x: e.x, y: e.y });
      }
    } else meta = rumbo(mundo, e, mundo.campo);
    if (meta) caminarHacia(mundo, e, meta, d.vel * f, dt);
  }

  function caminarHacia(mundo, e, meta, vel, dt) {
    const dx = meta.x - e.x, dy = meta.y - e.y, dd = Math.hypot(dx, dy);
    if (dd < 0.05) return;
    e.ang = Math.atan2(dy, dx);
    const k = Math.min(1, dt * 8);
    e.vx += (dx / dd * vel - e.vx) * k;
    e.vy += (dy / dd * vel - e.vy) * k;
    mover(mundo, e, (e.vx + e.golpeX) * dt, (e.vy + e.golpeY) * dt);
  }

  // ---------- Robots ----------
  function objetivoRobot(mundo, e, d) {
    let mejor = null, md = 12;
    const lista = mundo.objetivos(e.piso);
    for (const ob of lista) {
      if (ob.muerto || ob === e) continue;
      if (ob.clase === 'enemigo' && DM.ENEMIGOS[ob.tipo].robot) continue;
      if (ob.clase === 'barril') continue;
      if (ob.clase === 'jugador' && (ob.estado !== 'vivo')) continue;
      const dist = Math.hypot(ob.x - e.x, ob.y - e.y);
      if (dist < md && mundo.mapa.lineaVision(e.piso, e.x, e.y, ob.x, ob.y)) { md = dist; mejor = ob; }
    }
    return mejor;
  }

  function pasoRobot(mundo, e, d, dt) {
    const f = factor(e);
    if (d.vuela) e.z = e.ef.emp > 0 ? Math.max(0.05, e.z - dt) : d.vuela + Math.sin(mundo.tiempo * 2 + e.id) * 0.04;
    if (f === 0) { e.cargaT = 0; return; }
    const ob = objetivoRobot(mundo, e, d);
    // Detección: hay que verte un momento (Cachureo tarda más)
    if (ob && ob.id === e.objetivoId) e.tVisto += dt;
    else { e.objetivoId = ob ? ob.id : null; e.tVisto = 0; }
    const espera = ob && ob.personaje === 'cachureo' ? 1.5 : 0.4;
    const detectado = ob && e.tVisto >= espera;

    if (!detectado) {
      e.cargaT = 0;
      const meta = rumbo(mundo, e, mundo.campoRobot);
      if (meta) caminarHacia(mundo, e, meta, d.vel * f * 0.7, dt);
      else if (ob) e.ang = Math.atan2(ob.y - e.y, ob.x - e.x);
      return;
    }
    const dx = ob.x - e.x, dy = ob.y - e.y, dist = Math.hypot(dx, dy);
    e.ang = Math.atan2(dy, dx);
    if (e.tipo === 'dron') {
      // Mantiene distancia y se mueve de lado
      const lejos = dist - d.distancia;
      const nx = -dy / dist * e.lado, ny = dx / dist * e.lado;
      const mvx = dx / dist * Math.max(-1, Math.min(1, lejos)) + nx * 0.5, mvy = dy / dist * Math.max(-1, Math.min(1, lejos)) + ny * 0.5;
      caminarHacia(mundo, e, { x: e.x + mvx, y: e.y + mvy }, d.vel * f * (e.cargaT > 0 ? 0.3 : 1), dt);
      if (mundo.azar() < dt * 0.3) e.lado = -e.lado;
      // Carga con rayo de aviso; en el último 20 % el punto queda fijo (se puede esquivar)
      if (e.cargaT > 0) {
        e.cargaT += dt;
        if (e.cargaT < d.carga * 0.8) e.apunta = { x: ob.x, y: ob.y, z: ob.z + ob.alto * 0.55 };
        if (e.cargaT >= d.carga) {
          e.cargaT = 0; e.tAtaque = d.cadencia;
          dispararLaser(mundo, e, d);
        }
      } else if (e.tAtaque <= 0 && dist < d.alcance) {
        e.cargaT = 0.0001; e.apunta = { x: ob.x, y: ob.y, z: ob.z + ob.alto * 0.55 };
        mundo.evento({ t: 'cargaDron', id: e.id, piso: e.piso, x: e.x, y: e.y });
      }
    } else {
      // Guardián: avanza lento y dispara proyectiles esquivables
      if (dist > 2.5) {
        const meta = rumbo(mundo, e, mundo.campoRobot) || { x: ob.x, y: ob.y };
        caminarHacia(mundo, e, meta, d.vel * f, dt);
      }
      if (e.tAtaque <= 0 && dist < d.alcance) {
        e.tAtaque = d.cadencia; e.anim = 0.001;
        DM.Combate.proyectilEnemigo(mundo, e, ob, d.velProyectil, d.danio, d.area);
        mundo.evento({ t: 'disparoGuardian', piso: e.piso, x: e.x, y: e.y });
      }
    }
  }

  function dispararLaser(mundo, e, d) {
    const a = e.apunta; if (!a) return;
    const dx = a.x - e.x, dy = a.y - e.y, dist = Math.max(0.1, Math.hypot(dx, dy));
    const o = { piso: e.piso, x: e.x, y: e.y, z: e.z + 0.15, ang: Math.atan2(dy, dx), pend: (a.z - (e.z + 0.15)) / dist };
    const r = DM.Combate.rayo(mundo, o, { alcance: d.alcance + 3, excluir: e });
    if (r.objetivo) mundo.danar(r.objetivo, d.danio, { atacante: e, tipo: 'bala' });
    mundo.evento({ t: 'traza', arma: 'dronLaser', tramos: r.tramos.map(function (s) { return s.map(function (v) { return Math.round(v * 100) / 100; }); }), golpe: !!r.objetivo, laser: true });
  }

  // ---------- Paso de todos los enemigos ----------
  let tCampo = 0;
  function paso(mundo, dt) {
    tCampo -= dt;
    if (tCampo <= 0 || !mundo.campo) { tCampo = 0.25; campoCalor(mundo); }
    const lista = mundo.enemigos;
    for (let i = lista.length - 1; i >= 0; i--) {
      const e = lista[i];
      if (e.muerto) { e.tMuerto += dt; if (e.tMuerto > 0.7) lista.splice(i, 1); continue; }
      const d = DM.ENEMIGOS[e.tipo];
      for (const k in e.ef) if (e.ef[k] > 0) e.ef[k] = Math.max(0, e.ef[k] - dt);
      if (e.tAtaque > 0) e.tAtaque -= dt;
      if (e.anim > 0) { e.anim += dt * 3; if (e.anim >= 1) e.anim = 0; }
      const dec = Math.max(0, 1 - dt * 6);
      e.golpeX *= dec; e.golpeY *= dec;
      if (d.robot) pasoRobot(mundo, e, d, dt); else pasoZombi(mundo, e, d, dt);
      // Separación para que no se amontonen
      for (let k = i - 1; k >= 0; k--) {
        const o = lista[k];
        if (o.muerto || o.piso !== e.piso) continue;
        const dx = e.x - o.x, dy = e.y - o.y, dd = Math.hypot(dx, dy), m = e.radio + o.radio;
        if (dd > 0.001 && dd < m) {
          const emp = (m - dd) * 0.5 / dd;
          mover(mundo, e, dx * emp, dy * emp); mover(mundo, o, -dx * emp, -dy * emp);
        }
      }
      // Escaleras (los zombis te siguen entre pisos)
      const p = mundo.mapa.pisos[e.piso];
      const ie = p.enlace[p.indice(Math.floor(e.x), Math.floor(e.y))];
      if (ie !== e.enEnlace) {
        e.enEnlace = ie;
        if (ie >= 0 && mundo.mapa.extremos[ie].tipo === 'escalera' && !d.robot) {
          const otro = mundo.mapa.extremos[mundo.mapa.extremos[ie].otro];
          e.piso = otro.piso; e.x = otro.llegada.x; e.y = otro.llegada.y;
          const p2 = mundo.mapa.pisos[e.piso];
          e.enEnlace = p2.enlace[p2.indice(Math.floor(e.x), Math.floor(e.y))];
        }
      }
    }
  }

  DM.Enemigos = { Enemigo: Enemigo, paso: paso, campoCalor: campoCalor };
})();
