// =====================================================
// Armas y lanzables (datos para ajustar al probar)
//
// tipo:  'melee'   cono corto al frente (±25°)
//        'hitscan' el rayo llega al instante
//        'proyectil' la bala viaja y se puede esquivar
//        'cono'    chorro continuo de corto alcance (soplete, rociador)
//        'carga'   se carga y luego dispara un rayo (láser de dron)
//        'suprema' se carga y destruye todo lo visible (desintegrador)
// Valores: danio (por impacto), alcance (casillas), cadencia (s entre disparos),
//   dispersion (radianes), perdigones, caida (desde qué distancia pierde daño),
//   cargador + recarga (armas propias: munición infinita), municion (armas del mapa).
// efectos: aturdir, ralentizar, congelar, paralizar (segundos), empuje (casillas/s),
//   rebotes, atraviesa, area (radio), calor (atrae zombis), robots (multiplicador).
// forma: plantilla del dibujo en primera persona (ui/arma_fp.js)
// =====================================================
(function () {
  'use strict';
  const A = {};

  // ---------- Puños (todos) ----------
  A.punos = { nombre: 'PUNOS', tipo: 'melee', danio: 10, alcance: 1.2, cadencia: 0.35, empuje: 4, forma: 'punos', sonido: 'golpe' };

  // ---------- Armas de contacto propias ----------
  A.manopla = { nombre: 'MANOPLA DE CHISPAS', tipo: 'melee', danio: 18, alcance: 1.3, cadencia: 0.5, aturdir: 0.5, forma: 'manopla', color: '#22e4ff', sonido: 'chispazo' };
  A.fierro = { nombre: 'FIERRO', tipo: 'melee', danio: 34, alcance: 1.5, cadencia: 0.85, empuje: 3, forma: 'barra', color: '#7a828d', sonido: 'golpeMetal' };
  A.sarten = { nombre: 'SARTEN', tipo: 'melee', danio: 20, alcance: 1.3, cadencia: 0.6, bloquea: 0.75, forma: 'sarten', color: '#3a3a52', sonido: 'golpeMetal' };
  A.espatula = { nombre: 'ESPATULA AFILADA', tipo: 'melee', danio: 13, alcance: 1.3, cadencia: 0.24, forma: 'espatula', color: '#c8cbd6', sonido: 'corte' };
  A.palo = { nombre: 'PALO', tipo: 'melee', danio: 20, alcance: 2.0, cadencia: 0.6, empuje: 2, forma: 'barra', color: '#8a6d3a', sonido: 'golpe' };
  A.llave = { nombre: 'LLAVE CRIOGENICA', tipo: 'melee', danio: 16, alcance: 1.3, cadencia: 0.5, ralentizar: 2, forma: 'llave', color: '#9fe8f5', sonido: 'golpeMetal' };
  A.destornillador = { nombre: 'DESTORNILLADOR ELECTRICO', tipo: 'melee', danio: 15, alcance: 1.2, cadencia: 0.4, robots: 2, forma: 'destornillador', color: '#e8b923', sonido: 'chispazo' };
  A.porra = { nombre: 'PORRA DE SEGURIDAD', tipo: 'melee', danio: 18, alcance: 1.4, cadencia: 0.7, aturdir: 1, forma: 'barra', color: '#16151f', sonido: 'golpe' };

  // ---------- Armas a distancia propias (munición infinita con recarga) ----------
  A.resortera = { nombre: 'RESORTERA', tipo: 'proyectil', danio: 12, alcance: 18, cadencia: 0.45, vel: 18, cargador: 6, recarga: 1.2, bala: 'piedra', forma: 'resortera', color: '#8a6d3a', sonido: 'lanzar' };
  A.honda = { nombre: 'HONDA DE TUERCAS', tipo: 'proyectil', danio: 22, alcance: 16, cadencia: 0.9, vel: 12, cargador: 4, recarga: 1.6, gravedad: 0.6, bala: 'tuerca', forma: 'resortera', color: '#7a828d', sonido: 'lanzar' };
  A.tapas = { nombre: 'TAPAS DE LATA', tipo: 'proyectil', danio: 14, alcance: 16, cadencia: 0.55, vel: 14, cargador: 5, recarga: 1.4, rebotes: 1, bala: 'tapa', forma: 'lanzador', color: '#c8cbd6', sonido: 'lanzar' };
  A.tenedores = { nombre: 'TENEDORES', tipo: 'proyectil', danio: 7, alcance: 15, cadencia: 0.75, rafaga: 3, vel: 22, cargador: 9, recarga: 1.3, bala: 'tenedor', forma: 'lanzador', color: '#e6e3ff', sonido: 'lanzar' };
  A.cerbatana = { nombre: 'CERBATANA DE DARDOS', tipo: 'hitscan', danio: 17, alcance: 25, cadencia: 0.7, dispersion: 0, cargador: 5, recarga: 1.5, forma: 'tubo', color: '#4f6f3a', sonido: 'soplo' };
  A.ampollas = { nombre: 'AMPOLLAS DE REFRIGERANTE', tipo: 'proyectil', danio: 10, alcance: 12, cadencia: 0.8, vel: 10, gravedad: 0.8, area: 1, ralentizar: 2, cargador: 4, recarga: 1.6, bala: 'ampolla', forma: 'lanzador', color: '#9fe8f5', sonido: 'lanzar' };
  A.pernos = { nombre: 'LANZADOR DE PERNOS', tipo: 'proyectil', danio: 7, alcance: 16, cadencia: 0.15, vel: 20, cargador: 15, recarga: 1.8, bala: 'perno', forma: 'lanzador', color: '#e8b923', sonido: 'clavo' };
  A.aturdidor = { nombre: 'ATURDIDOR DE DARDOS', tipo: 'hitscan', danio: 5, alcance: 12, cadencia: 1.0, dispersion: 0.01, paralizar: 1, cargador: 3, recarga: 1.6, forma: 'tubo', color: '#16404c', sonido: 'soplo' };

  // ---------- Armas pesadas del mapa (munición limitada) ----------
  A.clavos = { nombre: 'PISTOLA DE CLAVOS', pesada: true, tipo: 'hitscan', danio: 11, alcance: 20, caida: 8, cadencia: 0.1, dispersion: 0.03, municion: 60, forma: 'pistola', color: '#4a4f63', sonido: 'clavo' };
  A.ballesta = { nombre: 'BALLESTA DE VARILLAS', pesada: true, tipo: 'proyectil', danio: 45, alcance: 15, cadencia: 1.1, vel: 26, atraviesa: 2, municion: 12, bala: 'varilla', forma: 'ballesta', color: '#7a828d', sonido: 'ballesta' };
  A.escopeta = { nombre: 'ESCOPETA DE REMACHES', pesada: true, tipo: 'hitscan', danio: 9, perdigones: 7, alcance: 6, caida: 3, cadencia: 0.9, dispersion: 0.12, municion: 16, forma: 'escopeta', color: '#5a4f63', sonido: 'escopeta' };
  A.soplete = { nombre: 'SOPLETE DE PLASMA', pesada: true, tipo: 'cono', danio: 6, alcance: 2.6, cadencia: 0.1, calor: true, municion: 120, forma: 'soplete', color: '#ff8a2b', sonido: 'soplete' };
  A.rociador = { nombre: 'ROCIADOR CRIOGENICO', pesada: true, tipo: 'cono', danio: 2.5, alcance: 2.6, cadencia: 0.1, congelar: 0.4, ralentizar: 2, noZombis: true, municion: 120, forma: 'rociador', color: '#22e4ff', sonido: 'rociador' };
  A.laser = { nombre: 'LASER DE DRON', pesada: true, tipo: 'carga', danio: 70, alcance: 30, cadencia: 1.2, carga: 1, rebotes: 1, municion: 8, forma: 'laser', color: '#22e4ff', sonido: 'laser' };
  A.canon = { nombre: 'CANON DE PLASMA', pesada: true, tipo: 'proyectil', danio: 40, alcance: 25, cadencia: 0.9, vel: 16, area: 1.3, danioArea: 30, municion: 10, bala: 'plasma', forma: 'canon', color: '#ff2bd6', sonido: 'canon' };
  A.desintegrador = { nombre: 'DESINTEGRADOR DEL REACTOR', pesada: true, suprema: true, tipo: 'suprema', danio: 999, alcance: 20, cadencia: 2, carga: 2, municion: 1, forma: 'desintegrador', color: '#4dff8a', sonido: 'desintegrador' };

  // ---------- Lanzables (botón aparte) ----------
  const L = {
    granada: { nombre: 'GRANADA', fusible: 2, radio: 2, danio: 90, vel: 8, rebota: true, max: 3 },
    mina: { nombre: 'MINA', radio: 1.5, danio: 100, vel: 4, max: 3 },
    bengala: { nombre: 'BENGALA', duracion: 8, vel: 7, rebota: true, max: 3 },
    emp: { nombre: 'EMP', fusible: 1.2, radio: 4, duracion: 5, duracionHUD: 3, vel: 8, rebota: true, max: 2 },
    torreta: { nombre: 'TORRETA', duracion: 20, vida: 40, danio: 6, cadencia: 0.35, alcance: 10, vel: 4, max: 1 }
  };
  const ORDEN_LANZABLES = ['granada', 'mina', 'bengala', 'emp', 'torreta'];

  // Armas que pueden aparecer en el mapa (para la configuración del versus)
  const PESADAS = ['clavos', 'ballesta', 'escopeta', 'soplete', 'rociador', 'laser', 'canon'];

  // Arma propia de cada personaje: [contacto, distancia]
  const PROPIAS = {
    pirulo: ['manopla', 'resortera'], gargolfo: ['fierro', 'honda'], chucrut: ['sarten', 'tapas'],
    fideo: ['espatula', 'tenedores'], noquimbo: ['palo', 'cerbatana'], pantuflina: ['llave', 'ampollas'],
    cachureo: ['destornillador', 'pernos'], mostachon: ['porra', 'aturdidor']
  };

  DM.ARMAS = A;
  DM.LANZABLES = L;
  DM.ORDEN_LANZABLES = ORDEN_LANZABLES;
  DM.ARMAS_PESADAS = PESADAS;
  DM.ARMAS_PROPIAS = PROPIAS;
})();
