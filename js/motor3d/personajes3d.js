// =====================================================
// Sprites de los 8 personajes jugables, generados con código a partir de sus
// colores (DM.PERSONAJES[id].retrato).
// Vistas: frente, perfil (el otro perfil es el espejo) y espalda, con 2 cuadros
// de caminar, más "caído". Llevan una franja emisiva con el color de su equipo
// (o blanca en todos contra todos) para reconocerlos de lejos.
// Se generan la primera vez que se necesitan y quedan en caché.
// =====================================================
(function () {
  'use strict';
  const SP = DM.sprites;
  const rgb = SP.rgb;
  const cache = {};

  function cuerpo(pj, vista, cuadro, marca) {
    const r0 = pj.retrato;
    return SP.spriteDesde(function (r, e, o, c) {
      const piel = r0.piel, pielS = r0.pielS, ropa = r0.ropa, ropaS = rgb(ropa, 0.6), ropaL = rgb(ropa, 1.4);
      const pelo = r0.pelo, peloS = r0.peloS;
      const pant = '#2a2a3c', pantS = '#16151f';
      const p = cuadro ? 2 : 0;
      if (vista === 'caido') {
        // Tendido en el piso
        r(10, 54, 30, 7, ropa); r(10, 54, 30, 2, ropaL); r(40, 55, 14, 5, pant);
        r(2, 53, 9, 8, piel); r(2, 52, 9, 3, pelo); r(54, 56, 6, 4, '#16151f');
        if (marca) e(20, 56, 6, 2, marca);
        return;
      }
      if (vista === 'lado') {
        // Perfil mirando a la derecha
        r(28 - p, 44, 6, 16, pant); r(31 + p, 44, 6, 16, pantS);
        r(26 - p * 2, 60, 9, 3, '#16151f'); r(30 + p * 2, 60, 9, 3, '#0b0a12');
        r(25, 22, 15, 23, ropa); r(25, 22, 3, 23, ropaS); r(25, 22, 15, 2, ropaL);
        r(30 + p, 25, 6, 14, ropaS); r(31 + p, 38, 5, 4, piel);                 // brazo
        r(29, 18, 6, 5, pielS);
        r(27, 6, 14, 14, piel); r(39, 11, 3, 4, piel); r(27, 6, 4, 14, pielS);
        r(37, 11, 2, 2, '#16151f'); r(36, 16, 4, 1, '#3a1418');
        r(26, 3, 14, 5, pelo); r(26, 6, 5, 7, pelo); r(26, 3, 5, 3, peloS);
        if (r0.peinado === 'puas') for (let k = 0; k < 4; k++) r(27 + k * 3, 0 + (k & 1), 2, 4, pelo);
        if (r0.peinado === 'cresta') r(30, 0, 4, 5, pelo);
        if (r0.peinado === 'moño') r(22, 4, 5, 5, pelo);
        if (r0.peinado === 'gorra') { r(26, 3, 14, 4, pelo); r(38, 6, 6, 2, peloS); }
        if (r0.peinado === 'trenzas') r(25, 8, 3, 16, pelo);
        if (r0.extra === 'bigote') r(37, 15, 4, 2, pelo);
        if (r0.extra === 'barba') r(32, 15, 9, 5, peloS);
        if (marca) e(25, 30, 15, 2, marca);
        return;
      }
      const espalda = vista === 'espalda';
      // Piernas (alternan al caminar)
      r(24, 44, 7, 16 - p, pant); r(33, 44 + p, 7, 16 - p, pant);
      r(24, 44, 2, 16, '#3a3a52'); r(38, 44, 2, 16, pantS);
      r(23, 60 - p, 9, 3, '#16151f'); r(32, 60, 9, 3, '#16151f');
      // Torso
      r(21, 22, 22, 23, ropa); r(37, 22, 6, 23, ropaS); r(21, 22, 22, 2, ropaL);
      if (!espalda) { r(29, 22, 6, 5, pielS); r(31, 27, 2, 14, ropaS); }
      else r(23, 28, 18, 1, ropaS);
      // Brazos
      r(16, 23 + p, 5, 16, ropa); r(43, 23 - p + 2, 5, 16, ropaS);
      r(16, 39 + p, 5, 4, piel); r(43, 41 - p, 5, 4, pielS);
      if (marca) e(21, 33, 22, 2, marca);
      // Cabeza
      r(29, 18, 6, 5, pielS);
      r(25, 5, 14, 15, piel); r(35, 5, 4, 15, pielS);
      r(23, 11, 2, 4, piel); r(39, 11, 2, 4, pielS);
      if (!espalda) {
        r(27, 11, 3, 2, '#e6e3ff'); r(34, 11, 3, 2, '#e6e3ff'); r(28, 11, 1, 2, '#16151f'); r(35, 11, 1, 2, '#16151f');
        r(29, 16, 6, 1, '#3a1418');
        if (r0.extra === 'antiparras') { r(26, 7, 12, 2, '#2a2a3c'); e(27, 7, 4, 1, '#22e4ff'); e(33, 7, 4, 1, '#22e4ff'); }
        if (r0.extra === 'lentes') { r(26, 10, 5, 4, '#4a4f63'); r(33, 10, 5, 4, '#4a4f63'); }
        if (r0.extra === 'visor') { r(25, 10, 14, 3, '#16151f'); e(26, 11, 12, 1, '#22e4ff'); }
        if (r0.extra === 'bigote') r(27, 15, 10, 2, pelo);
        if (r0.extra === 'barba') r(25, 15, 14, 5, peloS);
      }
      // Pelo según el peinado
      const atras = espalda ? 6 : 0;
      switch (r0.peinado) {
        case 'puas': r(24, 3, 16, 4 + atras, pelo); for (let k = 0; k < 5; k++) r(24 + k * 3 + (k & 1), 0 + (k & 1), 2, 4, k > 2 ? peloS : pelo); break;
        case 'casco': r(23, 2, 18, 6 + atras, pelo); r(23, 7, 18, 1, peloS); r(30, 3, 3, 3, '#e8b923'); break;
        case 'moño': r(24, 3, 16, 4 + atras, pelo); r(28, 0, 8, 4, pelo); break;
        case 'cresta': r(30, 0, 4, 7, pelo); r(25, 4, 14, 2, peloS); break;
        case 'gorro': r(23, 1, 18, 7 + atras, pelo); r(23, 7, 18, 1, '#3a3a52'); break;
        case 'trenzas': r(24, 3, 16, 4 + atras, pelo); r(21, 8, 3, 15, pelo); r(40, 8, 3, 15, peloS); break;
        case 'gorra': r(24, 2, 16, 5 + atras, pelo); if (!espalda) r(24, 6, 16, 2, peloS); break;
        default: r(25, 3, 14, 3 + atras, pelo);
      }
    });
  }

  // Cuadros de un personaje con un color de marca (equipo)
  function de(id, marca) {
    const clave = id + '|' + (marca || '');
    if (cache[clave]) return cache[clave];
    const pj = DM.PERSONAJES[id] || DM.PERSONAJES.pirulo;
    const espejo = function (L) {
      const S = L.t, M = new DM.texturas.Lienzo(S);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { M.px[y * S + x] = L.px[y * S + S - 1 - x]; M.em[y * S + x] = L.em[y * S + S - 1 - x]; }
      return M;
    };
    const lado = [cuerpo(pj, 'lado', 0, marca), cuerpo(pj, 'lado', 1, marca)];
    cache[clave] = {
      frente: [cuerpo(pj, 'frente', 0, marca), cuerpo(pj, 'frente', 1, marca)],
      espalda: [cuerpo(pj, 'espalda', 0, marca), cuerpo(pj, 'espalda', 1, marca)],
      derecha: lado, izquierda: lado.map(espejo),
      caido: cuerpo(pj, 'caido', 0, marca)
    };
    return cache[clave];
  }

  // Elige la vista según desde dónde lo mira la cámara
  function elegir(cuadros, angJugador, dxCam, dyCam, caminando, t) {
    // Ángulo desde el jugador hacia la cámara, relativo a hacia dónde mira el jugador
    let a = Math.atan2(dyCam, dxCam) - angJugador;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const n = caminando ? Math.floor(t * 6) % 2 : 0;
    if (Math.abs(a) < Math.PI / 4) return cuadros.frente[n];
    if (Math.abs(a) > Math.PI * 3 / 4) return cuadros.espalda[n];
    return a > 0 ? cuadros.izquierda[n] : cuadros.derecha[n];
  }

  DM.Personajes3D = { de: de, elegir: elegir };
})();
