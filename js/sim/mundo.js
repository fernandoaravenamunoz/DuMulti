// =====================================================
// Mundo: el estado completo de la partida (simulación pura)
//
// Contiene mapa, jugadores, enemigos, proyectiles, objetos, trampas, barriles,
// torretas, nubes de gas, fuentes de calor, reglas del modo y el reloj.
// Avanza con paso(dt, comandos) donde comandos = { idJugador: comando }.
// No dibuja ni toca el DOM o el audio: corre igual en el anfitrión de la red,
// en el juego solo y en las pruebas. Lo que ocurre se anuncia en mundo.eventos
// (sonidos, mensajes, efectos); la red los reenvía a los clientes.
//
// En un CLIENTE de red (opciones.cliente = true) el mundo no corre IA ni daño:
// solo el reloj, las trampas (que dependen del reloj) y la predicción del propio
// movimiento. Todo lo demás llega en las instantáneas del anfitrión.
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;
  const C = DM.config;

  // Un jugador "está muerto" para los rayos y las explosiones si no está de pie
  Object.defineProperty(DM.Jugador.prototype, 'muerto', { get: function () { return this.estado !== 'vivo'; } });
  DM.Jugador.prototype.clase = 'jugador';
  DM.Jugador.prototype.z = 0;
  DM.Jugador.prototype.radio = C.RADIO_JUGADOR;
  DM.Jugador.prototype.alto = C.ALTO_JUGADOR;

  function rng(semilla) {
    let s = semilla >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function Mundo(defMapa, modo, conf, opciones) {
    opciones = opciones || {};
    this.mapa = new DM.Mapa(defMapa);
    this.modo = modo || defMapa.modo || 'coop';
    this.conf = conf || (this.modo === 'coop' ? DM.Partida.coopBase() : DM.Partida.versusBase());
    if (this.modo === 'coop') { this.conf.trampas = this.conf.trampas !== false; this.conf.interruptores = true; this.conf.objetos = this.conf.objetos || {}; }
    this.cliente = !!opciones.cliente;
    this.azar = rng(opciones.semilla || 12345);
    this.jugadores = {};
    this.enemigos = [];
    this.proyectiles = [];
    this.items = [];
    this.torretas = [];
    this.nubes = [];
    this.calor = [];
    this.tiempo = 0;
    this.eventos = [];
    this.historia = [];
    this.siguienteId = 1000;
    this.archivo = {};          // registros leídos por el equipo (cooperativo)
    this.barriles = this.mapa.barriles.map(function (b, k) {
      return { id: 500 + k, clase: 'barril', piso: b.piso, x: b.x, y: b.y, z: 0, alto: 0.6, radio: 0.32, vida: 25, muerto: false };
    });
    DM.Trampas.preparar(this);
    if (!this.cliente) DM.Objetos.preparar(this);
    this.secretosHallados = [];             // v1.2: índices de mapa.secretos encontrados
    this.nivel = opciones.nivel || null;     // campaña: id del sector (js/datos/campana.js)
    this.reglas = this.modo === 'versus' ? new DM.Reglas.Versus(this)
      : this.nivel ? new DM.Reglas.Campana(this, this.nivel) : new DM.Reglas.Coop(this);
    this._objetivos = [];
    this._tickObjetivos = -1;
    this.tick = 0;
  }

  Mundo.prototype.nuevoId = function () { return this.siguienteId++; };
  Mundo.prototype.evento = function (e) { this.eventos.push(e); };
  Mundo.prototype.sacarEventos = function () { const l = this.eventos; this.eventos = []; return l; };

  Mundo.prototype.agregarJugador = function (id, personaje, puesto) {
    const j = new DM.Jugador(id, personaje, puesto);
    j.ubicar(DM.Reglas.puntoAparicion(this, j, false), this.mapa.inicio.ang);
    this.jugadores[id] = j;
    return j;
  };
  Mundo.prototype.quitarJugador = function (id) {
    const j = this.jugadores[id];
    if (j && j.pesada) DM.Objetos.soltarArma(this, j);
    delete this.jugadores[id];
  };
  Mundo.prototype.iniciar = function () { this.reglas.iniciar(); };

  Mundo.prototype.buscar = function (id) {
    if (id === null || id === undefined) return null;
    if (this.jugadores[id]) return this.jugadores[id];
    for (const e of this.enemigos) if (e.id === id) return e;
    for (const t of this.torretas) if (t.id === id) return t;
    return null;
  };

  // Todo lo que puede recibir daño en un piso (se arma una vez por paso)
  Mundo.prototype.objetivos = function (piso) {
    if (this._tickObjetivos !== this.tick) {
      this._tickObjetivos = this.tick;
      const l = this._objetivos = this.mapa.pisos.map(function () { return []; });
      for (const id in this.jugadores) { const j = this.jugadores[id]; if (j.estado === 'vivo') l[j.piso].push(j); }
      for (const e of this.enemigos) if (!e.muerto) l[e.piso].push(e);
      for (const b of this.barriles) if (!b.muerto) l[b.piso].push(b);
      for (const t of this.torretas) if (!t.muerto) l[t.piso].push(t);
    }
    return this._objetivos[piso] || [];
  };

  // ---------- Relaciones entre jugadores ----------
  Mundo.prototype.sonRivales = function (a, b) {
    if (!a || !b || a.clase !== 'jugador' || b.clase !== 'jugador') return true;
    if (a === b) return false;
    if (this.modo === 'coop') return false;
    if (this.conf.modo === 'equipos') return a.equipo !== b.equipo;
    return true;
  };
  Mundo.prototype.minaAfecta = function (dueno, ob) {
    if (!dueno || dueno.clase !== 'jugador') return true;
    if (ob === dueno) return this.modo === 'versus';
    if (this.sonRivales(dueno, ob)) return true;
    return this.conf.fuegoAmigo !== 'no';
  };
  Mundo.prototype.permiteLanzable = function () { return true; };
  Mundo.prototype.asistencia = function (j) {
    if (this.conf.asistencia === false) return 0;
    return j.tactil ? C.ASISTENCIA_TACTIL : C.ASISTENCIA_PC;
  };

  // ---------- Compensación de retraso ----------
  Mundo.prototype.rebobinarPara = function (j) { return Math.min(C.REBOBINADO_MAX, j.rebobinar || 0); };
  Mundo.prototype.guardarHistoria = function () {
    const lista = [];
    for (const id in this.jugadores) { const j = this.jugadores[id]; lista.push(j, j.x, j.y); }
    for (const e of this.enemigos) lista.push(e, e.x, e.y);
    this.historia.push({ t: this.tiempo, l: lista });
    if (this.historia.length > 24) this.historia.shift();
  };
  Mundo.prototype.posHistorica = function (ob, rew) {
    const meta = this.tiempo - rew;
    for (let k = this.historia.length - 1; k >= 0; k--) {
      const h = this.historia[k];
      if (h.t > meta) continue;
      for (let i = 0; i < h.l.length; i += 3) if (h.l[i] === ob) return { x: h.l[i + 1], y: h.l[i + 2] };
      break;
    }
    return ob;
  };

  // ---------- Daño ----------
  Mundo.prototype.danar = function (ob, n, info) {
    if (!ob || n <= 0) return false;
    const tipo = info.tipo, a = info.atacante;
    // v1.2: las trampas dañan menos a los enemigos (para que no "jueguen solas")
    if (tipo === 'trampa') n *= ob.clase === 'enemigo' ? DM.Partida.TRAMPAS_A_ENEMIGOS : ob.clase === 'jugador' ? DM.Partida.TRAMPAS_A_JUGADORES : 1;
    if (ob.clase === 'jugador') {
      if (ob.estado !== 'vivo') return false;
      if ((ob.ef.proteccion > 0 || ob.ef.dios > 0) && tipo !== 'aplastar') return false;
      if (a && a.clase === 'jugador' && a !== ob && !this.sonRivales(a, ob)) {
        const ff = this.conf.fuegoAmigo;
        if (ff === 'no' || !ff) return false;
        if (ff === 'explosivos' && tipo !== 'explosion') return false;
      }
      if (a === ob && this.modo === 'coop') n *= 0.5;
      // Tía Chucrut bloquea con la sartén los ataques de frente
      if (ob.personaje === 'chucrut' && ob.arma === 2 && ob.ataque === 0 && a && (tipo === 'bala' || tipo === 'melee')) {
        let da = Math.atan2(a.y - ob.y, a.x - ob.x) - ob.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < 1.0) { n *= 1 - DM.ARMAS.sarten.bloquea; this.evento({ t: 'bloqueo', id: ob.id }); }
      }
      const abs = Math.min(ob.escudo, n * C.ESCUDO_ABSORBE);
      ob.escudo -= abs;
      ob.vida -= n - abs;
      if (a && a !== ob) { ob.ultimoAtacante = a.id; ob.tUltimoAtacante = 4; }
      if (tipo === 'bala' || tipo === 'melee' || tipo === 'explosion' || tipo === 'suprema') {
        this.evento({ t: 'herido', id: ob.id, n: Math.round(n), dx: a ? a.x : null, dy: a ? a.y : null });
        if (a && a.clase === 'jugador' && a !== ob) this.evento({ t: 'acierto', de: a.id, a: ob.id, baja: ob.vida <= 0 });
      }
      if (ob.vida <= 0) {
        ob.vida = 0;
        // Si un rival lo empujó a la muerte hace poco (trampa, enemigo), la baja es de ese rival
        if (!a || a.clase !== 'jugador') {
          const ult = this.buscar(ob.ultimoAtacante);
          if (ult && ult.clase === 'jugador' && ob.tUltimoAtacante > 0 && this.sonRivales(ult, ob) && !info.trampaDe) info = Object.assign({}, info, { atacante: ult });
        }
        this.reglas.alMorirJugador(ob, info);
        const ca = info.atacante;
        const causa = ca && ca.clase === 'enemigo' ? ca.tipo : ca && ca.clase === 'jugador' ? (ca === ob ? 'propio' : 'jugador') : info.trampa ? 'trampa ' + info.trampa : tipo;
        this.evento({ t: 'muerte', id: ob.id, piso: ob.piso, x: ob.x, y: ob.y, causa: causa });
      }
      return true;
    }
    if (ob.clase === 'enemigo') {
      if (ob.muerto) return false;
      const d = DM.ENEMIGOS[ob.tipo];
      if (d.blindaje) n *= d.blindaje;
      ob.vida -= n;
      if (tipo === 'bala' || tipo === 'melee' || tipo === 'explosion' || tipo === 'suprema') {
        this.evento({ t: 'golpeEnemigo', piso: ob.piso, x: ob.x, y: ob.y, z: ob.z + ob.alto * 0.6, robot: !!d.robot });
        if (a && a.clase === 'jugador') this.evento({ t: 'acierto', de: a.id, a: ob.id, baja: ob.vida <= 0 });
        // Retroceso: el golpe lo empuja hacia atrás (menos a los robots y a los pesados)
        if (a && tipo !== 'explosion') {
          const dx = ob.x - a.x, dy = ob.y - a.y, dd = Math.hypot(dx, dy) || 1;
          const k = Math.min(C.RETROCESO_MAX, n * C.RETROCESO_POR_DANIO) * (d.robot ? 0.35 : 1) * Math.min(1, 80 / ob.vidaMax);
          ob.golpeX += dx / dd * k; ob.golpeY += dy / dd * k;
        }
      }
      if (ob.vida <= 0) {
        ob.muerto = true; ob.tMuerto = 0;
        this.reglas.alMorirEnemigo(ob, info);
        DM.Objetos.alMorirEnemigo(this, ob, a || info.trampaDe);
        this.evento({ t: 'muereEnemigo', tipo: ob.tipo, piso: ob.piso, x: ob.x, y: ob.y, z: ob.z });
        if (d.gasAlMorir) this.nubes.push({ piso: ob.piso, x: ob.x, y: ob.y, radio: 1.4, hasta: this.tiempo + 4 });
      }
      return true;
    }
    if (ob.clase === 'barril') {
      if (ob.muerto) return false;
      ob.vida -= n;
      if (ob.vida <= 0) {
        ob.muerto = true;
        const p = this.mapa.pisos[ob.piso];
        p.bloqueo[p.indice(Math.floor(ob.x), Math.floor(ob.y))] = 0;
        this.evento({ t: 'barril', id: ob.id });
        DM.Combate.explotar(this, ob.piso, ob.x, ob.y, 0.3, 1.8, 80, a, { nombre: 'BARRIL' }, 'fuego');
      }
      return true;
    }
    if (ob.clase === 'torreta') {
      if (ob.muerto) return false;
      ob.vida -= n;
      if (ob.vida <= 0) ob.muerto = true;
      return true;
    }
    return false;
  };

  // ---------- Utilidades del mapa ----------
  Mundo.prototype.rayoPared = function (piso, px, py, rdx, rdy, maxDist) {
    const p = this.mapa.pisos[piso];
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
    const pasoX = rdx < 0 ? -1 : 1, pasoY = rdy < 0 ? -1 : 1;
    let sdx = rdx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx;
    let sdy = rdy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
    let dist = 0;
    for (let n = 0; n < 64; n++) {
      if (sdx < sdy) { dist = sdx; sdx += ddx; mx += pasoX; } else { dist = sdy; sdy += ddy; my += pasoY; }
      if (dist > maxDist) break;
      const t = p.pared(mx, my);
      if (!t) continue;
      const info = DM.PAREDES[t];
      if (info.puerta && this.mapa.apertura(piso, mx, my) > 0.85) continue;
      return { tipo: t, dist: dist, mx: mx, my: my };
    }
    return { tipo: 0, dist: maxDist, mx: mx, my: my };
  };
  // Pared falsa: se abre (queda libre) y avisa a todos
  Mundo.prototype.abrirFalsa = function (piso, x, y) {
    const p = this.mapa.pisos[piso], i = p.indice(x, y);
    if (p.paredes[i] !== DM.PARED.FALSA) return;
    p.paredes[i] = 0; p.paredOriginal[i] = 0;
    this.evento({ t: 'rejilla', piso: piso, x: x, y: y, falsa: true });
  };
  // Ping (v1.2): marca lo que el jugador está mirando (enemigo, objeto o lugar) por 4 s
  Mundo.prototype.marcarPing = function (j) {
    if (this.tiempo < (j.tPing || 0)) return;
    j.tPing = this.tiempo + 1;
    const cx = Math.cos(j.ang), cy = Math.sin(j.ang), mapa = this.mapa;
    let mejor = null, md = 1e9, que = 'lugar';
    const mirar = function (ob, max, tol) {
      if (ob.piso !== j.piso) return false;
      const dx = ob.x - j.x, dy = ob.y - j.y, d = Math.hypot(dx, dy);
      if (d > max || d < 0.3) return false;
      const desvio = Math.abs(Math.atan2(cx * dy - cy * dx, cx * dx + cy * dy));
      if (desvio > Math.max(tol, 0.35 / d)) return false;
      if (!mapa.lineaVision(j.piso, j.x, j.y, ob.x, ob.y)) return false;
      if (d < md) { md = d; mejor = ob; }
      return true;
    };
    for (const e of this.enemigos) if (!e.muerto && mirar(e, 25, 0.1)) que = 'enemigo';
    if (!mejor) for (const it of this.items) if (it.activo && mirar(it, 15, 0.12)) que = 'objeto';
    let x, y;
    if (mejor) { x = mejor.x; y = mejor.y; }
    else {
      const g = this.rayoPared(j.piso, j.x, j.y, cx, cy, 30);
      const d = Math.max(0.5, g.dist - 0.25);
      x = j.x + cx * d; y = j.y + cy * d;
    }
    this.evento({ t: 'ping', de: j.id, piso: j.piso, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, sigue: que === 'enemigo' ? mejor.id : null, que: que });
  };
  Mundo.prototype.romperRejilla = function (piso, x, y) {
    const p = this.mapa.pisos[piso], i = p.indice(x, y);
    p.paredes[i] = 0; p.paredOriginal[i] = 0;
    this.evento({ t: 'rejilla', piso: piso, x: x, y: y });
  };
  Mundo.prototype.agregarCalor = function (piso, x, y, dur, fuerza) {
    this.calor.push({ piso: piso, x: x, y: y, hasta: this.tiempo + dur, fuerza: fuerza });
  };
  Mundo.prototype.calorFuerteCerca = function (e) {
    for (const c of this.calor) if (c.piso === e.piso && c.fuerza >= 6 && Math.hypot(c.x - e.x, c.y - e.y) < 9) return true;
    return false;
  };
  Mundo.prototype.pulsoEMP = function (piso, x, y, radio, due) {
    const L = DM.LANZABLES.emp;
    for (const e of this.enemigos) if (!e.muerto && e.piso === piso && DM.ENEMIGOS[e.tipo].robot && Math.hypot(e.x - x, e.y - y) < radio) { e.ef.emp = L.duracion; e.cargaT = 0; }
    DM.Trampas.emp(this, piso, x, y, radio, L.duracion);
    if (this.modo === 'versus') {
      for (const id in this.jugadores) {
        const j = this.jugadores[id];
        if (j.piso === piso && j.estado === 'vivo' && this.sonRivales(due, j) && Math.hypot(j.x - x, j.y - y) < radio) j.ef.hud = L.duracionHUD;
      }
    }
    this.evento({ t: 'emp', piso: piso, x: x, y: y, r: radio });
  };

  // Hace aparecer un enemigo en un punto Z lejos de la vista de los jugadores
  Mundo.prototype.aparecerEnemigo = function (tipo) {
    const pts = this.mapa.aparicionesZ.length ? this.mapa.aparicionesZ : this.mapa.apariciones;
    let mejor = null, mp = -1;
    for (let k = 0; k < 6; k++) {
      const p = pts[Math.floor(this.azar() * pts.length)];
      let md = 99;
      for (const id in this.jugadores) {
        const j = this.jugadores[id];
        if (j.piso !== p.piso) continue;
        md = Math.min(md, Math.hypot(j.x - p.x, j.y - p.y));
      }
      const puntaje = Math.min(md, 8) + this.azar();
      if (puntaje > mp) { mp = puntaje; mejor = p; }
    }
    const e = new DM.Enemigos.Enemigo(this.nuevoId(), tipo, { piso: mejor.piso, x: mejor.x + (this.azar() - 0.5) * 0.4, y: mejor.y + (this.azar() - 0.5) * 0.4 });
    this.enemigos.push(e);
    this.evento({ t: 'aparece', tipo: tipo, piso: e.piso, x: e.x, y: e.y });
    return e;
  };

  // ---------- ¿Qué tiene el jugador al frente? (aviso [E] y acción usar) ----------
  Mundo.prototype.alFrente = function (j, tolerancia) {
    if (j.estado !== 'vivo') return null;
    const mapa = this.mapa, p = mapa.pisos[j.piso];
    // Revivir a un compañero caído
    if (this.modo === 'coop') {
      for (const id in this.jugadores) {
        const o = this.jugadores[id];
        if (o !== j && o.estado === 'caido' && o.piso === j.piso && Math.hypot(o.x - j.x, o.y - j.y) < C.DIST_REVIVIR) {
          return { accion: 'revivir', id: o.id, texto: 'MANTEN PARA REVIVIR A ' + o.nombre, progreso: o.reviviendo };
        }
      }
    }
    // Ascensor: basta con estar parado en la plataforma
    const ie = p.enlace[p.indice(Math.floor(j.x), Math.floor(j.y))];
    if (ie >= 0 && mapa.extremos[ie].tipo === 'ascensor') {
      const destino = mapa.extremos[mapa.extremos[ie].otro];
      return { accion: 'ascensor', extremo: ie, texto: 'IR AL ' + mapa.pisos[destino.piso].nombre.split(' - ')[0] };
    }
    // Cartas en el piso
    for (const r of mapa.registros) {
      if (!r.carta || r.piso !== j.piso) continue;
      if (Math.hypot(r.x + 0.5 - j.x, r.y + 0.5 - j.y) < 1.0) return { accion: 'leer', id: r.id, texto: 'LEER' };
    }
    // Paredes al frente: puerta, interruptor o registro
    const lejos = j.personaje === 'pirulo' ? C.DIST_USAR * 4 : C.DIST_USAR;
    const ruta = function (tipo, x, y) { return mapa.rutas.find(function (r) { return r.tipo === tipo && r.piso === j.piso && r.x === x && r.y === y; }); };
    const alcance = mapa.rutas.length ? C.DIST_USAR * 4 : lejos;   // para avisar de las rutas de personaje
    const desvios = [0, -1, 1, -0.5, 0.5];
    for (const d of desvios) {
      const a = j.ang + d * (tolerancia || 0);
      const g = this.rayoPared(j.piso, j.x, j.y, Math.cos(a), Math.sin(a), alcance);
      if (!g.tipo) continue;
      // Rutas de personaje (v1.2): rejilla de Gargolfo y panel lejano de Pirulo
      if (g.tipo === DM.PARED.REJILLA && g.dist <= C.DIST_USAR + 0.4 && ruta('gargolfo', g.mx, g.my))
        return { accion: 'info', texto: j.personaje === 'gargolfo' ? 'GOLPEA CON EL FIERRO (2) PARA ROMPERLA' : 'SOLO GARGOLFO PUEDE ROMPER ESTA REJILLA' };
      if (g.tipo === DM.PARED.INTERRUPTOR && g.dist > lejos) {
        if (ruta('pirulo', g.mx, g.my)) return { accion: 'info', texto: 'SOLO PIRULO ALCANZA ESTE PANEL DESDE AQUI' };
        continue;
      }
      if (g.tipo === DM.PARED.FALSA && g.dist <= C.DIST_USAR) return { accion: 'falsa', x: g.mx, y: g.my, texto: '' };
      if (g.dist > lejos) continue;
      if (g.tipo === DM.PARED.INTERRUPTOR) {
        const s = mapa.interruptores.find(function (s) { return s.piso === j.piso && s.x === g.mx && s.y === g.my; });
        if (s) return { accion: 'interruptor', k: s.k, texto: this.modo === 'coop' ? 'MANTEN PARA APAGAR LAS TRAMPAS' : 'ACTIVAR LAS TRAMPAS' };
      }
      if (g.dist > C.DIST_USAR) continue;
      if (g.tipo === DM.PARED.CONSOLA) {
        const c = mapa.consolas.find(function (c) { return c.piso === j.piso && c.x === g.mx && c.y === g.my; });
        if (c) {
          const info = this.reglas.textoConsola ? this.reglas.textoConsola(c.k) : { texto: 'CONSOLA SIN ENERGIA', progreso: 0 };
          return { accion: 'consola', k: c.k, texto: info.texto, progreso: info.progreso };
        }
      }
      if (DM.PAREDES[g.tipo].puerta && g.tipo !== DM.PARED.SECUENCIA) {
        const k = p.puerta[p.indice(g.mx, g.my)];
        return { accion: 'puerta', puerta: k, texto: 'ABRIR COMPUERTA' };
      }
      const r = mapa.registros.find(function (r) { return !r.carta && r.piso === j.piso && r.x === g.mx && r.y === g.my; });
      if (r) return { accion: 'leer', id: r.id, texto: 'LEER' };
    }
    return null;
  };

  Mundo.prototype.leer = function (j, id) {
    if (this.modo === 'coop') {
      if (!this.archivo[id]) { this.archivo[id] = true; this.evento({ t: 'archivo', id: id }); }
    }
    j.leidos[id] = true;
    this.evento({ t: 'leer', id: id, quien: j.id });
  };

  // ---------- Un paso de simulación ----------
  Mundo.prototype.paso = function (dt, comandos) {
    this.tiempo += dt;
    this.tick++;
    DM.Trampas.estados(this);
    if (this.cliente) return;
    const mapa = this.mapa;

    for (const id in this.jugadores) {
      const j = this.jugadores[id];
      const cmd = comandos[id] || j.ultimoCmd;
      if (!cmd) continue;
      j.ultimoCmd = cmd;
      j.seq = cmd.seq || j.seq;
      j.tactil = !!cmd.tactil;
      j.pasoEfectos(dt);
      j.pasoMovimiento(dt, cmd, mapa);
      j.ultimoUsar = !!cmd.usar && j.estado === 'vivo';

      if (j.estado === 'vivo' && !j.transicion) {
        const f = (cmd.usar || cmd.usarToque) ? this.alFrente(j, cmd.tolerancia || 0) : null;
        if (f && cmd.usarToque) {
          if (f.accion === 'puerta') this.abrirPuerta(f.puerta);
          else if (f.accion === 'ascensor') this.iniciarTransicion(j, mapa.extremos[f.extremo].otro);
          else if (f.accion === 'leer') this.leer(j, f.id);
          else if (f.accion === 'falsa') this.abrirFalsa(j.piso, f.x, f.y);
          else if (f.accion === 'interruptor' && this.modo === 'versus') DM.Trampas.usarInterruptor(this, f.k, j, false);
        }
        if (f && cmd.usar && f.accion === 'interruptor' && this.modo === 'coop') DM.Trampas.usarInterruptor(this, f.k, j, true);
        if (f && cmd.usar && f.accion === 'consola' && this.reglas.usarConsola) this.reglas.usarConsola(f.k, j, dt);
        DM.Combate.accionesJugador(this, j, cmd, dt);
        if (cmd.ping) this.marcarPing(j);
      }

      // Secretos (v1.2): se encuentran al pisar la casilla
      if (j.estado === 'vivo' && mapa.secretos.length) {
        const cx = Math.floor(j.x), cy = Math.floor(j.y);
        for (const s of mapa.secretos) {
          if (this.secretosHallados.indexOf(s.k) >= 0 || s.piso !== j.piso || s.x !== cx || s.y !== cy) continue;
          this.secretosHallados.push(s.k);
          this.evento({ t: 'secreto', k: s.k, id: j.id, n: this.secretosHallados.length, total: mapa.secretos.length });
        }
      }
      // Escaleras: cambian de piso al pisarlas
      const p = mapa.pisos[j.piso];
      const ie = p.enlace[p.indice(Math.floor(j.x), Math.floor(j.y))];
      if (ie !== j.enEnlace) {
        j.enEnlace = ie;
        if (ie >= 0 && mapa.extremos[ie].tipo === 'escalera' && !j.transicion && j.estado === 'vivo') this.iniciarTransicion(j, mapa.extremos[ie].otro);
      }
      this.pasoTransicion(j, dt);
    }

    DM.Enemigos.paso(this, dt);
    this.resolverChoques();
    DM.Combate.pasoProyectiles(this, dt);
    DM.Combate.pasoMinas(this);
    DM.Combate.pasoTorretas(this, dt);
    DM.Trampas.efectos(this, dt);
    DM.Objetos.paso(this, dt);
    this.pasoPuertas(dt);
    for (let i = this.calor.length - 1; i >= 0; i--) if (this.calor[i].hasta < this.tiempo) this.calor.splice(i, 1);
    this.reglas.paso(dt);
    this.guardarHistoria();
  };

  // ---------- Choques entre cuerpos ----------
  // Nadie atraviesa a nadie: si un enemigo y un jugador se superponen, se separan;
  // el jugador además recibe un empujón hacia atrás. Entre jugadores, se separan suave.
  Mundo.prototype.resolverChoques = function () {
    const mapa = this.mapa;
    const lista = [];
    for (const id in this.jugadores) { const j = this.jugadores[id]; if (j.estado !== 'muerto' && !j.transicion) lista.push(j); }
    for (const j of lista) {
      for (const e of this.enemigos) {
        if (e.muerto || e.piso !== j.piso) continue;
        if (DM.ENEMIGOS[e.tipo].vuela && e.z > 0.3) continue;          // los drones vuelan por encima
        const dx = j.x - e.x, dy = j.y - e.y, d = Math.hypot(dx, dy), m = C.RADIO_JUGADOR + e.radio;
        if (d >= m) continue;
        const nx = d > 0.001 ? dx / d : Math.cos(j.ang + Math.PI), ny = d > 0.001 ? dy / d : Math.sin(j.ang + Math.PI);
        const solape = m - d;
        // El jugador cede más ante los enemigos grandes (guardián)
        const kj = e.tipo === 'guardian' ? 0.85 : 0.6;
        j.mover(nx * solape * kj, ny * solape * kj, mapa);
        const r = e.radio * 0.9;
        const ex = -nx * solape * (1 - kj), ey = -ny * solape * (1 - kj);
        if (!mapa.solida(e.piso, e.x + ex + Math.sign(ex) * r, e.y)) e.x += ex;
        if (!mapa.solida(e.piso, e.x, e.y + ey + Math.sign(ey) * r)) e.y += ey;
        // Empujón hacia atrás (y se frena el avance contra el enemigo)
        const contra = j.vx * -nx + j.vy * -ny;
        if (contra > 0) { j.vx += nx * contra; j.vy += ny * contra; }
        j.golpeX += nx * 1.6; j.golpeY += ny * 1.6;
      }
    }
    for (let a = 0; a < lista.length; a++) for (let b = a + 1; b < lista.length; b++) {
      const p = lista[a], q = lista[b];
      if (p.piso !== q.piso || p.estado === 'caido' || q.estado === 'caido') continue;
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy), m = C.RADIO_JUGADOR * 2;
      if (d >= m || d < 0.001) continue;
      const k = (m - d) * 0.5 / d;
      p.mover(dx * k, dy * k, mapa); q.mover(-dx * k, -dy * k, mapa);
    }
  };

  Mundo.prototype.iniciarTransicion = function (j, destino) {
    j.transicion = { t: 0, destino: destino, hecho: false, nuevoAng: null };
  };
  Mundo.prototype.pasoTransicion = function (j, dt) {
    if (!j.transicion) return;
    const tr = j.transicion, mapa = this.mapa;
    tr.t += dt;
    if (!tr.hecho && tr.t >= C.TRANSICION / 2) {
      const ex = mapa.extremos[tr.destino];
      j.piso = ex.piso; j.x = ex.llegada.x; j.y = ex.llegada.y;
      if (ex.llegada.ang !== null && ex.llegada.ang !== undefined) { j.ang = ex.llegada.ang; tr.nuevoAng = j.ang; }
      j.vx = 0; j.vy = 0;
      const p2 = mapa.pisos[j.piso];
      j.enEnlace = p2.enlace[p2.indice(Math.floor(j.x), Math.floor(j.y))];
      tr.hecho = true;
      this.evento({ t: 'piso', id: j.id, piso: j.piso, tipo: ex.tipo, ang: tr.nuevoAng });
    }
    if (tr.t >= C.TRANSICION) j.transicion = null;
  };

  // ---------- Puertas (corredizas y de secuencia) ----------
  Mundo.prototype.abrirPuerta = function (k) {
    const pu = this.mapa.puertas[k];
    if (!pu || pu.secuencia) return;
    if (!pu.abriendo) this.evento({ t: 'puerta', abre: true, piso: pu.piso, x: pu.x, y: pu.y });
    pu.abriendo = true;
    pu.espera = C.PUERTA_ESPERA;
  };
  Mundo.prototype.ocupada = function (pu) {
    const cx = pu.x + 0.5, cy = pu.y + 0.5;
    for (const id in this.jugadores) {
      const j = this.jugadores[id];
      if (j.piso === pu.piso && Math.abs(j.x - cx) < 0.5 + C.RADIO_JUGADOR && Math.abs(j.y - cy) < 0.5 + C.RADIO_JUGADOR) return true;
    }
    for (const e of this.enemigos) {
      if (!e.muerto && e.piso === pu.piso && Math.abs(e.x - cx) < 0.5 + e.radio && Math.abs(e.y - cy) < 0.5 + e.radio) return true;
    }
    return false;
  };
  Mundo.prototype.pasoPuertas = function (dt) {
    const puertas = this.mapa.puertas;
    for (let k = 0; k < puertas.length; k++) {
      const pu = puertas[k];
      const antes = pu.apertura;
      if (pu.secuencia) {
        // Se abren y cierran en orden, siguiendo el reloj
        const s = pu.secuencia;
        const u = ((this.tiempo - s.orden * s.periodo / s.n) % s.periodo + s.periodo) % s.periodo;
        let meta = u < s.abierta ? 1 : 0;
        if (this.ocupada(pu) && pu.apertura > 0.5) meta = 1;
        pu.apertura = meta > pu.apertura ? Math.min(1, pu.apertura + C.PUERTA_VEL * 1.5 * dt) : Math.max(0, pu.apertura - C.PUERTA_VEL * 1.5 * dt);
        if (antes < 0.5 && pu.apertura >= 0.5) this.evento({ t: 'puerta', abre: true, piso: pu.piso, x: pu.x, y: pu.y });
        continue;
      }
      // Se abre sola si alguien (jugador o enemigo) se acerca
      const cx = pu.x + 0.5, cy = pu.y + 0.5;
      let cerca = false;
      for (const id in this.jugadores) {
        const j = this.jugadores[id];
        if (j.piso === pu.piso && !j.transicion && j.estado !== 'muerto' && Math.hypot(j.x - cx, j.y - cy) < C.PUERTA_DIST_AUTO) cerca = true;
      }
      if (!cerca) for (const e of this.enemigos) if (!e.muerto && e.piso === pu.piso && Math.hypot(e.x - cx, e.y - cy) < C.PUERTA_DIST_AUTO) { cerca = true; break; }
      if (cerca) { if (!pu.abriendo) this.abrirPuerta(k); pu.espera = C.PUERTA_ESPERA; }
      if (pu.abriendo) {
        pu.apertura = Math.min(1, pu.apertura + C.PUERTA_VEL * dt);
        if (pu.apertura >= 1) {
          pu.espera -= dt;
          if (pu.espera <= 0 && !this.ocupada(pu)) { pu.abriendo = false; this.evento({ t: 'puerta', abre: false, piso: pu.piso, x: pu.x, y: pu.y }); }
        }
      } else if (pu.apertura > 0) {
        if (this.ocupada(pu)) { pu.abriendo = true; pu.espera = 1; }
        else pu.apertura = Math.max(0, pu.apertura - C.PUERTA_VEL * dt);
      }
    }
  };

  DM.Mundo = Mundo;
})();
