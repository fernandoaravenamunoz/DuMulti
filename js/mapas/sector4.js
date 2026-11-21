// =====================================================
// Mapa de oleadas: SECTOR 1 - BLOQUE CRIOGENICO (24×24, 2 pisos)
// (se juega solo o en cooperativo con amigos)
// Las oleadas salen de las cápsulas (Z) y convergen a la sala central.
// La pasarela del piso 2 tiene rejillas sobre la sala central.
//
// LEYENDA (ver también js/config.js)
//  Paredes: # dañada  H lisa  N neón  T tuberías  P pantalla  A alarma  R rejilla
//           C cápsula  D compuerta  S compuerta de secuencia  L ascensor
//           I interruptor  Q terminal  X reactor
//  Pisos:   . normal  , marcas  ~ plasma  = rejilla  s escalera  e ascensor
//           r estación de respaldo  * área de cápsulas
//  Trampas: x eléctrico  l láser  k aplastador  g gas  < > ^ v ventilas
//           1 2 3 baldosas (cuadrado, círculo, triángulo)  f foco de radiación
//  Cosas:   @ inicio  p aparición de jugador  Z aparición de zombis  b barril  h carta
// =====================================================
(function () {
  'use strict';
  DM.mapas = DM.mapas || {};

  DM.mapas.sector4 = {
    id: 'sector4',
    nombre: 'SECTOR 1 - BLOQUE CRIOGENICO',
    modo: 'coop',
    inicio: { ang: -1.57 },
    baldosaSegura: 2,   // 0 cuadrado, 1 círculo, 2 triángulo (la pista está en un registro)

    pisos: [
      {
        nombre: 'PISO 1 - BLOQUE CRIOGENICO',
        mapa: [
          '########################',
          '#******#P######A#******#',
          'C*C**C*,,,,,,,<<,*C**C*C',
          '#**Z***,,,,,,,<<,**Z***#',
          'C***Z**#F##,,####***Z**C',
          '#*C**C*#.##,,####*C**C*#',
          '#******#.##,,####******#',
          '##,,H#####P,,A#####H,,##',
          '##xx####b.......####,,##',
          '##xx###N......~.N###,,##',
          '#s,,I###..pp.p..####,,s#',
          '##,,,,,,..p.....,,,,,,##',
          '##,,,,,,...@.p..,,,,,,##',
          '##,,####..p.pp..####,,##',
          '##,,###N.~......N###ll##',
          '##,,####.......b####ll##',
          '##,,##Q###P,,A######,,P#',
          '#......####,,####......#',
          '#......R..#,,####..f.Z.#',
          '#..rr..####,,####..XX..#',
          '#......,gg,,,,,,,..XX..#',
          '#L...b.,gg,,,k,,,.Z..!!#',
          '#e.....##########....!!#',
          '########################'
        ],
        lamparas: [[3, 1], [20, 1], [11, 9], [12, 14], [3, 12], [20, 12], [3, 20], [20, 22], [11, 20, 'parpadea'], [11, 3]]
      },
      {
        nombre: 'PISO 2 - PASARELAS DE MANTENIMIENTO',
        mapa: [
          '########################',
          '########################',
          '#####N##Q###A##P##N#####',
          '##,,,,S,,,S,,,S,,,S,,,##',
          '##,########,#########,##',
          '##,#####..F,#########,##',
          '##,########,#####Illl,##',
          '##,#######A,#P#######,##',
          '##..l.~#........D.....##',
          '##..l..N........N#121.##',
          '#s.....#..====..##322.s#',
          '##.....D..====..#.333.##',
          '##.....#..====..##123.##',
          '##.....#..====..##211.##',
          '##.....T........T.....##',
          '##,#####........#####,##',
          '##,######R#..#R######,##',
          '##,#####........#......#',
          '#.....##........#......#',
          '#.....#I...f....#......#',
          '#..r..##........#..Z...#',
          '#L....##.~......#...Z..#',
          '#e....###########.....b#',
          '########################'
        ],
        lamparas: [[4, 3], [12, 3], [19, 3], [9, 9], [14, 14], [4, 11, 'parpadea'], [19, 11], [11, 18], [3, 19], [19, 19]]
      }
    ],

    enlaces: [
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 1, y: 10, llegada: { x: 2.5, y: 10.5, ang: 0 } },
        { piso: 1, x: 1, y: 10, llegada: { x: 2.5, y: 10.5, ang: 0 } }] },
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 22, y: 10, llegada: { x: 21.5, y: 10.5, ang: Math.PI } },
        { piso: 1, x: 22, y: 10, llegada: { x: 21.5, y: 10.5, ang: Math.PI } }] },
      { tipo: 'ascensor', extremos: [
        { piso: 0, x: 1, y: 22, llegada: { x: 1.5, y: 22.5, ang: null } },
        { piso: 1, x: 1, y: 22, llegada: { x: 1.5, y: 22.5, ang: null } }] }
    ],

    // Objetos que reaparecen (tipo: ver js/datos/enemigos.js; 'arma:<id>' y 'lanz:<id>')
    objetos: [
      { piso: 0, x: 8, y: 11, tipo: 'elixirP' }, { piso: 0, x: 15, y: 12, tipo: 'elixirP' },
      { piso: 0, x: 3, y: 18, tipo: 'elixirG' }, { piso: 0, x: 21, y: 9, tipo: 'chaleco' },
      { piso: 0, x: 2, y: 13, tipo: 'blindaje' }, { piso: 0, x: 11, y: 5, tipo: 'arma:clavos' },
      { piso: 0, x: 20, y: 12, tipo: 'arma:escopeta' }, { piso: 0, x: 5, y: 1, tipo: 'arma:ballesta' },
      { piso: 0, x: 19, y: 22, tipo: 'arma:soplete' }, { piso: 0, x: 7, y: 3, tipo: 'lanz:granada' },
      { piso: 0, x: 12, y: 20, tipo: 'lanz:bengala' }, { piso: 0, x: 22, y: 21, tipo: 'lanz:mina' },
      { piso: 1, x: 4, y: 12, tipo: 'elixirP' }, { piso: 1, x: 12, y: 21, tipo: 'elixirG' },
      { piso: 1, x: 20, y: 8, tipo: 'chaleco' }, { piso: 1, x: 21, y: 4, tipo: 'arma:rociador' },
      { piso: 1, x: 3, y: 21, tipo: 'arma:canon' }, { piso: 1, x: 8, y: 3, tipo: 'lanz:emp' },
      { piso: 1, x: 2, y: 5, tipo: 'lanz:torreta' }, { piso: 1, x: 19, y: 17, tipo: 'arma:laser' },
      { piso: 1, x: 9, y: 9, tipo: 'lanz:granada' }
    ],
    // Premios mayores (en cooperativo aparecen al empezar ciertas oleadas)
    premios: [
      { piso: 0, x: 21, y: 20, tipo: 'nucleo' },
      { piso: 1, x: 17, y: 11, tipo: 'blindajeTotal' },
      { piso: 1, x: 11, y: 20, tipo: 'elixirTotal' }
    ],
    // Arma suprema: una por mapa (en cooperativo aparece en la oleada final)
    suprema: { piso: 0, x: 18, y: 17 },

    // Registros de la nave: en una pared (pantalla P o terminal Q) o una carta en el piso
    // v1.2: zonas con nombre (la primera que contiene el punto gana) y su color de luz
    zonas: [
      { piso: 0, nombre: 'CRIOGENIA OESTE', x0: 1, y0: 1, x1: 6, y1: 6, luz: '#22e4ff' },
      { piso: 0, nombre: 'CRIOGENIA ESTE', x0: 17, y0: 1, x1: 22, y1: 6, luz: '#22e4ff' },
      { piso: 0, nombre: 'PASILLO DE CAPSULAS', x0: 7, y0: 1, x1: 16, y1: 6, luz: '#e6e3ff' },
      { piso: 0, nombre: 'SALA CENTRAL', x0: 8, y0: 8, x1: 15, y1: 15, luz: '#ffd34a' },
      { piso: 0, nombre: 'PASILLO OESTE', x0: 1, y0: 7, x1: 7, y1: 16, luz: '#e6e3ff' },
      { piso: 0, nombre: 'PASILLO ESTE', x0: 16, y0: 7, x1: 22, y1: 16, luz: '#e6e3ff' },
      { piso: 0, nombre: 'BODEGA SUR', x0: 1, y0: 17, x1: 10, y1: 22, luz: '#4dff8a' },
      { piso: 0, nombre: 'ESCOTILLA DEL REACTOR', x0: 11, y0: 17, x1: 22, y1: 22, luz: '#ff3b3b' },
      { piso: 1, nombre: 'PASILLO DE COMPUERTAS', x0: 2, y0: 2, x1: 21, y1: 7, luz: '#22e4ff' },
      { piso: 1, nombre: 'SALA DE CONTROL', x0: 8, y0: 8, x1: 15, y1: 15, luz: '#ffd34a' },
      { piso: 1, nombre: 'SALA DE BALDOSAS', x0: 17, y0: 8, x1: 21, y1: 14, luz: '#4dff8a' },
      { piso: 1, nombre: 'OFICINAS OESTE', x0: 1, y0: 8, x1: 7, y1: 22, luz: '#e6e3ff' },
      { piso: 1, nombre: 'TALLER SUR', x0: 8, y0: 16, x1: 15, y1: 22, luz: '#ffd34a' },
      { piso: 1, nombre: 'DORMITORIOS', x0: 16, y0: 15, x1: 22, y1: 22, luz: '#22e4ff' }
    ],
    // v1.2: rutas de personaje y secretos (premio de una sola vez al pisar la casilla)
    rutas: [{ tipo: 'gargolfo', piso: 0, x: 7, y: 18 }, { tipo: 'pirulo', piso: 1, x: 17, y: 6 }],
    secretos: [
      { piso: 0, x: 9, y: 18, tipo: 'blindajeTotal', nombre: 'NICHO DE GARGOLFO' },
      { piso: 1, x: 8, y: 5, tipo: 'elixirTotal', nombre: 'PARED FALSA' },
      { piso: 0, x: 8, y: 6, tipo: 'lanz:torreta', nombre: 'PARED FALSA' }
    ],
    registros: [
      { id: 'c01', piso: 0, x: 10, y: 7 }, { id: 'c02', piso: 0, x: 10, y: 16 },
      { id: 't01', piso: 0, x: 3, y: 21, carta: true }, { id: 'r01', piso: 0, x: 6, y: 16 },
      { id: 't02', piso: 1, x: 19, y: 8, carta: true }, { id: 'r02', piso: 1, x: 8, y: 2 },
      { id: 'c03', piso: 1, x: 13, y: 7 }, { id: 't03', piso: 1, x: 4, y: 20, carta: true }
    ],

    // Interruptores de sala: encienden o apagan las trampas de su zona [x0, y0, x1, y1]
    interruptores: [
      { piso: 1, x: 17, y: 6, zona: [4, 8, 4, 9] },   // panel lejano de Pirulo
      { piso: 0, x: 4, y: 10, zona: [2, 7, 3, 9] },
      { piso: 1, x: 7, y: 19, zona: [8, 17, 15, 21] }
    ],

    // Compuertas de secuencia (S): se abren en orden de oeste a este
    secuencias: [{ piso: 1, periodo: 8, abierta: 3.2 }]
  };
})();
