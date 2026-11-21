// =====================================================
// Reglas de cada modo (simulación pura)
//
// COOPERATIVO: 8 oleadas cada vez más difíciles que salen de las cápsulas y
//   convergen a la sala central; la última trae al robot guardián.
//   Un jugador sin vida queda CAÍDO: un compañero lo revive manteniendo USAR a su lado.
//   Si nadie lo revive a tiempo, reaparece en la estación de respaldo más cercana.
//   Si caen TODOS a la vez, el equipo gasta una de sus 3 reimpresiones; sin
//   reimpresiones, la partida se pierde. Se gana al sobrevivir las 8 oleadas.
// VERSUS: todos contra todos o por equipos, con la configuración de la sala.
//   Puntaje: rival +1 · suicidio −1 · compañero −1 · zombi/robot 0 (o −1)
//   · rival muerto en una trampa que activaste con un interruptor: +1 para ti.
//   Gana quien llega primero a la meta o va arriba al acabar el tiempo;
//   si hay empate, MUERTE SÚBITA: la siguiente baja decide.
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;
  const C = DM.config;

  // ---------- Utilidades ----------
  function vivos(mundo) { const l = []; for (const id in mundo.jugadores) { const j = mundo.jugadores[id]; if (j.estado === 'vivo') l.push(j); } return l; }
  function listaJugadores(mundo) { return Object.keys(mundo.jugadores).map(function (k) { return mundo.jugadores[k]; }); }

  // Punto de aparición.
  //   modo false     → el de su puesto (cooperativo, campaña)
  //   modo 'inicio'  → el más alejado (por camino) de los ya ubicados (comienzo del versus)
  //   modo true      → reaparición del versus a DISTANCIA MEDIA: que ningún rival vivo
  //                    lo vea y a 8–14 casillas de camino del rival más cercano
  //                    (si ninguno cumple, el más cercano a ese rango).
  const REAP_MIN = 8, REAP_MAX = 14;
  function puntoAparicion(mundo, j, modo, ubicados) {
    const ap = mundo.mapa.apariciones, mapa = mundo.mapa;
    if (!modo) return ap[(j.puesto || 0) % ap.length];
    if (modo === 'inicio') {
      const otros = ubicados || [];
      let mejor = 0, md = -1;
      for (let k = 0; k < ap.length; k++) {
        if (otros.indexOf(k) >= 0) continue;
        let m = otros.length ? 1e9 : mundo.azar() * 10;
        for (const o of otros) { const d = mapa.distanciaDesdeAparicion(k, ap[o].piso, ap[o].x, ap[o].y); m = Math.min(m, d < 0 ? 999 : d); }
        m += mundo.azar() * 2;
        if (m > md) { md = m; mejor = k; }
      }
      if (ubicados) ubicados.push(mejor);
      return ap[mejor];
    }
    const rivales = vivos(mundo).filter(function (o) { return o !== j && mundo.sonRivales(j, o); });
    if (!rivales.length) return ap[Math.floor(mundo.azar() * ap.length)];
    let mejor = ap[0], mp = 1e9;
    for (let k = 0; k < ap.length; k++) {
      const p = ap[k];
      let dmin = 1e9, visto = false;
      for (const o of rivales) {
        const d = mapa.distanciaDesdeAparicion(k, o.piso, o.x, o.y);
        dmin = Math.min(dmin, d < 0 ? 999 : d);
        if (o.piso === p.piso && Math.hypot(o.x - p.x, o.y - p.y) < 30 && mapa.lineaVision(p.piso, p.x, p.y, o.x, o.y)) visto = true;
      }
      const desvio = dmin < REAP_MIN ? (REAP_MIN - dmin) * 1.5 : dmin > REAP_MAX ? dmin - REAP_MAX : 0;
      const puntaje = (visto ? 1000 : 0) + desvio + mundo.azar() * 0.8;
      if (puntaje < mp) { mp = puntaje; mejor = p; }
    }
    return mejor;
  }

  // Estación de respaldo más cercana (si el mapa no tiene, un punto de aparición)
  function estacionCercana(mundo, j) {
    const mapa = mundo.mapa;
    let mejor = null, md = 1e9;
    mapa.pisos.forEach(function (p, n) {
      for (let i = 0; i < p.suelo.length; i++) {
        if (p.suelo[i] !== DM.SUELO.ESTACION || p.paredes[i]) continue;
        const x = i % p.ancho + 0.5, y = Math.floor(i / p.ancho) + 0.5;
        const d = Math.hypot(x - j.x, y - j.y) + (n !== j.piso ? 10 : 0);
        if (d < md) { md = d; mejor = { piso: n, x: x, y: y }; }
      }
    });
    return mejor || puntoAparicion(mundo, j, false);
  }

  // =====================================================
  // COOPERATIVO
  // =====================================================
  function Coop(mundo) {
    this.mundo = mundo;
    this.oleada = 0;               // 1..8 (0 = preparándose)
    this.total = DM.Partida.OLEADAS.length;
    this.cola = [];                // enemigos que faltan por salir
    this.tSalida = 0;
    this.tPausa = 6;               // cuenta regresiva antes de la siguiente oleada
    this.vidas = C.VIDAS_EQUIPO;
    this.terminado = false; this.resultado = null;
    this.tReimpresion = 0;
    this.bajasEquipo = 0;
  }
  Coop.prototype.iniciar = function () {
    const m = this.mundo;
    listaJugadores(m).forEach(function (j) { j.reiniciar(puntoAparicion(m, j, false), m.mapa.inicio.ang); j.ef.proteccion = 0; });
  };
  Coop.prototype.empezarOleada = function () {
    const m = this.mundo;
    this.oleada++;
    const def = DM.Partida.OLEADAS[this.oleada - 1];
    const n = Math.max(1, listaJugadores(m).length);
    const mult = 1 + 0.35 * (n - 1);
    this.cola = [];
    for (const tipo in def) {
      const cant = tipo === 'guardian' ? def[tipo] : Math.round(def[tipo] * mult);
      for (let k = 0; k < cant; k++) this.cola.push(tipo);
    }
    // Mezcla (los zombis lentos primero, los demás intercalados)
    for (let i = this.cola.length - 1; i > 0; i--) { const k = Math.floor(m.azar() * (i + 1)); const t = this.cola[i]; this.cola[i] = this.cola[k]; this.cola[k] = t; }
    this.tSalida = 0;
    m.evento({ t: 'oleada', n: this.oleada, total: this.total, final: this.oleada === this.total });
    const premio = DM.Partida.PREMIOS_COOP[this.oleada];
    if (premio) DM.Objetos.aparecerPremio(m, premio);
    if (this.oleada === this.total) DM.Objetos.aparecerPremio(m, 'arma:desintegrador');
  };
  Coop.prototype.paso = function (dt) {
    const m = this.mundo;
    if (this.terminado) return;
    // Oleadas
    const quedan = m.enemigos.filter(function (e) { return !e.muerto; }).length;
    if (this.oleada === 0 || (this.cola.length === 0 && quedan === 0)) {
      if (this.oleada >= this.total) { this.terminar('victoria'); return; }
      if (this.tPausa === null) { this.tPausa = 8; m.evento({ t: 'anuncio', texto: 'OLEADA ' + this.oleada + ' SUPERADA', color: 'verde' }); }
      this.tPausa -= dt;
      if (this.tPausa <= 0) { this.tPausa = null; this.empezarOleada(); }
    } else if (this.cola.length) {
      this.tSalida -= dt;
      if (this.tSalida <= 0 && quedan < 40) {
        this.tSalida = 0.55;
        const tipo = this.cola.shift();
        m.aparecerEnemigo(tipo);
      }
    }
    this.pasoCaidos(dt);
  };
  // Caídos (revivir / estación) y reimpresión del equipo. Compartido con la campaña.
  Coop.prototype.pasoCaidos = function (dt) {
    const m = this.mundo;
    // Caídos: revivir o reaparecer en la estación
    const lista = listaJugadores(m);
    for (const j of lista) {
      if (j.estado !== 'caido') continue;
      j.tCaido -= dt;
      // ¿Algún compañero mantiene USAR a su lado?
      let ayuda = 0;
      for (const o of lista) {
        if (o === j || o.estado !== 'vivo' || o.piso !== j.piso || !o.ultimoUsar) continue;
        if (Math.hypot(o.x - j.x, o.y - j.y) < C.DIST_REVIVIR) ayuda = Math.max(ayuda, o.personaje === 'pantuflina' ? 2 : 1);
      }
      if (ayuda) {
        j.reviviendo += dt * ayuda / C.TIEMPO_REVIVIR;
        if (j.reviviendo >= 1) {
          j.estado = 'vivo'; j.vida = C.VIDA_AL_REVIVIR; j.reviviendo = 0; j.ef.proteccion = 1;
          m.evento({ t: 'revivido', id: j.id });
        }
      } else j.reviviendo = Math.max(0, j.reviviendo - dt * 0.5);
      if (j.estado === 'caido' && j.tCaido <= 0) {
        j.reiniciar(estacionCercana(m, j), null);
        m.evento({ t: 'reaparece', id: j.id, estacion: true });
      }
    }
    // ¿Cayeron todos?
    if (lista.length && !lista.some(function (j) { return j.estado === 'vivo'; })) {
      this.tReimpresion += dt;
      if (this.tReimpresion > 2) {
        this.tReimpresion = 0;
        this.vidas--; this.vidasUsadas = (this.vidasUsadas || 0) + 1;
        if (this.vidas <= 0) { this.terminar('derrota'); return; }
        for (const j of lista) j.reiniciar(estacionCercana(m, j), null);
        m.evento({ t: 'anuncio', texto: 'REIMPRESION DEL EQUIPO. QUEDAN ' + this.vidas, color: 'magenta' });
      }
    } else this.tReimpresion = 0;
  };
  Coop.prototype.alMorirJugador = function (j, info) {
    const m = this.mundo;
    // Fuego amigo en cooperativo: matar a un compañero resta 1 baja
    if (info.atacante && info.atacante.clase === 'jugador' && info.atacante !== j) info.atacante.bajas = Math.max(0, info.atacante.bajas - 1);
    j.muertes++;
    j.estado = 'caido'; j.tCaido = C.TIEMPO_CAIDO; j.reviviendo = 0; j.cargaT = 0;
    j.vida = 0;
    if (j.pesada) DM.Objetos.soltarArma(m, j);
  };
  Coop.prototype.alMorirEnemigo = function (e, info) {
    const a = info.atacante;
    this.bajasEquipo++;
    if (a && a.clase === 'jugador') { a.bajas++; a.puntos += DM.ENEMIGOS[e.tipo].puntos; }
    else if (info.trampaDe) { info.trampaDe.bajas++; }
  };
  Coop.prototype.terminar = function (res) {
    this.terminado = true; this.resultado = res;
    this.mundo.evento({ t: 'fin', resultado: res });
  };
  Coop.prototype.estado = function () {
    const quedan = this.mundo.enemigos.filter(function (e) { return !e.muerto; }).length + this.cola.length;
    return { modo: 'coop', oleada: this.oleada, total: this.total, quedan: quedan, pausa: this.tPausa, vidas: this.vidas, fin: this.terminado ? this.resultado : null, secretos: [this.mundo.secretosHallados.length, this.mundo.mapa.secretos.length] };
  };


  // =====================================================
  // CAMPAÑA: 5 sectores con fases (ver js/datos/campana.js)
  // Usa las mismas reglas de caídos, reviviendo y reimpresiones del cooperativo.
  // =====================================================
  function Campana(mundo, idNivel) {
    Coop.call(this, mundo);
    this.nivel = DM.CAMPANA_POR_ID[idNivel] || DM.CAMPANA[0];
    this.fases = this.nivel.fases;
    this.fase = -1;               // −1 = presentación del sector
    this.tPausa = 5;              // segundos hasta empezar la primera fase
    this.tFase = 0;               // segundos desde que empezó la fase
    this.tGoteo = 3;
    this.premiosDados = {};
    this.consolas = mundo.mapa.consolas.map(function () { return 0; });   // progreso 0..1
    this.usandoConsola = {};      // k → último instante en que alguien la mantuvo
    this.restante = -1;           // resistir / límite de la salida
    this.jefe = null;
    this.enSalida = 0;
  }
  Campana.prototype = Object.create(Coop.prototype);
  Campana.prototype.constructor = Campana;

  Campana.prototype.faseActual = function () { return this.fase >= 0 ? this.fases[this.fase] : null; };
  Campana.prototype.multJugadores = function () { return 1 + 0.35 * (Math.max(1, listaJugadores(this.mundo).length) - 1); };

  Campana.prototype.empezarFase = function (k) {
    const m = this.mundo, f = this.fases[k];
    this.fase = k; this.tFase = 0; this.tGoteo = 4; this.premiosDados = {};
    this.restante = -1; this.oleada = 0; this.cola = []; this.tPausa = null;
    if (f.tipo === 'oleadas') { this.total = f.oleadas.length; this.tPausa = 3; }
    if (f.tipo === 'activar') this.usandoConsola = {};
    if (f.tipo === 'resistir') this.restante = f.segundos;
    if (f.tipo === 'salida' && f.limite) this.restante = f.limite;
    if (f.tipo === 'jefe') {
      const a = f.aparece || m.mapa.aparicionesZ[0] || m.mapa.apariciones[0];
      const e = new DM.Enemigos.Enemigo(m.nuevoId(), 'guardian', { piso: a.piso, x: a.x, y: a.y });
      e.vida = e.vidaMax = Math.round(e.vida * (1 + 0.5 * (listaJugadores(m).length - 1)));
      e.jefe = true;
      m.enemigos.push(e);
      this.jefe = e;
      m.evento({ t: 'aparece', tipo: 'guardian', piso: e.piso, x: e.x, y: e.y });
    }
    m.evento({ t: 'fase', n: k + 1, total: this.fases.length, tipo: f.tipo, texto: f.texto });
    m.evento({ t: 'anuncio', texto: f.texto, color: f.tipo === 'salida' ? 'verde' : 'amarillo' });
    this.darPremio('inicio');
  };
  Campana.prototype.darPremio = function (clave) {
    const f = this.faseActual();
    if (!f || !f.premios || this.premiosDados[clave]) return;
    const tipo = f.premios[clave];
    if (!tipo) return;
    this.premiosDados[clave] = true;
    DM.Objetos.aparecerPremio(this.mundo, tipo);
  };
  Campana.prototype.completarFase = function () {
    const m = this.mundo;
    if (this.fase + 1 >= this.fases.length) { this.terminar('victoria'); return; }
    m.evento({ t: 'anuncio', texto: 'OBJETIVO CUMPLIDO', color: 'verde' });
    this.empezarFase(this.fase + 1);
  };
  // Enemigos que siguen llegando durante la fase
  Campana.prototype.goteo = function (f, dt) {
    if (!f.goteo) return;
    const m = this.mundo, g = f.goteo;
    this.tGoteo -= dt;
    if (this.tGoteo > 0) return;
    this.tGoteo = g.cada / Math.sqrt(this.multJugadores());
    const vivosE = m.enemigos.filter(function (e) { return !e.muerto; }).length;
    if (vivosE >= Math.round(g.max * this.multJugadores())) return;
    m.aparecerEnemigo(g.tipos[Math.floor(m.azar() * g.tipos.length)]);
  };
  // Un jugador mantiene USAR frente a la consola k (lo llama el mundo en cada paso)
  Campana.prototype.usarConsola = function (k, j, dt) {
    const f = this.faseActual();
    if (!f || f.tipo !== 'activar' || this.consolas[k] >= 1) return;
    const antes = this.consolas[k];
    this.usandoConsola[k] = this.mundo.tiempo;
    // v1.2: con 2 o más jugadores, las consolas "juntas" solo avanzan si se mantienen a la vez
    if (this.deAVez(k)) {
      const m = this.mundo, u = this.usandoConsola, c = this.consolas;
      const otras = f.juntas.filter(function (q) { return q !== k && c[q] < 1; });
      if (otras.some(function (q) { return !(u[q] >= m.tiempo - 0.1); })) return;
    }
    this.consolas[k] = Math.min(1, antes + dt / (f.tiempo || 4));
    if (antes === 0) this.mundo.evento({ t: 'consola', k: k, on: false, id: j.id });
    if (this.consolas[k] >= 1) {
      const listas = this.consolas.filter(function (v) { return v >= 1; }).length;
      this.mundo.evento({ t: 'consola', k: k, on: true, id: j.id });
      this.mundo.evento({ t: 'anuncio', texto: 'CONSOLA ACTIVADA ' + listas + '/' + this.consolas.length, color: 'verde' });
    }
  };
  Campana.prototype.deAVez = function (k) {
    const f = this.faseActual();
    return !!(f && f.juntas && f.juntas.indexOf(k) >= 0 && listaJugadores(this.mundo).length >= 2);
  };
  // Texto del aviso frente a la consola (en un cliente de red se usa el estado recibido)
  Campana.prototype.textoConsola = function (k) {
    const st = this.mundo.estadoRed, f = this.faseActual();
    const tipo = st ? st.tipo : (f ? f.tipo : 'intro');
    const v = st ? (st.consolas[k] || 0) : this.consolas[k];
    if (v >= 1) return { texto: 'CONSOLA ACTIVADA', progreso: 1 };
    if (tipo !== 'activar') return { texto: 'CONSOLA SIN ENERGIA', progreso: 0 };
    const fj = this.fases[(st ? st.fase : this.fase + 1) - 1];
    if (fj && fj.juntas && fj.juntas.indexOf(k) >= 0 && Object.keys(this.mundo.jugadores).length >= 2) return { texto: 'MANTENGAN ESTA Y LA OTRA CONSOLA A LA VEZ', progreso: v };
    return { texto: 'MANTEN PARA ACTIVAR LA CONSOLA', progreso: v };
  };
  Campana.prototype.salidaActiva = function () { const f = this.faseActual(); return !!f && f.tipo === 'salida'; };

  Campana.prototype.paso = function (dt) {
    const m = this.mundo;
    if (this.terminado) return;
    if (this.fase >= 0) this.tTotal = (this.tTotal || 0) + dt;
    if (this.fase < 0) {
      this.tPausa -= dt;
      if (this.tPausa <= 0) this.empezarFase(0);
      this.pasoCaidos(dt);
      return;
    }
    const f = this.faseActual();
    this.tFase += dt;
    // Premios por tiempo (claves numéricas en fases que no son de oleadas)
    if (f.premios && f.tipo !== 'oleadas') for (const c in f.premios) if (c !== 'inicio' && this.tFase >= +c) this.darPremio(c);

    if (f.tipo === 'oleadas') {
      const quedan = m.enemigos.filter(function (e) { return !e.muerto; }).length;
      if (this.oleada === 0 || (this.cola.length === 0 && quedan === 0)) {
        if (this.oleada >= this.total) { this.completarFase(); }
        else {
          if (this.tPausa === null) { this.tPausa = 6; m.evento({ t: 'anuncio', texto: 'OLEADA ' + this.oleada + ' SUPERADA', color: 'verde' }); }
          this.tPausa -= dt;
          if (this.tPausa <= 0) {
            this.tPausa = null;
            this.oleada++;
            const def = f.oleadas[this.oleada - 1], mult = this.multJugadores();
            for (const tipo in def) { const cant = tipo === 'guardian' ? def[tipo] : Math.round(def[tipo] * mult); for (let k = 0; k < cant; k++) this.cola.push(tipo); }
            for (let i = this.cola.length - 1; i > 0; i--) { const k = Math.floor(m.azar() * (i + 1)); const t = this.cola[i]; this.cola[i] = this.cola[k]; this.cola[k] = t; }
            this.tSalida = 0;
            m.evento({ t: 'oleada', n: this.oleada, total: this.total, ultima: this.oleada === this.total });
            this.darPremio(String(this.oleada));
          }
        }
      } else if (this.cola.length) {
        this.tSalida -= dt;
        if (this.tSalida <= 0 && quedan < 40) { this.tSalida = 0.55; m.aparecerEnemigo(this.cola.shift()); }
      }
    } else {
      this.goteo(f, dt);
      if (f.tipo === 'activar') {
        if (this.consolas.length === 0 || this.consolas.every(function (v) { return v >= 1; })) this.completarFase();
      } else if (f.tipo === 'jefe') {
        if (!this.jefe || this.jefe.muerto) { m.evento({ t: 'anuncio', texto: 'EL GUARDIAN CAYO', color: 'verde' }); this.completarFase(); }
      } else if (f.tipo === 'resistir') {
        this.restante -= dt;
        if (this.restante <= 0) { this.restante = 0; this.completarFase(); }
      } else if (f.tipo === 'salida') {
        const lista = listaJugadores(m);
        let dentro = 0;
        for (const j of lista) if (j.estado === 'vivo' && m.mapa.enSalida(j.piso, j.x, j.y)) dentro++;
        this.enSalida = dentro;
        if (lista.length && dentro === lista.length) { this.completarFase(); return; }
        if (f.limite) {
          this.restante -= dt;
          if (this.restante <= 0) { this.restante = 0; m.evento({ t: 'anuncio', texto: 'SE ACABO EL TIEMPO', color: 'magenta' }); this.terminar('derrota'); return; }
        }
      }
    }
    if (!this.terminado) this.pasoCaidos(dt);
  };
  Campana.prototype.terminar = function (res) {
    if (this.terminado) return;
    this.terminado = true; this.resultado = res;
    this.mundo.evento({ t: 'fin', resultado: res, nivel: this.nivel.id });
  };
  Campana.prototype.estado = function () {
    const m = this.mundo, f = this.faseActual();
    const quedan = m.enemigos.filter(function (e) { return !e.muerto; }).length + this.cola.length;
    return {
      modo: 'campana', nivel: this.nivel.id, n: this.nivel.n, fase: this.fase + 1, fases: this.fases.length,
      tipo: f ? f.tipo : 'intro', texto: f ? f.texto : this.nivel.intro,
      oleada: this.oleada, total: this.total, quedan: quedan, pausa: this.tPausa, vidas: this.vidas,
      consolas: this.consolas.map(function (v) { return Math.floor(v * 100) / 100; }),
      restante: this.restante, salida: this.salidaActiva(), enSalida: this.enSalida, jugadores: listaJugadores(m).length,
      jefe: this.jefe && !this.jefe.muerto ? Math.max(0, this.jefe.vida / this.jefe.vidaMax) : (this.jefe ? 0 : -1),
      secretos: [m.secretosHallados.length, m.mapa.secretos.length], reimpresionesUsadas: this.vidasUsadas || 0, tiempo: Math.round(this.tTotal || 0),
      fin: this.terminado ? this.resultado : null
    };
  };

  // =====================================================
  // VERSUS
  // =====================================================
  function Versus(mundo) {
    this.mundo = mundo;
    this.conf = mundo.conf;
    this.tiempo = 0;
    this.muerteSubita = false;
    this.terminado = false; this.resultado = null; this.ganador = null;
    this.puntosEquipo = [0, 0];
    this.tEnemigos = 5;
  }
  Versus.prototype.iniciar = function () {
    const m = this.mundo, c = this.conf;
    const lista = listaJugadores(m).sort(function (a, b) { return a.puesto - b.puesto; });
    if (c.modo === 'equipos') {
      // Asignación balanceada (o la elección de cada uno, corrigiendo si queda muy dispareja)
      if (c.asignacion === 'auto' || lista.some(function (j) { return j.equipo !== 0 && j.equipo !== 1; })) lista.forEach(function (j, k) { j.equipo = k % 2; });
    } else lista.forEach(function (j) { j.equipo = null; });
    const ubicados = [], p0 = m.mapa.pisos[0], cx = p0.ancho / 2, cy = p0.alto / 2;
    for (const j of lista) {
      j.reiniciar(puntoAparicion(m, j, 'inicio', ubicados), null);
      j.ang = Math.atan2(cy - j.y, cx - j.x);
      j.bajas = 0; j.puntos = 0; j.muertes = 0;
    }
  };
  Versus.prototype.sumar = function (j, n) {
    j.puntos += n;
    if (n > 0) j.bajas += n;
    if (this.conf.modo === 'equipos' && j.equipo !== null) this.puntosEquipo[j.equipo] += n;
  };
  Versus.prototype.alMorirJugador = function (j, info) {
    const m = this.mundo, c = this.conf;
    const a = info.atacante;
    let texto;
    if (a && a.clase === 'jugador' && a !== j) {
      if (m.sonRivales(a, j)) { this.sumar(a, 1); texto = a.nombre + ' > ' + j.nombre; }
      else { this.sumar(a, -1); texto = a.nombre + ' > ' + j.nombre + ' (COMPANERO)'; }
    } else if (a === j || (info.tipo === 'aplastar' && !info.trampaDe) || (info.tipo === 'trampa' && !info.trampaDe)) {
      this.sumar(j, -1); texto = j.nombre + ' SE ELIMINO';
    } else if (info.trampaDe && info.trampaDe !== j) {
      if (m.sonRivales(info.trampaDe, j)) this.sumar(info.trampaDe, 1);
      texto = info.trampaDe.nombre + ' > ' + j.nombre + ' (TRAMPA)';
    } else if (info.trampaDe === j) { this.sumar(j, -1); texto = j.nombre + ' CAYO EN SU TRAMPA'; }
    else {
      if (c.castigoEnemigo) this.sumar(j, -1);
      texto = j.nombre + ' CAYO ANTE ' + (a && a.clase === 'enemigo' ? DM.ENEMIGOS[a.tipo].nombre : 'LA NAVE');
    }
    j.muertes++;
    j.estado = 'muerto'; j.tReaparecer = c.espera; j.cargaT = 0; j.vida = 0;
    if (j.pesada) DM.Objetos.soltarArma(m, j);
    if (DM.Partida.RIVAL_SUELTA_VIDA && c.objetos && c.objetos.elixirP !== false) DM.Objetos.soltar(m, 'elixirP', j.piso, j.x + 0.25, j.y);
    m.evento({ t: 'baja', texto: texto });
    this.revisarMeta();
    if (this.muerteSubita && !this.terminado) this.revisarEmpate(true);
  };
  Versus.prototype.alMorirEnemigo = function (e, info) {
    const a = info.atacante;
    if (a && a.clase === 'jugador') a.bajasEnemigos = (a.bajasEnemigos || 0) + 1;
  };
  Versus.prototype.marcadores = function () {
    const lista = listaJugadores(this.mundo);
    if (this.conf.modo === 'equipos') return [{ id: 0, pts: this.puntosEquipo[0] }, { id: 1, pts: this.puntosEquipo[1] }];
    return lista.map(function (j) { return { id: j.id, pts: j.puntos }; });
  };
  Versus.prototype.revisarMeta = function () {
    const meta = this.conf.bajasMeta;
    if (!meta) return;
    for (const s of this.marcadores()) if (s.pts >= meta) { this.terminar(s.id); return; }
  };
  // Al acabar el tiempo (o en muerte súbita tras cada baja): ¿hay un solo líder?
  Versus.prototype.revisarEmpate = function () {
    const s = this.marcadores().sort(function (a, b) { return b.pts - a.pts; });
    if (s.length < 2 || s[0].pts > s[1].pts) { this.terminar(s[0] ? s[0].id : null); return; }
    if (!this.muerteSubita) { this.muerteSubita = true; this.mundo.evento({ t: 'anuncio', texto: 'MUERTE SUBITA: LA SIGUIENTE BAJA DECIDE', color: 'magenta' }); }
  };
  Versus.prototype.terminar = function (ganador) {
    if (this.terminado) return;
    this.terminado = true; this.ganador = ganador;
    this.resultado = 'fin';
    this.mundo.evento({ t: 'fin', resultado: 'versus', ganador: ganador });
  };
  Versus.prototype.paso = function (dt) {
    const m = this.mundo, c = this.conf;
    if (this.terminado) return;
    this.tiempo += dt;
    if (c.duracion && !this.muerteSubita && this.tiempo >= c.duracion * 60) this.revisarEmpate();
    // Reaparición
    for (const j of listaJugadores(m)) {
      if (j.estado !== 'muerto') continue;
      j.tReaparecer -= dt;
      if (j.tReaparecer <= 0) { j.reiniciar(puntoAparicion(m, j, true), null); m.evento({ t: 'reaparece', id: j.id }); }
    }
    // Enemigos opcionales: se mantiene la población
    const tipos = DM.ORDEN_ENEMIGOS.filter(function (t) { return c.enemigos[t]; });
    if (tipos.length) {
      this.tEnemigos -= dt;
      const objetivo = { pocos: 4, normal: 8, muchos: 14 }[c.cantidadEnemigos] || 8;
      const vivosE = m.enemigos.filter(function (e) { return !e.muerto; });
      if (this.tEnemigos <= 0 && vivosE.length < objetivo) {
        this.tEnemigos = 2.5;
        let tipo = tipos[Math.floor(m.azar() * tipos.length)];
        if (tipo === 'guardian' && vivosE.some(function (e) { return e.tipo === 'guardian'; })) tipo = tipos[0] === 'guardian' ? null : tipos[0];
        if (tipo) m.aparecerEnemigo(tipo);
      }
    }
  };
  Versus.prototype.estado = function () {
    const c = this.conf;
    return {
      modo: 'versus', equipos: c.modo === 'equipos', puntosEquipo: this.puntosEquipo.slice(),
      restante: c.duracion ? Math.max(0, c.duracion * 60 - this.tiempo) : -1, meta: c.bajasMeta,
      subita: this.muerteSubita, fin: this.terminado ? 'versus' : null, ganador: this.ganador
    };
  };

  DM.Reglas = { Coop: Coop, Campana: Campana, Versus: Versus, puntoAparicion: puntoAparicion };
})();
