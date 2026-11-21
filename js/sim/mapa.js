// =====================================================
// Mapa de varios pisos (datos puros, sin dibujo ni DOM)
// Convierte la definición de js/mapas/*.js en grillas rápidas de consultar.
//
// Por cada piso:
//  paredes  : tipo de pared de cada casilla (0 = vacío) — ver DM.PARED
//  suelo    : tipo de piso de cada casilla vacía — ver DM.SUELO
//  bloqueo  : casillas ocupadas por algo sólido que no es pared (barriles)
//  puerta   : índice de la puerta en mapa.puertas (−1 si no hay)
//  enlace   : índice del extremo de escalera/ascensor en mapa.extremos (−1 si no hay)
//  trampa   : índice de la trampa en mapa.trampas (−1 si no hay)
//
// Lo usan la simulación, el motor de dibujo y scripts/validar-mapas.js.
// =====================================================
(function () {
  'use strict';
  const raiz = typeof window !== 'undefined' ? window : globalThis;
  const DM = raiz.DM;

  function Piso(def, n) {
    this.n = n;
    this.nombre = def.nombre || ('PISO ' + (n + 1));
    this.alto = def.mapa.length;
    this.ancho = def.mapa[0].length;
    const t = this.ancho * this.alto;
    this.paredes = new Uint8Array(t);
    this.paredOriginal = null;     // copia para reiniciar (rejillas rotas, aplastadores)
    this.suelo = new Uint8Array(t);
    this.bloqueo = new Uint8Array(t);
    this.puerta = new Int16Array(t).fill(-1);
    this.enlace = new Int16Array(t).fill(-1);
    this.trampa = new Int16Array(t).fill(-1);
    this.lamparas = (def.lamparas || []).map(function (l) {
      return { x: l[0], y: l[1], parpadea: l[2] === 'parpadea' };
    });
  }
  Piso.prototype.dentro = function (x, y) { return x >= 0 && y >= 0 && x < this.ancho && y < this.alto; };
  Piso.prototype.indice = function (x, y) { return y * this.ancho + x; };
  Piso.prototype.pared = function (x, y) {
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return 1;
    return this.paredes[y * this.ancho + x];
  };

  function Mapa(def) {
    this.def = def;
    this.id = def.id;
    this.nombre = def.nombre;
    this.pisos = [];
    this.puertas = [];      // { piso, x, y, eje, apertura, abriendo, espera, secuencia }
    this.extremos = [];     // { tipo, piso, x, y, otro, llegada }
    this.trampas = [];      // { car, piso, x, y }  (la lógica está en sim/trampas.js)
    this.barriles = [];     // { piso, x, y }
    this.cartas = [];       // { piso, x, y }
    this.apariciones = [];  // puntos de aparición de jugadores { piso, x, y }
    this.aparicionesZ = []; // puntos de aparición de enemigos
    this.inicio = null;
    this.consolas = [];     // consolas de objetivo de la campaña (paredes O) { k, piso, x, y }
    this.salidas = [];      // casillas de la zona de salida (!) { piso, x, y }
    this.errores = [];

    const self = this;
    def.pisos.forEach(function (dp, n) {
      const p = new Piso(dp, n);
      self.pisos.push(p);
      for (let y = 0; y < p.alto; y++) {
        const fila = dp.mapa[y];
        if (fila.length !== p.ancho) self.errores.push(p.nombre + ': la fila ' + y + ' mide ' + fila.length + ' (deberia medir ' + p.ancho + ')');
        for (let x = 0; x < p.ancho; x++) {
          const ch = fila[x] || '#';
          const i = y * p.ancho + x;
          const pos = { piso: n, x: x + 0.5, y: y + 0.5 };
          if (DM.CAR_PARED[ch] !== undefined) {
            p.paredes[i] = DM.CAR_PARED[ch];
            if (ch === 'O') self.consolas.push({ k: self.consolas.length, piso: n, x: x, y: y });
          } else if (DM.CAR_SUELO[ch] !== undefined) {
            p.suelo[i] = DM.CAR_SUELO[ch];
            if (ch === '!') self.salidas.push({ piso: n, x: x, y: y });
          }
          else if (DM.CAR_TRAMPAS.indexOf(ch) >= 0) {
            p.trampa[i] = self.trampas.length;
            self.trampas.push({ car: ch, piso: n, x: x, y: y });
          } else if (DM.CAR_COSAS.indexOf(ch) >= 0) {
            if (ch === '@') self.inicio = { piso: n, x: x + 0.5, y: y + 0.5, ang: (def.inicio && def.inicio.ang) || 0 };
            else if (ch === 'p') self.apariciones.push(pos);
            else if (ch === 'Z') { self.aparicionesZ.push(pos); p.suelo[i] = DM.SUELO.CRIO; }
            else if (ch === 'b') { self.barriles.push(pos); p.bloqueo[i] = 1; }
            else if (ch === 'h') self.cartas.push(pos);
          } else {
            self.errores.push(p.nombre + ': caracter desconocido "' + ch + '" en (' + x + ', ' + y + ')');
            p.paredes[i] = 1;
          }
        }
      }
      p.paredOriginal = p.paredes.slice();
      // Puertas y compuertas de secuencia (el eje se deduce de las paredes vecinas)
      const secuencia = [];
      for (let y = 0; y < p.alto; y++) for (let x = 0; x < p.ancho; x++) {
        const i = y * p.ancho + x;
        const tipo = p.paredes[i];
        if (!tipo || !DM.PAREDES[tipo].puerta) continue;
        const murosX = p.pared(x - 1, y) > 0 && p.pared(x + 1, y) > 0;
        const murosY = p.pared(x, y - 1) > 0 && p.pared(x, y + 1) > 0;
        if (!murosX && !murosY) self.errores.push(p.nombre + ': la puerta en (' + x + ', ' + y + ') necesita paredes a ambos lados');
        p.puerta[i] = self.puertas.length;
        const pu = { piso: n, x: x, y: y, eje: murosX ? 'x' : 'y', apertura: 0, abriendo: false, espera: 0, secuencia: null };
        if (tipo === DM.PARED.SECUENCIA) secuencia.push(pu);
        self.puertas.push(pu);
      }
      // Orden de la secuencia: de oeste a este y de norte a sur
      const ds = (def.secuencias || []).find(function (s) { return s.piso === n; }) || { periodo: 8, abierta: 3 };
      secuencia.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
      secuencia.forEach(function (pu, k) { pu.secuencia = { orden: k, n: secuencia.length, periodo: ds.periodo, abierta: ds.abierta }; });
    });
    if (!this.inicio) this.inicio = this.apariciones[0] ? Object.assign({ ang: 0 }, this.apariciones[0]) : { piso: 0, x: 1.5, y: 1.5, ang: 0 };
    if (!this.apariciones.length) this.apariciones.push(this.inicio);

    // Enlaces entre pisos
    (def.enlaces || []).forEach(function (en) {
      const a = self.extremos.length;
      en.extremos.forEach(function (ex, k) {
        const p = self.pisos[ex.piso];
        if (!p) { self.errores.push('Enlace hacia un piso que no existe: ' + ex.piso); return; }
        self.extremos.push({ tipo: en.tipo, piso: ex.piso, x: ex.x, y: ex.y, otro: a + (1 - k), llegada: ex.llegada });
        p.enlace[p.indice(ex.x, ex.y)] = a + k;
      });
    });

    // Interruptores (la pared del panel) y registros
    this.interruptores = (def.interruptores || []).map(function (s, k) { return { k: k, piso: s.piso, x: s.x, y: s.y, zona: s.zona }; });
    this.registros = (def.registros || []).slice();
  }

  // Abertura de la puerta de una casilla (1 si no hay puerta)
  Mapa.prototype.apertura = function (piso, x, y) {
    const p = this.pisos[piso];
    const k = p.puerta[p.indice(x, y)];
    return k >= 0 ? this.puertas[k].apertura : 1;
  };

  // ¿Es sólido el punto (x, y) del piso? (paredes, puertas cerradas, barriles)
  Mapa.prototype.solida = function (piso, x, y) {
    const p = this.pisos[piso];
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= p.ancho || cy >= p.alto) return true;
    const i = cy * p.ancho + cx;
    if (p.bloqueo[i]) return true;
    const t = p.paredes[i];
    if (!t) return false;
    const k = p.puerta[i];
    if (k >= 0) return this.puertas[k].apertura < 0.85;
    return true;
  };

  // ¿Deja pasar la vista/las balas esta casilla?
  Mapa.prototype.transparente = function (piso, cx, cy) {
    const p = this.pisos[piso];
    const t = p.pared(cx, cy);
    if (!t) return true;
    const info = DM.PAREDES[t];
    if (info.transparente) return true;
    if (info.puerta) return this.mapaApertura(piso, cx, cy) > 0.85;
    return false;
  };
  Mapa.prototype.mapaApertura = Mapa.prototype.apertura;

  // ¿Está el punto en la zona de salida?
  Mapa.prototype.enSalida = function (piso, x, y) {
    const p = this.pisos[piso];
    const cx = Math.floor(x), cy = Math.floor(y);
    if (!p.dentro(cx, cy)) return false;
    const i = cy * p.ancho + cx;
    return !p.paredes[i] && p.suelo[i] === DM.SUELO.SALIDA;
  };

  // Línea de visión dentro de un piso (muestreo cada 0,2 casillas)
  Mapa.prototype.lineaVision = function (piso, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 0.2);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (!this.transparente(piso, Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t))) return false;
    }
    return true;
  };

  DM.Mapa = Mapa;
})();
