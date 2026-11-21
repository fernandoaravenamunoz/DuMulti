// =====================================================
// Configuración de partida: valores por defecto, configuraciones rápidas
// del versus y oleadas del cooperativo.
// =====================================================
(function () {
  'use strict';

  function todos(lista, v) { const o = {}; lista.forEach(function (k) { o[k] = v; }); return o; }
  const OBJ = ['elixirP', 'elixirG', 'chaleco', 'blindaje', 'granada', 'mina', 'bengala', 'emp', 'torreta'];
  const PREMIOS = ['nucleo', 'elixirTotal', 'blindajeTotal'];

  // Configuración base del versus (la edita el anfitrión en la sala de espera)
  function versusBase() {
    return {
      modo: 'todos',             // 'todos' (todos contra todos) | 'equipos'
      asignacion: 'auto',        // equipos: 'auto' (balanceada) | 'elegir'
      fuegoAmigo: 'no',          // 'no' | 'si' | 'explosivos'
      bajasMeta: 15,             // 0 = sin límite (en equipos se suman)
      duracion: 10,              // minutos; 0 = sin límite
      armas: todos(DM.ARMAS_PESADAS, true),
      desintegrador: true,
      soloPropias: false,        // "Solo armas de personaje"
      objetos: todos(OBJ, true),
      premios: todos(PREMIOS, true),
      reaparicionObjetos: 'normal',
      enemigos: todos(DM.ORDEN_ENEMIGOS, false),
      cantidadEnemigos: 'normal', // 'pocos' | 'normal' | 'muchos'
      trampas: true,
      interruptores: true,
      asistencia: true,
      espera: 3,                 // segundos para reaparecer: 0, 3 o 5
      castigoEnemigo: 0          // puntos al morir por zombi o robot: 0 o −1
    };
  }

  function coopBase() {
    return { fuegoAmigo: 'no', asistencia: true, trampas: true };
  }

  // Configuraciones rápidas
  const RAPIDAS = {
    clasico: { nombre: 'CLASICO', aplicar: function (c) { c.modo = 'todos'; c.bajasMeta = 15; c.duracion = 10; for (const k in c.enemigos) c.enemigos[k] = false; } },
    duelo: { nombre: 'DUELO LIMPIO', aplicar: function (c) { c.soloPropias = true; for (const k in c.premios) c.premios[k] = false; c.desintegrador = false; c.trampas = false; c.interruptores = false; } },
    caos: { nombre: 'CAOS TOTAL', aplicar: function (c) {
      for (const k in c.armas) c.armas[k] = true; for (const k in c.objetos) c.objetos[k] = true; for (const k in c.premios) c.premios[k] = true;
      for (const k in c.enemigos) c.enemigos[k] = k !== 'guardian'; c.cantidadEnemigos = 'muchos'; c.trampas = true; c.interruptores = true; c.desintegrador = true; c.soloPropias = false;
    } },
    equipos: { nombre: 'EQUIPOS', aplicar: function (c) { c.modo = 'equipos'; c.bajasMeta = 30; c.fuegoAmigo = 'no'; } }
  };

  // Oleadas del cooperativo: cantidades base por tipo (se multiplican según los jugadores)
  const OLEADAS = [
    { lento: 6 },
    { lento: 8, corredor: 3 },
    { lento: 8, corredor: 5, dron: 1 },
    { lento: 10, corredor: 4, hinchado: 2, dron: 2 },
    { lento: 10, corredor: 7, hinchado: 3, dron: 2 },
    { lento: 12, corredor: 8, hinchado: 4, dron: 3 },
    { lento: 14, corredor: 10, hinchado: 5, dron: 4 },
    { lento: 10, corredor: 8, hinchado: 4, dron: 3, guardian: 1 }   // oleada final: el guardián
  ];
  // Premios mayores en momentos clave del cooperativo (al empezar estas oleadas)
  const PREMIOS_COOP = { 3: 'elixirTotal', 5: 'blindajeTotal', 7: 'nucleo' };

  DM.Partida = {
    versusBase: versusBase,
    coopBase: coopBase,
    RAPIDAS: RAPIDAS,
    OLEADAS: OLEADAS,
    PREMIOS_COOP: PREMIOS_COOP,
    OBJETOS_CONFIG: OBJ,
    PREMIOS_CONFIG: PREMIOS,
    // Copia profunda simple (las configuraciones son datos planos)
    copiar: function (c) { return JSON.parse(JSON.stringify(c)); }
  };
})();
