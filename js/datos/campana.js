// =====================================================
// Campaña: 5 sectores que siguen la historia, de la criogenia al hangar.
// Se juega solo o en cooperativo. Cada sector se desbloquea al superar el anterior
// y el progreso queda guardado (en cooperativo cuenta el progreso del anfitrión).
//
// Cada sector tiene FASES que se cumplen en orden:
//   oleadas  : sobrevivir a una lista de oleadas
//   activar  : activar las consolas (O) del mapa manteniendo USAR
//   jefe     : derrotar al robot guardián
//   resistir : aguantar N segundos
//   salida   : llegar todos a la zona de salida (!) (opcional: con tiempo límite)
// "goteo": enemigos que siguen llegando durante la fase { tipos, cada (s), max }
// "premios": premios mayores que aparecen al empezar la fase o una oleada
// Los números se ajustan aquí sin tocar el motor.
// =====================================================
(function () {
  'use strict';
  const ZOMBIS = ['lento', 'corredor', 'hinchado'];

  DM.CAMPANA = [
    {
      id: 's1', nombre: 'SECTOR 1 - BLOQUE CRIOGENICO', mapa: 'sector4',
      intro: 'LOS DORMIDOS DESPIERTAN. RESISTE Y BUSCA LA ESCOTILLA DEL REACTOR.',
      fases: [
        { tipo: 'oleadas', texto: 'SOBREVIVE A LAS OLEADAS', oleadas: [{ lento: 5 }, { lento: 7, corredor: 2 }, { lento: 8, corredor: 4, hinchado: 1 }, { lento: 8, corredor: 5, hinchado: 2, dron: 1 }], premios: { 3: 'elixirTotal' } },
        { tipo: 'salida', texto: 'LLEGUEN A LA ESCOTILLA DEL REACTOR', goteo: { tipos: ZOMBIS, cada: 4, max: 6 } }
      ]
    },
    {
      id: 's2', nombre: 'SECTOR 2 - PASARELAS INDUSTRIALES', mapa: 'pasarelas',
      intro: 'SIN ENERGIA NO HAY ASCENSOR AL SIGUIENTE SECTOR. REACTIVA LAS 3 CONSOLAS.',
      fases: [
        { tipo: 'activar', texto: 'ACTIVA LAS CONSOLAS DE ENERGIA', tiempo: 4, goteo: { tipos: ZOMBIS, cada: 2.2, max: 14 }, premios: { inicio: 'blindajeTotal' } },
        { tipo: 'salida', texto: 'VUELVAN AL MONTACARGAS DEL ESTE', goteo: { tipos: ZOMBIS.concat(['dron']), cada: 2.5, max: 12 } }
      ]
    },
    {
      id: 's3', nombre: 'SECTOR 3 - LABORATORIOS DE SEGURIDAD', mapa: 'laboratorios',
      intro: 'LOS DRONES PROTEGEN LOS LABORATORIOS. ABRANSE PASO HASTA LA ESCLUSA.',
      fases: [
        { tipo: 'oleadas', texto: 'RESISTAN A LOS DRONES', oleadas: [{ lento: 6, dron: 2 }, { corredor: 6, dron: 3 }, { lento: 8, hinchado: 2, dron: 4 }, { lento: 6, corredor: 6, dron: 5 }, { lento: 10, corredor: 6, hinchado: 3, dron: 6 }], premios: { 2: 'elixirTotal', 4: 'nucleo' } },
        { tipo: 'salida', texto: 'LLEGUEN A LA ESCLUSA DEL SURESTE', goteo: { tipos: ['dron', 'corredor'], cada: 3, max: 8 } }
      ]
    },
    {
      id: 's4', nombre: 'SECTOR 4 - NUCLEO DEL REACTOR', mapa: 'reactor',
      intro: 'EL GUARDIAN DEL REACTOR BLOQUEA EL CAMINO AL HANGAR. DESTRUYANLO.',
      fases: [
        { tipo: 'jefe', texto: 'DERROTA AL ROBOT GUARDIAN', aparece: { piso: 0, x: 11.5, y: 18.5 }, goteo: { tipos: ['lento', 'corredor', 'dron'], cada: 3, max: 10 }, premios: { inicio: 'nucleo', 20: 'arma:desintegrador' } }
      ]
    },
    {
      id: 's5', nombre: 'SECTOR 5 - HANGAR', mapa: 'hangar',
      intro: 'LA NAVE SALVAVIDAS ESTA LISTA. ENCIENDANLA, RESISTAN Y SUBAN A BORDO.',
      fases: [
        { tipo: 'activar', texto: 'ENCIENDE LA NAVE DESDE LA TORRE DE CONTROL', tiempo: 6, goteo: { tipos: ZOMBIS, cada: 2.5, max: 10 } },
        { tipo: 'resistir', texto: 'RESISTAN MIENTRAS LA NAVE CARGA', segundos: 60, goteo: { tipos: ZOMBIS.concat(['dron']), cada: 1.2, max: 22 }, premios: { inicio: 'elixirTotal' } },
        { tipo: 'salida', texto: 'SUBAN A LA NAVE SALVAVIDAS', limite: 45, goteo: { tipos: ZOMBIS, cada: 1.5, max: 18 } }
      ],
      final: 'LA NAVE SALVAVIDAS PARTE RUMBO A TEMUKEITOR'
    }
  ];
  DM.CAMPANA_POR_ID = {};
  DM.CAMPANA.forEach(function (n, k) { n.n = k + 1; DM.CAMPANA_POR_ID[n.id] = n; });
})();

// =====================================================
// Progreso de la campaña (se guarda en este navegador / este teléfono)
//   { completados: { s1: true, ... } }
// =====================================================
(function () {
  'use strict';
  const CLAVE = 'dumulti_campana';
  function leer() {
    try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && d.completados) return d; } catch (err) { /* nada */ }
    return { completados: {} };
  }
  function guardar(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (err) { /* nada */ } }
  DM.Progreso = {
    completado: function (id) { return !!leer().completados[id]; },
    // Un sector está disponible si es el primero o si el anterior ya se superó
    disponible: function (id) {
      const n = DM.CAMPANA_POR_ID[id];
      if (!n) return false;
      return n.n === 1 || this.completado(DM.CAMPANA[n.n - 2].id);
    },
    marcar: function (id) { const d = leer(); d.completados[id] = true; guardar(d); },
    siguiente: function (id) { const n = DM.CAMPANA_POR_ID[id]; return n && DM.CAMPANA[n.n] ? DM.CAMPANA[n.n].id : null; },
    // El primer sector sin superar (o el último, si ya se superaron todos)
    pendiente: function () {
      for (const n of DM.CAMPANA) if (!this.completado(n.id)) return n.id;
      return DM.CAMPANA[DM.CAMPANA.length - 1].id;
    },
    cuantos: function () { const d = leer(); return DM.CAMPANA.filter(function (n) { return d.completados[n.id]; }).length; },
    disponibles: function () { const self = this; return DM.CAMPANA.filter(function (n) { return self.disponible(n.id); }).map(function (n) { return n.id; }); },
    borrar: function () { guardar({ completados: {} }); }
  };
})();
