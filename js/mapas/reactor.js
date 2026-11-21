// =====================================================
// Arena versus: SALA DEL REACTOR (24×24, 2 pisos)
// Simétrica. El núcleo del reactor está al centro del piso 1; arriba, la
// plataforma central (rodeada de láseres, rejillas y focos de radiación)
// es el lugar más peligroso: ahí aparece el desintegrador.
// Leyenda: ver js/mapas/sector4.js
// =====================================================
(function () {
  'use strict';
  DM.mapas = DM.mapas || {};

  DM.mapas.reactor = {
    id: 'reactor',
    nombre: 'SALA DEL REACTOR',
    modo: 'versus',
    inicio: { ang: 0 },
    baldosaSegura: 2,

    pisos: [
      {
        nombre: 'PISO 1 - NUCLEO DEL REACTOR',
        mapa: [
          '########################',
          '#s,,,,,,,,,k,,,,,,,,,Le#',
          '#,,,,,,,,,,,,,,,,,,,,,,#',
          '#,,#T.####I..#####.##,,#',
          '#,,#....###p.###....C,,#',
          '#,,..p..###..###..p..,,#',
          '#,,#....###xx###....#,,#',
          '#,,#....##A..P##....#,,#',
          '#,,#####b......b#####,,#',
          '#,,#####.H....H.#####,,#',
          '#,,####N..~..~..N####,,#',
          '#,,..gg....XX....>>p.,k#',
          '#k,.pgg....XX....>>..,,#',
          '#,,####N..~..~..N####,,#',
          '#,,#####.H....H.#####,,#',
          '#,,#####b......b#####,,#',
          '#,,#....##P..A##....#,,#',
          '#,,#....###xx###....#,,#',
          '#,,..p..###..###..p..,,#',
          '#,,C....###.p###....#,,#',
          '#,,##.#####..I####.T#,,#',
          '#,,,,,,,,,,,,,,,,,,,,,,#',
          '#eL,,,,,,,,,k,,,,,,,,,s#',
          '########################'
        ],
        lamparas: [[5, 5], [18, 5], [5, 18], [18, 18], [9, 11], [14, 12], [11, 2], [12, 21], [2, 11], [21, 12, 'parpadea']]
      },
      {
        nombre: 'PISO 2 - ANILLO SUPERIOR',
        mapa: [
          '########################',
          '#s,,,,,,,,,,,,,,,,,,,Le#',
          '#,,,,,,,,,,,,,,,,,,,,,,#',
          '#,,##.#####..#####.##,,#',
          '#,,#12..###..###....#,,#',
          '#,,..p..###xx###..p..,,#',
          '#,,#....###..###....#,,#',
          '#,,#..21##P..A##....#,,#',
          '#,,#####f..ll...#####,,#',
          '#,,#####..====..#####,,#',
          '#,,I###R.======.R####,,#',
          '#,,.....l==..==l.....,,#',
          '#,,.....l==..==l.....,,#',
          '#,,####R.======.R###I,,#',
          '#,,#####..====..#####,,#',
          '#,,#####...ll..f#####,,#',
          '#,,#....##A..P##12..#,,#',
          '#,,#....###..###....#,,#',
          '#,,..p..###xx###..p..,,#',
          '#,,#....###..###..21#,,#',
          '#,,##.#####..#####.##,,#',
          '#,,,,,,,,,,,,,,,,,,,,,,#',
          '#eL,,,,,,,,,,,,,,,,,,,s#',
          '########################'
        ],
        lamparas: [[5, 5], [18, 5], [5, 18], [18, 18], [11, 11], [4, 11, 'parpadea'], [19, 12], [11, 2], [12, 21]]
      }
    ],

    enlaces: [
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 1, y: 1, llegada: { x: 2.5, y: 1.5, ang: 0 } },
        { piso: 1, x: 1, y: 1, llegada: { x: 2.5, y: 1.5, ang: 0 } }] },
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 22, y: 22, llegada: { x: 21.5, y: 22.5, ang: Math.PI } },
        { piso: 1, x: 22, y: 22, llegada: { x: 21.5, y: 22.5, ang: Math.PI } }] },
      { tipo: 'ascensor', extremos: [
        { piso: 0, x: 22, y: 1, llegada: { x: 22.5, y: 1.5, ang: null } },
        { piso: 1, x: 22, y: 1, llegada: { x: 22.5, y: 1.5, ang: null } }] },
      { tipo: 'ascensor', extremos: [
        { piso: 0, x: 1, y: 22, llegada: { x: 1.5, y: 22.5, ang: null } },
        { piso: 1, x: 1, y: 22, llegada: { x: 1.5, y: 22.5, ang: null } }] }
    ],

    objetos: [
      { piso: 0, x: 6, y: 6, tipo: 'elixirP' }, { piso: 0, x: 17, y: 17, tipo: 'elixirP' },
      { piso: 0, x: 17, y: 6, tipo: 'chaleco' }, { piso: 0, x: 6, y: 17, tipo: 'chaleco' },
      { piso: 0, x: 11, y: 3, tipo: 'arma:clavos' }, { piso: 0, x: 12, y: 20, tipo: 'arma:clavos' },
      { piso: 0, x: 3, y: 12, tipo: 'arma:escopeta' }, { piso: 0, x: 20, y: 11, tipo: 'arma:escopeta' },
      { piso: 0, x: 4, y: 7, tipo: 'arma:soplete' }, { piso: 0, x: 19, y: 16, tipo: 'arma:rociador' },
      { piso: 0, x: 12, y: 9, tipo: 'elixirG' }, { piso: 0, x: 11, y: 14, tipo: 'blindaje' },
      { piso: 0, x: 2, y: 6, tipo: 'lanz:granada' }, { piso: 0, x: 21, y: 17, tipo: 'lanz:granada' },
      { piso: 0, x: 17, y: 2, tipo: 'lanz:mina' }, { piso: 0, x: 6, y: 21, tipo: 'lanz:bengala' },
      { piso: 1, x: 4, y: 5, tipo: 'arma:ballesta' }, { piso: 1, x: 19, y: 18, tipo: 'arma:ballesta' },
      { piso: 1, x: 19, y: 4, tipo: 'arma:laser' }, { piso: 1, x: 4, y: 19, tipo: 'arma:canon' },
      { piso: 1, x: 11, y: 3, tipo: 'lanz:emp' }, { piso: 1, x: 12, y: 20, tipo: 'lanz:torreta' },
      { piso: 1, x: 3, y: 11, tipo: 'elixirG' }, { piso: 1, x: 20, y: 12, tipo: 'blindaje' },
      { piso: 1, x: 7, y: 4, tipo: 'elixirP' }, { piso: 1, x: 16, y: 19, tipo: 'elixirP' }
    ],
    premios: [
      { piso: 0, x: 10, y: 11, tipo: 'nucleo' },
      { piso: 1, x: 12, y: 12, tipo: 'elixirTotal' },
      { piso: 0, x: 13, y: 12, tipo: 'blindajeTotal' }
    ],
    suprema: { piso: 1, x: 11, y: 11 },

    registros: [
      { id: 'r02', piso: 0, x: 13, y: 7 }, { id: 'c03', piso: 1, x: 10, y: 7 }
    ],

    interruptores: [
      { piso: 0, x: 10, y: 3, zona: [11, 4, 12, 7] },
      { piso: 0, x: 13, y: 20, zona: [11, 16, 12, 19] },
      { piso: 1, x: 3, y: 10, zona: [8, 8, 15, 15] },
      { piso: 1, x: 20, y: 13, zona: [8, 8, 15, 15] }
    ],
    secuencias: []
  };
})();
