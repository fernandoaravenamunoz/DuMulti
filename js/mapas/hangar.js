// =====================================================
// Campaña: SECTOR 5 - HANGAR (24×24, 2 pisos)
// El hangar con la nave salvavidas al centro. La consola de lanzamiento está en la
// torre de control (piso 2) y la rampa de abordaje (!) al sur de la nave.
// Leyenda: ver js/mapas/sector4.js  ·  O consola de objetivo · V casco de la nave · ! salida
// =====================================================
(function () {
  'use strict';
  DM.mapas = DM.mapas || {};

  DM.mapas.hangar = {
    id: 'hangar',
    nombre: 'SECTOR 5 - HANGAR',
    modo: 'coop',
    inicio: { ang: 0 },
    baldosaSegura: 2,

    pisos: [
      {
        nombre: 'PISO 1 - HANGAR B',
        mapa: [
          '###########P####A#######',
          '##,,,,,,,,,,,,,,,,,,,,##',
          '#s,@pp,pp,,,,,,,,,,r,,##',
          '##,ppp,p,,,,,,,,,,,,,,s#',
          '######.##########.######',
          '######D##########D######',
          '##....................##',
          '##.Z............b...Z.##',
          '##....................##',
          '##.T....VNVNVNVV....T.##',
          '##.T....VVVVVVVV....T.##',
          '##......VVVVVVVV......##',
          '#N....b.VVVVVVVV.b....N#',
          '##......VVVVVVVV......##',
          '##Z.....VVVVVVVV.....Z##',
          '##....g...!!!!...g....##',
          '##........!!!!........##',
          '##....................##',
          '##..TT............TT..##',
          'Le.....b.~.r..~.......##',
          '##.b....Z......Z....b.##',
          '##.Z................Z.##',
          '########A######A########',
          '########################'
        ],
        lamparas: [[4, 2], [18, 2], [5, 7], [18, 7], [5, 16], [18, 16], [11, 17, 'parpadea'], [11, 20], [3, 12], [20, 12], [7, 8], [16, 8], [7, 15], [16, 15], [11, 7]]
      },
      {
        nombre: 'PISO 2 - TORRE DE CONTROL',
        mapa: [
          '###########O####P#######',
          '##....................##',
          '#s..r.................##',
          '##.....Q..............s#',
          '##....................##',
          '######.##########.######',
          '##Z..................Z##',
          '##....................##',
          '##..====########====..##',
          '##..====########====..##',
          '##..====########====..##',
          '##..====########====..##',
          '##......l......l......##',
          '##......l......l......##',
          '##..====########====..##',
          '##..====########====..##',
          '##..====########====..##',
          '##..====########====..##',
          '##..################..##',
          'Le..################..##',
          '##.........f..........##',
          '##Z..................Z##',
          '########################',
          '########################'
        ],
        lamparas: [[6, 2], [16, 2], [11, 3, 'parpadea'], [3, 7], [20, 7], [3, 20], [20, 20], [11, 12]]
      }
    ],

    enlaces: [
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 1, y: 2, llegada: { x: 2.5, y: 2.5, ang: 0 } },
        { piso: 1, x: 1, y: 2, llegada: { x: 2.5, y: 2.5, ang: 0 } }] },
      { tipo: 'escalera', extremos: [
        { piso: 0, x: 22, y: 3, llegada: { x: 21.5, y: 3.5, ang: Math.PI } },
        { piso: 1, x: 22, y: 3, llegada: { x: 21.5, y: 3.5, ang: Math.PI } }] },
      { tipo: 'ascensor', extremos: [
        { piso: 0, x: 1, y: 19, llegada: { x: 1.5, y: 19.5, ang: null } },
        { piso: 1, x: 1, y: 19, llegada: { x: 1.5, y: 19.5, ang: null } }] }
    ],

    objetos: [
      { piso: 0, x: 11, y: 7, tipo: 'elixirP' }, { piso: 0, x: 11, y: 18, tipo: 'elixirP' },
      { piso: 0, x: 3, y: 13, tipo: 'elixirG' }, { piso: 0, x: 20, y: 13, tipo: 'chaleco' },
      { piso: 0, x: 14, y: 2, tipo: 'blindaje' }, { piso: 0, x: 5, y: 10, tipo: 'arma:clavos' },
      { piso: 0, x: 18, y: 10, tipo: 'arma:escopeta' }, { piso: 0, x: 6, y: 17, tipo: 'arma:ballesta' },
      { piso: 0, x: 17, y: 17, tipo: 'arma:soplete' }, { piso: 0, x: 10, y: 6, tipo: 'lanz:granada' },
      { piso: 0, x: 13, y: 21, tipo: 'lanz:bengala' }, { piso: 0, x: 5, y: 21, tipo: 'lanz:mina' },
      { piso: 1, x: 11, y: 2, tipo: 'elixirP' }, { piso: 1, x: 2, y: 13, tipo: 'elixirG' },
      { piso: 1, x: 20, y: 7, tipo: 'arma:rociador' }, { piso: 1, x: 3, y: 20, tipo: 'arma:canon' },
      { piso: 1, x: 11, y: 12, tipo: 'arma:laser' }, { piso: 1, x: 9, y: 3, tipo: 'lanz:emp' },
      { piso: 1, x: 20, y: 21, tipo: 'lanz:torreta' }
    ],
    premios: [
      { piso: 1, x: 12, y: 13, tipo: 'elixirTotal' }, { piso: 0, x: 2, y: 21, tipo: 'nucleo' },
      { piso: 1, x: 20, y: 2, tipo: 'blindajeTotal' }
    ],
    suprema: { piso: 1, x: 14, y: 1 },

    registros: [{ id: 't04', piso: 0, x: 12, y: 2, carta: true }, { id: 'c03', piso: 0, x: 11, y: 0 }],
    interruptores: []
  };
})();
