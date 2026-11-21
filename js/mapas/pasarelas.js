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
          '#####D#####A##I###D#####',
          '#####.############.#####',
          '##........####........##',
          '##.....r..####......Z.##',
          '##........,,,,........s#',
          '##.Z......T##T........##',
          '##........####........##',
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
          '###########D#######,####',
          '###########.#######,####',
          '########........##....##',
          '########........##..Z.##',
          '########........##....s#',
          '########.Z....Z.##....##',
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

    registros: [{ id: 'c04', piso: 0, x: 11, y: 8 }, { id: 't02', piso: 1, x: 4, y: 6, carta: true }],
    interruptores: [
      { piso: 0, x: 8, y: 8, zona: [9, 9, 15, 14] },
      { piso: 0, x: 14, y: 15, zona: [16, 9, 22, 14] }
    ]
  };
})();
