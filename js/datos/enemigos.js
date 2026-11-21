// =====================================================
// Enemigos y objetos (datos para ajustar al probar)
// =====================================================
(function () {
  'use strict';

  // ---------- Enemigos ----------
  //  robot: los robots atacan a todos (también a los zombis); los zombis buscan el calor
  //  vuela: altura de vuelo (los drones no pisan el piso eléctrico)
  //  blindaje: multiplicador del daño recibido
  DM.ENEMIGOS = {
    lento: { nombre: 'CRIOGENIZADO', vida: 60, vel: 1.15, radio: 0.3, alto: 0.88, danio: 12, cadencia: 1.0, alcance: 0.9, puntos: 1 },
    corredor: { nombre: 'CORREDOR', vida: 30, vel: 3.1, radio: 0.26, alto: 0.8, danio: 8, cadencia: 0.6, alcance: 0.85, flanquea: true, puntos: 1 },
    hinchado: { nombre: 'HINCHADO', vida: 85, vel: 0.85, radio: 0.36, alto: 0.86, danio: 10, cadencia: 1.2, alcance: 0.9, gasAlMorir: true, puntos: 2 },
    dron: { nombre: 'DRON CENTINELA', robot: true, vida: 50, vel: 2.0, radio: 0.28, alto: 0.42, vuela: 0.42, danio: 18, cadencia: 2.4, carga: 1.0, alcance: 9, distancia: 4.5, puntos: 2 },
    guardian: { nombre: 'ROBOT GUARDIAN', robot: true, vida: 650, vel: 0.65, radio: 0.45, alto: 1.0, blindaje: 0.5, danio: 25, cadencia: 2.0, alcance: 12, velProyectil: 5, area: 0.9, puntos: 10 }
  };
  DM.ORDEN_ENEMIGOS = ['lento', 'corredor', 'hinchado', 'dron', 'guardian'];

  // ---------- Objetos ----------
  //  premio: premio mayor (escaso, con brillo y sonido; se anuncia en versus)
  DM.OBJETOS = {
    elixirP: { nombre: 'ELIXIR PEQUENO', vida: 25, reaparece: 1 },
    elixirG: { nombre: 'ELIXIR GRANDE', vida: 50, reaparece: 1.5 },
    chaleco: { nombre: 'CHALECO', escudo: 25, reaparece: 1.5 },
    blindaje: { nombre: 'BLINDAJE', escudo: 50, reaparece: 2 },
    nucleo: { nombre: 'NUCLEO CRIOGENICO', premio: true, dios: 15 },
    elixirTotal: { nombre: 'ELIXIR TOTAL', premio: true, vidaTotal: true },
    blindajeTotal: { nombre: 'BLINDAJE TOTAL', premio: true, escudoTotal: true }
    // Además: 'arma:<id>' (armas pesadas) y 'lanz:<id>' (lanzables)
  };
  // Segundos base de reaparición según la configuración (se multiplican por "reaparece")
  DM.REAPARICION_OBJETOS = { rapida: 10, normal: 20, lenta: 35 };
  DM.REAPARICION_PREMIOS = [60, 90];
})();
