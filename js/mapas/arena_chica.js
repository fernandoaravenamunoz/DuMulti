// =====================================================
// Arena versus chica: CAMARA DE PRUEBAS DEL REACTOR (20×20, 1 piso)
// Para 2 a 4 jugadores (ARENA: AUTO la elige con 4 o menos).
// Simétrica en las 4 direcciones. Al centro, un núcleo de reactor de 2×2
// rodeado de láseres (los encienden los 4 interruptores) y los premios mayores.
// Las tuberías (T) son coberturas para que haya respiros entre encuentros
// (unos 4–5 s caminando al azar: ver npm run medir). Las rejillas (R) se rompen.
// Leyenda: ver js/mapas/sector4.js
// =====================================================
(function () {
  'use strict';
  DM.mapas = DM.mapas || {};

  DM.mapas.arena_chica = {
    id: 'arena_chica',
    nombre: 'CAMARA DE PRUEBAS',
    modo: 'versus',

    pisos: [
      {
        nombre: 'CAMARA DE PRUEBAS',
        mapa: [
          '####H####AA####H####',
          '#p,,,,T,,,,,,T,,,,p#',
          '#,,T,,,,T..T,,,,T,,#',
          '#,,NNNNRN..NRNNNN,,#',
          '#T,N...TN..NT...N,T#',
          '#,,R.p..D..D..p.R,,#',
          '#,TN.b..N..N..b.NT,#',
          '#,,NN.NIN..NIN.NN,,#',
          '#,T,x,T,,,,,,T,x,T,#',
          'A,,,,.X.lXXl.X.,,,,A',
          'A,,,,.X.lXXl.X.,,,,A',
          '#,T,x,T,,,,,,T,x,T,#',
          '#,,NN.NIN..NIN.NN,,#',
          '#,TN.b..N..N..b.NT,#',
          '#,,R.p..D..D..p.R,,#',
          '#T,N...TN..NT...N,T#',
          '#,,NNNNRN..NRNNNN,,#',
          '#,,T,,,,T..T,,,,T,,#',
          '#p,,,,T,,,,,,T,,,,p#',
          '####H####AA####H####'
        ],
        lamparas: [[5, 5], [14, 5], [5, 14], [14, 14], [9, 2], [10, 17], [2, 9], [17, 10], [7, 10], [12, 9], [3, 1], [16, 18]]
      }
    ],

    enlaces: [],

    objetos: [
      { piso: 0, x: 6, y: 4, tipo: 'elixirP' }, { piso: 0, x: 13, y: 15, tipo: 'elixirP' },
      { piso: 0, x: 13, y: 4, tipo: 'elixirP' }, { piso: 0, x: 6, y: 15, tipo: 'elixirP' },
      { piso: 0, x: 1, y: 9, tipo: 'chaleco' }, { piso: 0, x: 18, y: 10, tipo: 'chaleco' },
      { piso: 0, x: 4, y: 2, tipo: 'arma:clavos' }, { piso: 0, x: 15, y: 17, tipo: 'arma:clavos' },
      { piso: 0, x: 15, y: 2, tipo: 'arma:escopeta' }, { piso: 0, x: 4, y: 17, tipo: 'arma:escopeta' },
      { piso: 0, x: 1, y: 13, tipo: 'arma:soplete' }, { piso: 0, x: 18, y: 6, tipo: 'arma:rociador' },
      { piso: 0, x: 9, y: 4, tipo: 'arma:ballesta' }, { piso: 0, x: 10, y: 15, tipo: 'arma:ballesta' },
      { piso: 0, x: 9, y: 1, tipo: 'arma:laser' }, { piso: 0, x: 10, y: 18, tipo: 'arma:canon' },
      { piso: 0, x: 5, y: 8, tipo: 'lanz:granada' }, { piso: 0, x: 14, y: 11, tipo: 'lanz:granada' },
      { piso: 0, x: 14, y: 8, tipo: 'lanz:mina' }, { piso: 0, x: 5, y: 11, tipo: 'lanz:bengala' },
      { piso: 0, x: 9, y: 13, tipo: 'elixirG' }, { piso: 0, x: 10, y: 6, tipo: 'blindaje' },
      { piso: 0, x: 17, y: 2, tipo: 'lanz:emp' }, { piso: 0, x: 2, y: 17, tipo: 'lanz:torreta' }
    ],
    premios: [
      { piso: 0, x: 9, y: 8, tipo: 'nucleo' },
      { piso: 0, x: 10, y: 11, tipo: 'blindajeTotal' },
      { piso: 0, x: 9, y: 11, tipo: 'elixirTotal' }
    ],
    suprema: { piso: 0, x: 7, y: 9 },

    // v1.2: zonas con nombre (la primera que contiene el punto gana) y su color de luz
    zonas: [
      { piso: 0, nombre: 'SALA NO', x0: 3, y0: 3, x1: 7, y1: 6, luz: '#22e4ff' },
      { piso: 0, nombre: 'SALA NE', x0: 12, y0: 3, x1: 16, y1: 6, luz: '#ffd34a' },
      { piso: 0, nombre: 'SALA SO', x0: 3, y0: 13, x1: 7, y1: 16, luz: '#4dff8a' },
      { piso: 0, nombre: 'SALA SE', x0: 12, y0: 13, x1: 16, y1: 16, luz: '#e6e3ff' },
      { piso: 0, nombre: 'NUCLEO', x0: 6, y0: 8, x1: 13, y1: 11, luz: '#ff3b3b' },
      { piso: 0, nombre: 'ANILLO', x0: 0, y0: 0, x1: 19, y1: 19 }
    ],
    registros: [],

    interruptores: [
      { piso: 0, x: 7, y: 7, zona: [8, 9, 11, 10] },
      { piso: 0, x: 12, y: 7, zona: [8, 9, 11, 10] },
      { piso: 0, x: 7, y: 12, zona: [8, 9, 11, 10] },
      { piso: 0, x: 12, y: 12, zona: [8, 9, 11, 10] }
    ],
    secuencias: []
  };
})();
