// =====================================================
// Campaña: SECTOR 2 - PASARELAS INDUSTRIALES (24×24, 2 pisos)
// Una gran nave industrial con aplastadores y una pasarela de rejillas encima.
// Tres consolas (dos en el piso 1, una en la sala de control del piso 2) encienden el montacargas del este.
// Leyenda: ver js/mapas/sector4.js  ·  O consola de objetivo · V casco de la nave · ! salida
// =====================================================
(function () {
  'use strict';
  DM.mapas = DM.mapas || {};

  DM.mapas.pasarelas = {
    id: 'pasarelas',
    nombre: 'SECTOR 2 - PASARELAS INDUSTRIALES',
    modo: 'coop',
    inicio: { ang: 0 },
    baldosaSegura: 2,

    pisos: [
      {
        nombre: 'PISO 1 - NAVE INDUSTRIAL',
        mapa: [
          '########################',
          '#####O##################',
          '##......bN####N....b..##',
          '##.Z......T##T.Z......L#',
          '#s........,,,,..r.....e#',
          '##......Z.####......Z.##',
          '##..b.....####.b......##',
          '#####.############.#####',
          '#####D##I##P######D#####',
          '#,,,,,,,,,,,,,,,~,,,,,,#',
          '#,pp,,T,,,,,T>>,,,T,,,,#',
          'H,@pp,,,,k,,,,,k,,,,,!!#',
          '#,ppp,,,,k,,,,,k,,,,,!!#',
          '#,p,,,T,,,,,T,,,,,T,gg,#',
          '#,,~,,,,,,,,,,,,,,,,,,,#',
          '#####D#####Al#I###D#####',
          '#####.######l#####.#####',
          '##........##l#........##',
          '##.....r..##I#......Z.##',
          '##........,,,,........s#',
          '##.Z......T##T........##',
          '##........F..#........##',
          '##################O#####',
          '########################'
        ],
        lamparas: [[5, 4], [18, 4], [5, 19], [18, 19], [4, 11], [11, 12], [19, 11, 'parpadea'], [11, 4], [11, 19]]
      },
      {
        nombre: 'PISO 2 - PASARELAS Y CONTROL',
        mapa: [
          '########################',
          '########P##O###Q########',
          '##....##........##..Z.##',
          '##.r..##........##....L#',
          '#s....##........##....e#',
          '##....##........##....##',
          '##....##........##....##',
          '###,#######.#######,####',
          '###,#######D#######,####',
          '#...............x......#',
          '#......l...............#',
          '#.====.==.==.==.==.===.#',
          '#.====.==.==.==.==.===.#',
          '#......l...............#',
          '#...............x......#',
          '###F#######D#######,####',
          '###.#######.#######,####',
          '###.####........##....##',
          '########........##..Z.##',
          '########........##....s#',
          '#####..R.Z....Z.##....##',
          '########........##....##',
          '############A###########',
          '########################'
        ],
        lamparas: [[11, 4], [11, 19], [4, 4], [20, 4], [20, 19], [4, 10], [19, 13, 'parpadea'], [11, 10]]
      }
    ],

    enlaces: [
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 1, y: 4, llegada: { x: 2.5, y: 4.5, ang: 0 } },
        { piso: 1, x: 1, y: 4, llegada: { x: 2.5, y: 4.5, ang: 0 } }] },
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 22, y: 19, llegada: { x: 21.5, y: 19.5, ang: Math.PI } },
        { piso: 1, x: 22, y: 19, llegada: { x: 21.5, y: 19.5, ang: Math.PI } }] },
      { tipo: 'ascensor', extremos: [
        { piso: 0, x: 22, y: 4, llegada: { x: 22.5, y: 4.5, ang: null } },
        { piso: 1, x: 22, y: 4, llegada: { x: 22.5, y: 4.5, ang: null } }] }
    ],

    objetos: [
      { piso: 0, x: 7, y: 11, tipo: 'elixirP' }, { piso: 0, x: 16, y: 12, tipo: 'elixirP' },
      { piso: 0, x: 4, y: 4, tipo: 'elixirG' }, { piso: 0, x: 20, y: 4, tipo: 'chaleco' },
      { piso: 0, x: 6, y: 19, tipo: 'blindaje' }, { piso: 0, x: 6, y: 3, tipo: 'arma:clavos' },
      { piso: 0, x: 12, y: 12, tipo: 'arma:escopeta' }, { piso: 0, x: 17, y: 20, tipo: 'arma:soplete' },
      { piso: 0, x: 19, y: 4, tipo: 'arma:ballesta' }, { piso: 0, x: 11, y: 4, tipo: 'lanz:granada' },
      { piso: 0, x: 11, y: 19, tipo: 'lanz:bengala' }, { piso: 0, x: 4, y: 20, tipo: 'lanz:mina' },
      { piso: 1, x: 12, y: 4, tipo: 'elixirP' }, { piso: 1, x: 10, y: 19, tipo: 'elixirG' },
      { piso: 1, x: 20, y: 5, tipo: 'arma:rociador' }, { piso: 1, x: 3, y: 5, tipo: 'arma:canon' },
      { piso: 1, x: 13, y: 20, tipo: 'lanz:emp' }, { piso: 1, x: 20, y: 19, tipo: 'lanz:torreta' },
      { piso: 1, x: 14, y: 3, tipo: 'arma:laser' }
    ],
    premios: [
      { piso: 1, x: 9, y: 4, tipo: 'blindajeTotal' }, { piso: 0, x: 12, y: 19, tipo: 'elixirTotal' },
      { piso: 1, x: 13, y: 18, tipo: 'nucleo' }
    ],
    suprema: { piso: 1, x: 11, y: 4 },

    // v1.2: zonas con nombre (la primera que contiene el punto gana) y su color de luz
    zonas: [
      { piso: 0, nombre: 'SALA DE MAQUINAS NO', x0: 2, y0: 2, x1: 9, y1: 7, luz: '#ffd34a' },
      { piso: 0, nombre: 'SALA DE MAQUINAS NE', x0: 14, y0: 2, x1: 21, y1: 7, luz: '#ffd34a' },
      { piso: 0, nombre: 'PASO NORTE', x0: 10, y0: 3, x1: 13, y1: 5, luz: '#e6e3ff' },
      { piso: 0, nombre: 'BODEGA SO', x0: 2, y0: 16, x1: 9, y1: 21, luz: '#4dff8a' },
      { piso: 0, nombre: 'BODEGA SE', x0: 14, y0: 16, x1: 21, y1: 22, luz: '#4dff8a' },
      { piso: 0, nombre: 'PASO SUR', x0: 10, y0: 18, x1: 13, y1: 20, luz: '#e6e3ff' },
      { piso: 0, nombre: 'NAVE INDUSTRIAL', x0: 1, y0: 8, x1: 22, y1: 15, luz: '#22e4ff' },
      { piso: 1, nombre: 'SALA DE CONTROL', x0: 8, y0: 1, x1: 15, y1: 7, luz: '#ffd34a' },
      { piso: 1, nombre: 'ALMACEN', x0: 8, y0: 16, x1: 15, y1: 21, luz: '#4dff8a' },
      { piso: 1, nombre: 'PASARELAS', x0: 1, y0: 8, x1: 22, y1: 15, luz: '#22e4ff' },
      { piso: 1, nombre: 'DESCANSO NO', x0: 2, y0: 2, x1: 5, y1: 7, luz: '#e6e3ff' },
      { piso: 1, nombre: 'DESCANSO NE', x0: 18, y0: 2, x1: 21, y1: 7, luz: '#e6e3ff' },
      { piso: 1, nombre: 'DESCANSO SE', x0: 18, y0: 16, x1: 21, y1: 21, luz: '#e6e3ff' }
    ],
    // v1.2: rutas de personaje y secretos (premio de una sola vez al pisar la casilla)
    rutas: [{ tipo: 'gargolfo', piso: 1, x: 7, y: 20 }, { tipo: 'pirulo', piso: 0, x: 12, y: 18 }],
    secretos: [
      { piso: 1, x: 5, y: 20, tipo: 'blindajeTotal', nombre: 'NICHO DE GARGOLFO' },
      { piso: 0, x: 12, y: 21, tipo: 'elixirTotal', nombre: 'PARED FALSA' },
      { piso: 1, x: 3, y: 17, tipo: 'lanz:torreta', nombre: 'PARED FALSA' }
    ],
    registros: [{ id: 'c04', piso: 0, x: 11, y: 8 }, { id: 't02', piso: 1, x: 4, y: 6, carta: true }],
    interruptores: [
      { piso: 0, x: 12, y: 18, zona: [13, 10, 15, 11] },   // panel lejano de Pirulo
      { piso: 0, x: 8, y: 8, zona: [9, 9, 15, 14] },
      { piso: 0, x: 14, y: 15, zona: [16, 9, 22, 14] }
    ]
  };
})();
