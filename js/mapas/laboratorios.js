// =====================================================
// Campaña: SECTOR 3 - LABORATORIOS DE SEGURIDAD (24×24, 2 pisos)
// Cuatro laboratorios alrededor de un cruce de pasillos vigilado por drones.
// La esclusa de salida está en el laboratorio del sureste.
// Leyenda: ver js/mapas/sector4.js  ·  O consola de objetivo · V casco de la nave · ! salida
// =====================================================
(function () {
  'use strict';
  DM.mapas = DM.mapas || {};

  DM.mapas.laboratorios = {
    id: 'laboratorios',
    nombre: 'SECTOR 3 - LABORATORIOS DE SEGURIDAD',
    modo: 'coop',
    inicio: { ang: 0 },
    baldosaSegura: 2,

    pisos: [
      {
        nombre: 'PISO 1 - LABORATORIOS',
        mapa: [
          '###########I############',
          '#####F#####lR.##########',
          '##........#l##........##',
          '##.C....C.#S##...Z.r..##',
          '##........#,##..23123.##',
          '##..Z.....D,D...23123.##',
          '##.....Z..#,##..33333.s#',
          '##........#S##..23123.##',
          '##.C....C.#,##.....Z..##',
          '##Z.......P,##........##',
          '#####D#####,##I###D#####',
          '#,@pppp,x,,,,,,l,,,,,,,N',
          'N,pppp,,x,,,,,,l,,,,,,,#',
          '#####D#####,,#####D#####',
          '##........#,,P........##',
          '##......~.#,,#.Q....Q.L#',
          '#s........#,,#........e#',
          '##...f....#,,#..Z.....##',
          '##..Z.....D,,D........##',
          '##........#,,#........##',
          '##.~..r.Z.#,,#.Q....!!##',
          '##........#,,#......!!##',
          '###########,,###########',
          '########################'
        ],
        lamparas: [[5, 5], [18, 3], [5, 18], [18, 18], [11, 11], [4, 12], [19, 12, 'parpadea'], [11, 2], [12, 20]]
      },
      {
        nombre: 'PISO 2 - OBSERVATORIOS',
        mapa: [
          '########################',
          '###########,,###########',
          '##........P,,#........##',
          '##.Z....r.#,,#.Z......##',
          '##..====..#ll#........##',
          '##..====..D,,D.f......##',
          '##..====..#,,#........s#',
          '##..====..#,,#........##',
          '##......Z.#,,#......Z.##',
          '##........#,,#........##',
          '#####D#####,,#####D#####',
          '#,,,,,,g,,,,,,R,x,,,,,,#',
          '#,,,,,,g,R,,,,,,x,,,,,,#',
          '#####D#####,,#####D#####',
          '##........#,,#........##',
          '##.Z......#,,#......Z.L#',
          '#s........#,,#..====..e#',
          '##........#,,#..====..##',
          '##........D,,D..====..##',
          '##........#ll#..====..##',
          '##......Z.#,,#.Z......##',
          '##........#,,A........##',
          '###########,,#####F#####',
          '########################'
        ],
        lamparas: [[5, 5], [18, 5], [5, 18], [18, 18], [11, 11, 'parpadea'], [12, 3], [12, 20], [4, 11], [20, 12]]
      }
    ],

    enlaces: [
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 1, y: 16, llegada: { x: 2.5, y: 16.5, ang: 0 } },
        { piso: 1, x: 1, y: 16, llegada: { x: 2.5, y: 16.5, ang: 0 } }] },
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 22, y: 6, llegada: { x: 21.5, y: 6.5, ang: Math.PI } },
        { piso: 1, x: 22, y: 6, llegada: { x: 21.5, y: 6.5, ang: Math.PI } }] },
      { tipo: 'ascensor', extremos: [
        { piso: 0, x: 22, y: 16, llegada: { x: 22.5, y: 16.5, ang: null } },
        { piso: 1, x: 22, y: 16, llegada: { x: 22.5, y: 16.5, ang: null } }] }
    ],

    objetos: [
      { piso: 0, x: 9, y: 12, tipo: 'elixirP' }, { piso: 0, x: 19, y: 11, tipo: 'elixirP' },
      { piso: 0, x: 5, y: 7, tipo: 'elixirG' }, { piso: 0, x: 11, y: 15, tipo: 'chaleco' },
      { piso: 0, x: 18, y: 8, tipo: 'blindaje' }, { piso: 0, x: 6, y: 3, tipo: 'arma:clavos' },
      { piso: 0, x: 11, y: 2, tipo: 'arma:escopeta' }, { piso: 0, x: 16, y: 15, tipo: 'arma:ballesta' },
      { piso: 0, x: 3, y: 17, tipo: 'arma:soplete' }, { piso: 0, x: 12, y: 20, tipo: 'lanz:granada' },
      { piso: 0, x: 7, y: 19, tipo: 'lanz:bengala' }, { piso: 0, x: 17, y: 19, tipo: 'lanz:mina' },
      { piso: 1, x: 12, y: 11, tipo: 'elixirP' }, { piso: 1, x: 3, y: 20, tipo: 'elixirG' },
      { piso: 1, x: 19, y: 3, tipo: 'arma:rociador' }, { piso: 1, x: 3, y: 9, tipo: 'arma:canon' },
      { piso: 1, x: 20, y: 20, tipo: 'arma:laser' }, { piso: 1, x: 17, y: 6, tipo: 'lanz:emp' },
      { piso: 1, x: 5, y: 16, tipo: 'lanz:torreta' }
    ],
    premios: [
      { piso: 1, x: 8, y: 5, tipo: 'elixirTotal' }, { piso: 0, x: 19, y: 17, tipo: 'nucleo' },
      { piso: 1, x: 19, y: 6, tipo: 'blindajeTotal' }
    ],
    suprema: { piso: 1, x: 12, y: 22 },

    // v1.2: zonas con nombre (la primera que contiene el punto gana) y su color de luz
    zonas: [
      { piso: 0, nombre: 'LABORATORIO DE CRIOGENIA', x0: 2, y0: 2, x1: 9, y1: 9, luz: '#22e4ff' },
      { piso: 0, nombre: 'SALA DE BALDOSAS', x0: 14, y0: 2, x1: 21, y1: 9, luz: '#ffd34a' },
      { piso: 0, nombre: 'LABORATORIO DE RADIACION', x0: 2, y0: 14, x1: 9, y1: 21, luz: '#4dff8a' },
      { piso: 0, nombre: 'ESCLUSA', x0: 14, y0: 14, x1: 21, y1: 21, luz: '#e6e3ff' },
      { piso: 0, nombre: 'CRUCE CENTRAL', x0: 1, y0: 10, x1: 22, y1: 13, luz: '#ff3b3b' },
      { piso: 0, nombre: 'PASILLO NORTE', x0: 10, y0: 1, x1: 13, y1: 9, luz: '#e6e3ff' },
      { piso: 0, nombre: 'PASILLO SUR', x0: 10, y0: 14, x1: 13, y1: 22, luz: '#e6e3ff' },
      { piso: 1, nombre: 'OBSERVATORIO NO', x0: 2, y0: 2, x1: 9, y1: 9, luz: '#22e4ff' },
      { piso: 1, nombre: 'OBSERVATORIO NE', x0: 14, y0: 2, x1: 21, y1: 9, luz: '#ffd34a' },
      { piso: 1, nombre: 'OBSERVATORIO SO', x0: 2, y0: 14, x1: 9, y1: 21, luz: '#4dff8a' },
      { piso: 1, nombre: 'OBSERVATORIO SE', x0: 14, y0: 14, x1: 21, y1: 21, luz: '#e6e3ff' },
      { piso: 1, nombre: 'PASARELA CENTRAL', x0: 1, y0: 1, x1: 22, y1: 22, luz: '#ff3b3b' }
    ],
    // v1.2: rutas de personaje y secretos (premio de una sola vez al pisar la casilla)
    rutas: [{ tipo: 'pirulo', piso: 0, x: 11, y: 0 }, { tipo: 'gargolfo', piso: 0, x: 12, y: 1 }],
    secretos: [
      { piso: 0, x: 13, y: 1, tipo: 'blindajeTotal', nombre: 'NICHO DE GARGOLFO' },
      { piso: 0, x: 5, y: 1, tipo: 'elixirTotal', nombre: 'PARED FALSA' },
      { piso: 1, x: 18, y: 22, tipo: 'lanz:torreta', nombre: 'PARED FALSA' }
    ],
    registros: [{ id: 'r03', piso: 0, x: 15, y: 15 }, { id: 'r01', piso: 0, x: 10, y: 9 }, { id: 't03', piso: 1, x: 6, y: 20, carta: true }],
    interruptores: [
      { piso: 0, x: 11, y: 0, zona: [16, 4, 20, 7] },   // panel lejano de Pirulo (detras de la compuerta de secuencia): apaga las baldosas
      { piso: 0, x: 14, y: 10, zona: [8, 11, 15, 12] }
    ]
  };
})();
