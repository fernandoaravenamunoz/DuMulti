// =====================================================
// Retrato del personaje para el centro del HUD (estilo de la cara de Doom)
// Se dibuja con código a partir de los colores de DM.PERSONAJES[id].retrato.
// Cuadros: 0 al frente, 1 mira a la izquierda, 2 mira a la derecha,
//          3 parpadea, 4 dolor (para la fase 2)
// =====================================================
(function () {
  'use strict';
  const TAM = 34;
  const cache = {};

  function cuadro(r, n) {
    const c = document.createElement('canvas');
    c.width = TAM; c.height = TAM;
    const g = c.getContext('2d');
    const R = function (x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); };

    // Hombros y cuello
    R(3, 29, 28, 5, r.ropa); R(3, 29, 28, 1, '#e6e3ff22');
    R(12, 29, 10, 2, '#07060d');
    R(13, 24, 8, 6, r.pielS);
    // Cabeza
    R(9, 7, 16, 20, r.piel);
    R(8, 9, 18, 16, r.piel);
    R(21, 9, 5, 16, r.pielS); R(20, 25, 4, 2, r.pielS);
    R(10, 26, 12, 1, r.pielS);
    // Orejas
    R(6, 15, 2, 6, r.piel); R(26, 15, 2, 6, r.pielS);
    // Ojos (las pupilas se mueven según el cuadro)
    const dolor = n === 4;
    if (n === 3) {
      R(11, 17, 5, 1, '#3a2418'); R(19, 17, 5, 1, '#3a2418');
    } else {
      R(11, 15, 5, 4, '#e6e3ff'); R(19, 15, 5, 4, '#e6e3ff');
      const dx = n === 1 ? -1 : n === 2 ? 1 : 0;
      R(13 + dx, 16, 2, 2, '#16151f'); R(21 + dx, 16, 2, 2, '#16151f');
      R(13 + dx, 16, 1, 1, '#22e4ff');   R(21 + dx, 16, 1, 1, '#22e4ff');
      if (dolor) { R(11, 15, 5, 1, r.pielS); R(19, 15, 5, 1, r.pielS); }
    }
    // Cejas
    R(10, dolor ? 14 : 13, 6, 1, r.peloS); R(19, dolor ? 14 : 13, 6, 1, r.peloS);
    // Nariz y mejillas
    R(17, 18, 2, 4, r.pielS); R(16, 21, 3, 1, r.pielS);
    R(10, 20, 2, 1, '#c05a4a'); R(23, 20, 2, 1, '#a04a3a');
    // Boca: sonrisa traviesa (o mueca de dolor)
    if (dolor) { R(14, 23, 7, 2, '#3a1418'); R(15, 23, 5, 1, '#e6e3ff'); }
    else { R(13, 23, 9, 2, '#3a1418'); R(14, 23, 7, 1, '#e6e3ff'); R(21, 22, 1, 1, '#3a1418'); }

    // Peinado
    switch (r.peinado) {
      case 'puas': {
        // Pelo parado en púas irregulares (como si le hubiera dado la corriente)
        R(7, 6, 20, 6, r.pelo); R(7, 10, 3, 5, r.pelo); R(24, 10, 3, 4, r.peloS);
        const puas = [[7, 6, -2], [10, 9, -1], [14, 7, 0], [17, 10, 1], [21, 8, 1], [24, 5, 2]];
        for (const p of puas) for (let j = 0; j < p[1]; j++) {
          const w = Math.max(1, 4 - (j * 4 / p[1] | 0));
          R(p[0] + Math.round(p[2] * j / p[1]), 6 - j, w, 1, j > p[1] * 0.6 ? r.peloS : r.pelo);
        }
        R(20, 7, 7, 4, r.peloS); R(10, 7, 2, 1, '#fff4c0'); R(15, 3, 1, 2, '#fff4c0');
        R(27, 2, 1, 1, '#22e4ff'); R(5, 4, 1, 1, '#22e4ff'); R(28, 4, 1, 1, '#c8fbff');  // chispas
        break;
      }
      case 'casco':
        R(7, 4, 20, 8, r.pelo); R(7, 11, 20, 2, r.peloS); R(9, 5, 6, 1, '#7a828d'); R(16, 6, 3, 3, '#e8b923');
        break;
      case 'moño':
        R(8, 5, 18, 6, r.pelo); R(13, 0, 8, 6, r.pelo); R(15, 1, 3, 1, '#e6e3ff'); R(22, 6, 4, 5, r.peloS);
        break;
      case 'cresta':
        R(9, 6, 16, 3, r.peloS); R(14, 0, 6, 8, r.pelo); R(15, 0, 2, 7, '#c8fbff');
        break;
      case 'gorro':
        R(7, 3, 20, 9, r.pelo); R(7, 10, 20, 2, '#3a3a52'); R(16, 1, 3, 3, r.peloS);
        break;
      case 'trenzas':
        R(8, 5, 18, 6, r.pelo); R(5, 9, 3, 16, r.pelo); R(26, 9, 3, 16, r.peloS); R(5, 24, 3, 2, '#22e4ff'); R(26, 24, 3, 2, '#22e4ff');
        break;
      case 'gorra':
        R(8, 4, 18, 7, r.pelo); R(4, 9, 12, 2, r.peloS); R(18, 6, 3, 2, '#e6e3ff');
        break;
      default: // rapado
        R(9, 6, 16, 3, r.pelo); R(8, 8, 2, 4, r.pelo); R(24, 8, 2, 4, r.peloS);
    }
    // Accesorios
    if (r.extra === 'antiparras') {
      R(9, 9, 16, 1, '#2a2a3c');
      R(10, 8, 6, 3, '#2a2a3c'); R(18, 8, 6, 3, '#2a2a3c');
      R(11, 9, 4, 1, '#22e4ff'); R(19, 9, 4, 1, '#22e4ff');
    } else if (r.extra === 'lentes') {
      R(10, 14, 7, 6, '#4a4f63'); R(18, 14, 7, 6, '#4a4f63'); R(11, 15, 5, 4, '#c8fbff'); R(19, 15, 5, 4, '#c8fbff');
      R(13, 16, 2, 2, '#16151f'); R(21, 16, 2, 2, '#16151f');
    } else if (r.extra === 'visor') {
      R(9, 14, 17, 5, '#16151f'); R(10, 15, 15, 2, '#22e4ff');
    } else if (r.extra === 'barba') {
      R(9, 21, 16, 6, r.peloS); R(13, 23, 8, 2, '#3a1418');
    } else if (r.extra === 'bigote') {
      R(11, 21, 13, 2, r.pelo); R(10, 22, 2, 2, r.pelo); R(23, 22, 2, 2, r.pelo);
    }
    return c;
  }

  function cuadros(id) {
    if (cache[id]) return cache[id];
    const p = DM.PERSONAJES[id] || DM.PERSONAJES.pirulo;
    cache[id] = [0, 1, 2, 3, 4].map(function (n) { return cuadro(p.retrato, n); });
    return cache[id];
  }

  // Animación tipo Doom: mira a los lados de vez en cuando y parpadea
  function elegir(t, herido) {
    if (herido) return 4;
    const ciclo = t % 6;
    if (ciclo > 5.82) return 3;                      // parpadeo
    const fase = Math.floor(t / 1.7) % 5;
    return fase === 1 ? 1 : fase === 3 ? 2 : 0;
  }

  DM.Retrato = { TAM: TAM, cuadros: cuadros, elegir: elegir };
})();
