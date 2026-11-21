// =====================================================
// Registro de partidas (v1.2): las últimas 30 partidas de este dispositivo,
// para ajustar la dificultad con datos (OPCIONES → ESTADISTICAS).
//   { fecha, modo, mapa, nivel, jugadores, resultado, duracion,
//     fases: [{ nombre, s }], muertes: [{ piso, x, y, causa }], reimpresiones }
// =====================================================
(function () {
  'use strict';
  const CLAVE = 'dumulti_partidas', MAX = 30;
  function leer() { try { const l = JSON.parse(localStorage.getItem(CLAVE) || '[]'); return Array.isArray(l) ? l : []; } catch (err) { return []; } }
  function guardarLista(l) { try { localStorage.setItem(CLAVE, JSON.stringify(l.slice(-MAX))); } catch (err) { /* nada */ } }

  // Partida en curso (la llena main.js con los eventos)
  let actual = null;
  const E = {
    empezar: function (mundo, modoReglas) {
      actual = {
        fecha: new Date().toISOString().slice(0, 16).replace('T', ' '), modo: modoReglas, mapa: mundo.mapa.def.id || '', nivel: mundo.nivel || null,
        jugadores: Object.keys(mundo.jugadores).length, resultado: null, duracion: 0, fases: [], muertes: [], reimpresiones: 0, _t0: mundo.tiempo, _tFase: mundo.tiempo, _fase: 'INICIO'
      };
    },
    evento: function (ev, mundo) {
      if (!actual) return;
      if (ev.t === 'muerte') actual.muertes.push({ piso: ev.piso, x: Math.round(ev.x * 10) / 10, y: Math.round(ev.y * 10) / 10, causa: ev.causa || '?' });
      if (ev.t === 'fase' || ev.t === 'oleada') {
        actual.fases.push({ nombre: actual._fase, s: Math.round(mundo.tiempo - actual._tFase) });
        actual._fase = ev.t === 'fase' ? 'FASE ' + ev.n + ' ' + String(ev.tipo).toUpperCase() : 'OLEADA ' + ev.n;
        actual._tFase = mundo.tiempo;
      }
    },
    terminar: function (mundo, st) {
      if (!actual) return;
      actual.fases.push({ nombre: actual._fase, s: Math.round(mundo.tiempo - actual._tFase) });
      actual.duracion = Math.round(mundo.tiempo - actual._t0);
      actual.resultado = st.fin || (st.ganador !== undefined ? 'fin' : null);
      actual.reimpresiones = st.reimpresionesUsadas || 0;
      delete actual._t0; delete actual._tFase; delete actual._fase;
      const l = leer(); l.push(actual); guardarLista(l);
      actual = null;
    },
    lista: leer,
    borrar: function () { guardarLista([]); },
    json: function () { return JSON.stringify(leer(), null, 1); }
  };
  DM.Estadisticas = E;
})();
