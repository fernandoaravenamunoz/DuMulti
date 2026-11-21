// =====================================================
// Control USB o Bluetooth (Gamepad API del navegador)
// No toca la simulación: suma sus valores a lo que entrega DM.Entrada.leer()
// y agrega los mismos eventos que el teclado ('tecla:KeyE', 'rueda:1', ...).
// Botones y valores: js/datos/mando.js. Preferencias del jugador: OPCIONES.
// =====================================================
(function () {
  'use strict';
  const E = DM.Entrada, M = DM.MANDO;
  const CLAVE = 'dumulti_mando';
  const P = { sens: 1, zonaMuerta: M.zonaMuerta };
  try { Object.assign(P, JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch (err) { /* nada */ }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(P)); } catch (err) { /* nada */ } }

  const antes = {};            // botones apretados en el cuadro anterior
  const repetir = { dir: null, t: 0 };
  const D = { conectado: false, nombre: '', prefs: P, guardar: guardar };

  function elMando() {
    const l = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of l) if (g && g.connected) return g;
    return null;
  }
  function eje(v) {
    const zm = P.zonaMuerta, a = Math.abs(v);
    if (a < zm) return 0;
    return Math.sign(v) * Math.pow((a - zm) / (1 - zm), M.curva);
  }
  function apretado(g, i) { const b = g.buttons[i]; if (!b) return false; return i === 6 || i === 7 ? b.value > M.gatillo : b.pressed; }

  function leerMando(dt) {
    const g = elMando();
    D.conectado = !!g; D.nombre = g ? g.id : '';
    if (!g) return null;
    const ahora = {};
    for (let i = 0; i < g.buttons.length; i++) ahora[i] = apretado(g, i);
    const nuevo = function (i) { return ahora[i] && !antes[i]; };
    const lx = eje(g.axes[0] || 0), ly = eje(g.axes[1] || 0), rx = eje(g.axes[2] || 0), ry = eje(g.axes[3] || 0);
    const usado = lx || ly || rx || ry || Object.keys(ahora).some(function (i) { return ahora[i]; });
    if (usado) E.mando = true;
    const r = { avance: 0, lateral: 0, giro: 0, pitch: 0, correr: false, disparo: false };
    if (E.modo === 'juego') {
      const accion = {};
      for (const i in M.juego) { accion[M.juego[i]] = accion[M.juego[i]] || ahora[i]; if (nuevo(+i)) evento(M.juego[i]); }
      r.avance = -ly; r.lateral = lx;
      r.giro = rx * M.giro * P.sens * dt;
      r.pitch = -ry * M.mirarVertical * P.sens * dt;
      r.correr = !!accion.correr || Math.hypot(lx, ly) > 0.95;
      r.disparo = !!accion.disparo;
      E.mantenidos.usarMando = !!accion.usar;
    } else {
      E.mantenidos.usarMando = false;
      for (const i in M.menu) if (nuevo(+i)) eventoMenu(M.menu[i]);
      // Stick izquierdo como cruceta, con repetición
      const dir = ly < -0.5 ? 'arriba' : ly > 0.5 ? 'abajo' : lx < -0.5 ? 'izquierda' : lx > 0.5 ? 'derecha' : null;
      if (dir !== repetir.dir) { repetir.dir = dir; repetir.t = M.repetirMenu[0]; if (dir) eventoMenu(dir); }
      else if (dir) { repetir.t -= dt; if (repetir.t <= 0) { repetir.t = M.repetirMenu[1]; eventoMenu(dir); } }
    }
    for (const i in ahora) antes[i] = ahora[i];
    return r;
  }
  function evento(a) {
    const EV = { lanzar: 'lanzar', usar: 'tecla:KeyE', recargar: 'tecla:KeyR', armaAnterior: 'rueda:-1', armaSiguiente: 'rueda:1',
      lanzable: 'tecla:KeyX', ping: 'tecla:KeyF', mapa: 'tecla:KeyQ', marcador: 'boton:tab', pausa: 'tecla:Escape' };
    if (EV[a]) E.eventos.push(EV[a]);
  }
  function eventoMenu(a) {
    const EV = { aceptar: 'tecla:Enter', volver: 'tecla:Escape', arriba: 'tecla:ArrowUp', abajo: 'tecla:ArrowDown', izquierda: 'tecla:ArrowLeft', derecha: 'tecla:ArrowRight' };
    if (EV[a]) E.eventos.push(EV[a]);
  }

  // Se suma a la lectura del teclado, el mouse y la pantalla táctil
  const leerBase = E.leer;
  E.leer = function (dt) {
    const r = leerBase(dt), g = leerMando(dt);
    if (!g) return r;
    r.avance = Math.max(-1, Math.min(1, r.avance + g.avance));
    r.lateral = Math.max(-1, Math.min(1, r.lateral + g.lateral));
    r.giro += g.giro; r.pitch += g.pitch;
    r.correr = r.correr || g.correr; r.disparo = r.disparo || g.disparo;
    return r;
  };
  // El mouse o el teclado vuelven a mandar (la ayuda de puntería vuelve a la de PC)
  window.addEventListener('mousemove', function (e) { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) E.mando = false; });
  window.addEventListener('keydown', function () { E.mando = false; });

  DM.Mando = D;
})();
