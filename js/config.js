// =====================================================
// DUMULTI - Configuración general
// Todas las constantes del juego en un solo lugar, para ajustarlas al probar.
// (Los valores de cada arma, enemigo y objeto están en js/datos/.)
// =====================================================
window.DM = window.DM || {};

DM.config = {
  // ---------- Pantalla ----------
  ANCHO: 480,            // resolución interna (16:9)
  ALTO: 270,
  HUD_ALTO: 36,          // barra inferior tipo Doom
  get VISTA_ALTO() { return this.ALTO - this.HUD_ALTO; },

  // ---------- Cámara ----------
  PLANO: 0.66,           // campo de visión (0,66 ≈ 67°)
  PITCH_MAX: 70,         // píxeles que puede subir o bajar el horizonte

  // ---------- Texturas ----------
  TEX: 64,
  SPR: 64,

  // ---------- Niebla e iluminación ----------
  NIEBLA_DIST: 13,
  NIEBLA_EMISIVO: 0.3,
  LUZ_AMBIENTE: 0.36,
  LUZ_RES: 4,
  LUZ_MAX: 2.4,
  TRAMADO_LUZ: 5,

  // ---------- Jugador ----------
  VEL_CAMINAR: 3.2,
  VEL_CORRER: 5.0,
  ACELERACION: 14,
  VEL_GIRO_TECLADO: 2.6,
  RADIO_JUGADOR: 0.24,
  ALTO_JUGADOR: 0.8,     // alto de la caja de impacto (en paredes)
  OJOS: 0.5,             // altura de los ojos
  DIST_USAR: 1.7,
  ESCUDO_ABSORBE: 0.66,  // parte del daño que absorbe el escudo
  VIDA_MAX_SOBRE: 100,   // tope de vida con elixires (el personaje puede tener más base)
  ESCUDO_MAX: 100,

  // ---------- Caer, revivir y reaparecer ----------
  TIEMPO_CAIDO: 20,      // segundos caído esperando que te revivan (cooperativo)
  TIEMPO_REVIVIR: 3,     // segundos manteniendo USAR junto al caído
  VIDA_AL_REVIVIR: 35,
  DIST_REVIVIR: 1.3,
  PROTECCION_REAPARECER: 2,
  VIDAS_EQUIPO: 3,       // reimpresiones del equipo en cooperativo (si caen todos)

  // ---------- Combate ----------
  ASISTENCIA_PC: 0.08,       // tolerancia vertical extra (en paredes) para acertar
  ASISTENCIA_TACTIL: 0.2,
  REBOBINADO_MAX: 0.15,      // compensación de retraso máxima (segundos)

  // ---------- Sensibilidad ----------
  SENS_MOUSE: 0.0024,
  SENS_TACTIL: 0.0065,
  SENS_PITCH: 0.0045,
  ANGULO_APUNTAR: 0.25,
  ANGULO_APUNTAR_TACTIL: 0.5,

  // ---------- Puertas ----------
  PUERTA_VEL: 1.8,
  PUERTA_DIST_AUTO: 1.35,
  PUERTA_ESPERA: 2.5,

  // ---------- Cambio de piso ----------
  TRANSICION: 0.55,

  // ---------- Simulación ----------
  PASO_SIM: 1 / 60,

  // ---------- Guardado ----------
  CLAVE_PREFS: 'dumulti_prefs',
  CLAVE_CONFIG_VERSUS: 'dumulti_config_versus'
};
DM.config.PROYECCION = DM.config.ANCHO / (2 * DM.config.PLANO);

// ---------- Paleta exacta de Worodorox 3073 (con significado) ----------
DM.paleta = {
  fondo: '#07060d',
  metal1: '#16151f', metal2: '#2a2a3c', metal3: '#3a3a52', remache: '#7a828d',
  cian: '#22e4ff', cianOsc: '#0f5a6b', cianClaro: '#c8fbff',          // información, pantallas
  magenta: '#ff2bd6', magentaOsc: '#7a1466', magentaClaro: '#ffd0f5', // PELIGRO: siempre hace daño
  rojo: '#ff3b3b', rojoOsc: '#6b1010',                                // enemigos y alarmas
  amarillo: '#e8b923', amarilloClaro: '#ffd34a',                      // objetos, munición
  verde: '#4dff8a',                                                   // éxito, salida
  blanco: '#e6e3ff', gris: '#8d93ad', grisOsc: '#4a4f63'
};
// Equipos del versus: nunca rojo ni magenta (se confundirían con enemigos y peligro)
DM.EQUIPOS = [
  { nombre: 'CIAN', color: '#22e4ff', claro: '#c8fbff' },
  { nombre: 'AMARILLO', color: '#e8b923', claro: '#ffd34a' }
];

// ---------- Tipos de pared ----------
DM.PARED = {
  VACIO: 0, DANADA: 1, NEON: 2, TUBOS: 3, PANTALLA: 4, ALARMA: 5, REJILLA: 6,
  CAPSULA: 7, PUERTA: 8, ASCENSOR: 9, LISA: 10,
  INTERRUPTOR: 11,   // panel que enciende o apaga las trampas de una zona
  TERMINAL: 12,      // terminal de seguridad (reportes)
  SECUENCIA: 13,     // compuerta que se abre y cierra en orden, con el reloj
  APLASTADOR: 14,    // la casilla del aplastador cuando se cierra
  REACTOR: 15,       // pared del núcleo del reactor (decorativa, emisiva)
  CONSOLA: 16,       // consola de objetivo de la campaña (se activa manteniendo USAR)
  NAVE: 17           // casco de la nave salvavidas (hangar)
};
DM.PAREDES = {
  1: { nombre: 'PARED', metal: true }, 2: { nombre: 'PANEL NEON', metal: true }, 3: { nombre: 'TUBERIAS', metal: true },
  4: { nombre: 'PANTALLA' }, 5: { nombre: 'ALARMA', metal: true },
  6: { nombre: 'REJILLA', transparente: true, metal: true, rompible: true },
  7: { nombre: 'CAPSULA' }, 8: { nombre: 'COMPUERTA', puerta: true, metal: true },
  9: { nombre: 'ASCENSOR', metal: true }, 10: { nombre: 'PANEL', metal: true },
  11: { nombre: 'INTERRUPTOR', metal: true }, 12: { nombre: 'TERMINAL' },
  13: { nombre: 'COMPUERTA DE SECUENCIA', puerta: true, metal: true },
  14: { nombre: 'APLASTADOR', metal: true }, 15: { nombre: 'REACTOR' },
  16: { nombre: 'CONSOLA' }, 17: { nombre: 'NAVE SALVAVIDAS', metal: true }
};

// ---------- Tipos de piso ----------
DM.SUELO = {
  NORMAL: 0, VARIANTE: 1, PLASMA: 2, REJILLA: 3, ESCALERA: 4, ASCENSOR: 5,
  ESTACION: 6,       // estación de respaldo (reaparición en cooperativo)
  CRIO: 7,           // piso del área de cápsulas (de ahí salen los zombis)
  SALIDA: 8          // zona de salida del sector (campaña): se enciende al cumplir el objetivo
};

// ---------- Caracteres de los mapas ----------
DM.CAR_PARED = {
  '#': 1, 'N': 2, 'T': 3, 'P': 4, 'A': 5, 'R': 6, 'C': 7, 'D': 8, 'L': 9, 'H': 10,
  'I': 11, 'Q': 12, 'S': 13, 'X': 15, 'O': 16, 'V': 17
};
DM.CAR_SUELO = {
  '.': 0, ' ': 0, ',': 1, '~': 2, '=': 3, 's': 4, 'e': 5, 'r': 6, '*': 7, '!': 8
};
// Trampas (la casilla queda vacía; la trampa vive en sim/trampas.js)
//  x piso electrificado | l láser | k aplastador | g gas | < > ^ v descompresión
//  1 2 3 baldosas con símbolo (cuadrado, círculo, triángulo) | f foco de radiación
DM.CAR_TRAMPAS = 'xlkg<>^v123f';
// Cosas sobre el piso
//  @ inicio | p punto de aparición | Z aparición de zombis | b barril explosivo | h carta (registro)
DM.CAR_COSAS = '@pZbh';
