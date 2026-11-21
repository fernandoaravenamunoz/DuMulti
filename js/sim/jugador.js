// =====================================================
// Jugador (simulación pura: sin dibujo, sin DOM, sin audio)
// Posición, velocidad con inercia, colisiones, mirada, efectos de estado,
// vida, escudo, armas que lleva y lanzables.
// (Movimiento y colisiones adaptados de entidades/jugador.js de Worodorox 3073.)
//
// COMANDO por paso de simulación (lo arma main.js o llega por la red):
//   avance, lateral (−1..1), correr, ang, pitch (absolutos),
//   disparo (mantenido), usar (mantenido), usarToque (recién presionado),
//   lanzar (toque), arma (0 nada, 1-4 elegir, 5 siguiente, 6 anterior),
//   cambiaLanzable (toque), recargar (toque), seq (número de secuencia)
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;
  const C = DM.config;

  function Jugador(id, personaje, puesto) {
    const pj = DM.PERSONAJES[personaje] || DM.PERSONAJES.pirulo;
    this.id = id;
    this.puesto = puesto || 0;     // 0..7 (orden en la sala)
    this.personaje = DM.PERSONAJES[personaje] ? personaje : 'pirulo';
    this.nombre = pj.nombre;
    this.equipo = null;            // 0 cian, 1 amarillo (versus por equipos)
    this.propias = DM.ARMAS_PROPIAS[this.personaje];
    this.piso = 0; this.x = 1.5; this.y = 1.5;
    this.vx = 0; this.vy = 0; this.ang = 0; this.pitch = 0;
    this.camZ = C.OJOS; this.bob = 0; this.andar = 0;
    this.golpeX = 0; this.golpeY = 0;     // empujes que decaen
    this.empujeX = 0; this.empujeY = 0;   // empujes de este paso (ventilas)
    this.vidaMax = pj.vida; this.vida = pj.vida; this.escudo = pj.escudo;
    this.estado = 'vivo';          // 'vivo' | 'caido' (cooperativo) | 'muerto' (esperando reaparecer)
    this.tCaido = 0; this.reviviendo = 0; this.tReaparecer = 0;
    this.arma = 2;                 // 1 puños, 2 contacto, 3 distancia, 4 pesada
    this.pesada = null;            // { id, municion }
    this.cargador = {};            // balas en el cargador de cada arma propia
    this.cargador[this.propias[1]] = DM.ARMAS[this.propias[1]].cargador;
    this.recargando = 0;
    this.ataque = 0; this.recarga = 0;
    this.rafaga = 0; this.tRafaga = 0;
    this.cargaT = 0;               // carga del láser o del desintegrador (0 = nada)
    this.disparando = 0;           // > 0 mientras usa un arma de cono (para dibujar el chorro)
    this.lanzables = { granada: 1, mina: 0, bengala: 0, emp: 0, torreta: 0 };
    this.lanzSel = 'granada';
    this.ef = { aturdido: 0, ralentizado: 0, congelado: 0, paralizado: 0, veneno: 0, dios: 0, proteccion: 0, hud: 0, flash: 0 };
    this.bajas = 0; this.muertes = 0; this.puntos = 0;
    this.ultimoAtacante = null; this.tUltimoAtacante = 0;
    this.transicion = null; this.enEnlace = -1;
    this.seq = 0;                  // último comando procesado (para la predicción del cliente)
    this.leidos = {};              // registros leídos (versus: personal; coop: se comparte)
    this.ultimoUsar = false;
  }

  Jugador.prototype.ubicar = function (pos, ang) {
    this.piso = pos.piso; this.x = pos.x; this.y = pos.y;
    if (ang !== undefined && ang !== null) this.ang = ang;
    this.vx = this.vy = 0; this.golpeX = this.golpeY = 0;
    this.enEnlace = -1; this.transicion = null;
  };

  // Vuelve con vida completa (reaparecer o reimpresión)
  Jugador.prototype.reiniciar = function (pos, ang) {
    const pj = DM.PERSONAJES[this.personaje];
    this.ubicar(pos, ang);
    this.vida = this.vidaMax; this.escudo = pj.escudo;
    this.estado = 'vivo'; this.tCaido = 0; this.reviviendo = 0; this.tReaparecer = 0;
    for (const k in this.ef) this.ef[k] = 0;
    this.ef.proteccion = C.PROTECCION_REAPARECER;
    this.cargaT = 0; this.rafaga = 0; this.recargando = 0;
  };

  Jugador.prototype.vivo = function () { return this.estado === 'vivo'; };

  // Multiplicador de velocidad por personaje y efectos
  Jugador.prototype.factorVelocidad = function () {
    const e = this.ef;
    if (e.paralizado > 0) return 0;
    let f = (DM.PERSONAJES[this.personaje].velocidad || 1);
    if (e.congelado > 0) f *= 0.2;
    else if (e.ralentizado > 0) f *= 0.5;
    if (e.aturdido > 0) f *= 0.35;
    return f;
  };

  // Mover con colisión por ejes separados (permite deslizarse por las paredes)
  Jugador.prototype.mover = function (mx, my, mapa) {
    const r = C.RADIO_JUGADOR, p = this.piso;
    if (mx !== 0) {
      const nx = this.x + mx, bx = nx + Math.sign(mx) * r;
      if (!mapa.solida(p, bx, this.y - r) && !mapa.solida(p, bx, this.y + r)) this.x = nx;
      else this.vx = 0;
    }
    if (my !== 0) {
      const ny = this.y + my, by = ny + Math.sign(my) * r;
      if (!mapa.solida(p, this.x - r, by) && !mapa.solida(p, this.x + r, by)) this.y = ny;
      else this.vy = 0;
    }
  };

  // Solo movimiento y mirada (también lo usa el cliente para predecir su propio movimiento)
  Jugador.prototype.pasoMovimiento = function (dt, cmd, mapa) {
    this.ang = cmd.ang;
    this.pitch = Math.max(-1, Math.min(1, cmd.pitch));
    const quieto = !!this.transicion || this.estado !== 'vivo';
    let f = quieto ? 0 : cmd.avance, s = quieto ? 0 : cmd.lateral;
    const largo = Math.hypot(f, s);
    if (largo > 1) { f /= largo; s /= largo; }
    const vmax = (cmd.correr ? C.VEL_CORRER : C.VEL_CAMINAR) * this.factorVelocidad();
    const dx = Math.cos(this.ang), dy = Math.sin(this.ang);
    const objX = (dx * f - dy * s) * vmax, objY = (dy * f + dx * s) * vmax;
    const k = Math.min(1, C.ACELERACION * dt);
    this.vx += (objX - this.vx) * k;
    this.vy += (objY - this.vy) * k;
    if (Math.abs(this.vx) < 0.001) this.vx = 0;
    if (Math.abs(this.vy) < 0.001) this.vy = 0;
    const ex = (this.empujeX + this.golpeX) * dt, ey = (this.empujeY + this.golpeY) * dt;
    this.empujeX = this.empujeY = 0;
    const dec = Math.max(0, 1 - dt * 6);
    this.golpeX *= dec; this.golpeY *= dec;
    this.mover(this.vx * dt + ex, this.vy * dt + ey, mapa);

    const rapidez = Math.hypot(this.vx, this.vy);
    this.andar = Math.min(1, rapidez / C.VEL_CORRER);
    const altura = this.estado === 'vivo' ? C.OJOS : 0.12;   // caído: la cámara queda en el suelo
    if (rapidez > 0.2 && this.estado === 'vivo') {
      this.bob += dt * (6 + rapidez * 1.6);
      this.camZ = altura + Math.sin(this.bob * 2) * 0.014 * this.andar;
    } else this.camZ += (altura - this.camZ) * Math.min(1, dt * 8);
  };

  // Temporizadores de efectos y animaciones
  Jugador.prototype.pasoEfectos = function (dt) {
    const e = this.ef;
    for (const k in e) if (e[k] > 0) e[k] = Math.max(0, e[k] - dt);
    if (this.recarga > 0) this.recarga -= dt;
    if (this.ataque > 0) { this.ataque += dt * 3.4; if (this.ataque >= 1) this.ataque = 0; }
    if (this.disparando > 0) this.disparando -= dt;
    if (this.tUltimoAtacante > 0) this.tUltimoAtacante -= dt;
  };

  // Datos del arma que tiene en la mano
  Jugador.prototype.armaActual = function () {
    if (this.arma === 1) return 'punos';
    if (this.arma === 2) return this.propias[0];
    if (this.arma === 3) return this.propias[1];
    return this.pesada ? this.pesada.id : this.propias[1];
  };

  DM.Jugador = Jugador;
})();
