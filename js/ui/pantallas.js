// =====================================================
// Pantallas de interfaz: título, modo solo, selección de personaje, multijugador,
// código de invitación, sala de espera, configuración del versus, pausa,
// ARCHIVO de registros, lectura de un registro, resultados y créditos.
//
// Cada pantalla recibe (ctx, t, S, A):
//   S = estado compartido de la interfaz (lo guarda main.js)
//   A = acciones que ejecuta main.js (cambiar de pantalla, empezar partidas…)
// =====================================================
(function () {
  'use strict';
  const C = DM.config, PAL = DM.paleta, TXT = DM.Texto, UI = DM.UI;
  const W = C.ANCHO, H = C.ALTO;

  function velo(ctx, a) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(7,6,13,' + a + ')');
    g.addColorStop(0.5, 'rgba(7,6,13,' + (a * 0.6) + ')');
    g.addColorStop(1, 'rgba(7,6,13,' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function siNo(v) { return v ? 'SI' : 'NO'; }

  // ---------- Título ----------
  function titulo(ctx, t, S, A) {
    velo(ctx, 0.8);
    const on = Math.floor(t * 2) % 2;
    ctx.fillStyle = on ? PAL.rojo : PAL.rojoOsc; ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2);
    const temblor = (Math.sin(t * 37) > 0.97) ? 2 : 0;
    TXT.textoNeon(ctx, 'DUMULTI', W / 2 + temblor, 30, PAL.cianClaro, PAL.cian, 8, 'centro');
    TXT.texto(ctx, 'SOBREVIVIENTES DE LA NAVE WORODOROX 3073', W / 2, 78, PAL.magentaClaro, 1, 'centro');
    UI.inicio('titulo');
    UI.boton(ctx, 170, 100, 140, 16, 'JUGAR SOLO', { accion: function () { A.ir('solo'); } });
    UI.boton(ctx, 170, 120, 140, 16, 'MULTIJUGADOR', { accion: function () { A.ir('redMenu'); } });
    UI.boton(ctx, 170, 140, 140, 16, 'PERSONAJE: ' + DM.PERSONAJES[S.personaje].nombre, { accion: function () { S.volverDeSeleccion = 'titulo'; A.ir('seleccion'); } });
    UI.boton(ctx, 170, 160, 68, 16, 'OPCIONES', { accion: function () { S.volverDeOpciones = 'titulo'; A.ir('opciones'); } });
    UI.boton(ctx, 242, 160, 68, 16, 'CREDITOS', { accion: function () { A.ir('creditos'); } });
    if (S.aviso) TXT.textoConCaja(ctx, S.aviso, W / 2, 190, PAL.rojo, PAL.rojo);
    const ayuda = S.tactil ? 'TOCA LOS BOTONES PARA ELEGIR' : 'CLIC O FLECHAS + ENTER  -  M: SILENCIO';
    TXT.texto(ctx, ayuda, W / 2, 210, PAL.gris, 1, 'centro');
  }

  // ---------- Jugar solo ----------
  function solo(ctx, t, S, A) {
    velo(ctx, 0.85);
    UI.titulo(ctx, 'JUGAR SOLO', 20);
    UI.inicio('solo');
    UI.boton(ctx, 110, 60, 260, 22, 'COOPERATIVO: SECTOR CRIOGENICO 4', { accion: A.soloCoop });
    TXT.texto(ctx, '8 OLEADAS. AL FINAL, EL ROBOT GUARDIAN', W / 2, 86, PAL.gris, 1, 'centro');
    UI.boton(ctx, 110, 104, 260, 22, 'PRACTICA: SALA DEL REACTOR', { accion: A.soloPractica });
    TXT.texto(ctx, 'LA ARENA DEL VERSUS CON ZOMBIS Y DRONES', W / 2, 130, PAL.gris, 1, 'centro');
    UI.boton(ctx, 110, 150, 260, 16, 'PERSONAJE: ' + DM.PERSONAJES[S.personaje].nombre, { accion: function () { S.volverDeSeleccion = 'solo'; A.ir('seleccion'); } });
    UI.boton(ctx, 190, 200, 100, 16, 'VOLVER', { accion: function () { A.ir('titulo'); } });
  }

  // ---------- Selección de personaje ----------
  function seleccion(ctx, t, S, A) {
    velo(ctx, 0.9);
    UI.titulo(ctx, 'ELIGE TU SOBREVIVIENTE', 10);
    UI.inicio('seleccion');
    const ids = DM.ORDEN_PERSONAJES;
    ids.forEach(function (id, k) {
      const x = 22 + (k % 4) * 112, y = 30 + Math.floor(k / 4) * 62;
      const sel = S.personaje === id;
      UI.boton(ctx, x, y, 104, 56, '', { activo: sel, accion: function () { S.personaje = id; A.guardarPrefs(); } });
      ctx.drawImage(DM.Retrato.cuadros(id)[DM.Retrato.elegir(t + k, false)], x + 4, y + 4);
      TXT.texto(ctx, DM.PERSONAJES[id].nombre, x + 42, y + 8, sel ? PAL.amarilloClaro : PAL.blanco);
      TXT.texto(ctx, 'ANTES: ' + DM.PERSONAJES[id].antes, x + 42, y + 18, PAL.grisOsc);
      TXT.texto(ctx, 'VIDA ' + DM.PERSONAJES[id].vida, x + 42, y + 28, PAL.rojo);
      if (DM.PERSONAJES[id].escudo) TXT.texto(ctx, 'ESC ' + DM.PERSONAJES[id].escudo, x + 76, y + 28, PAL.cian);
    });
    const p = DM.PERSONAJES[S.personaje];
    UI.panel(ctx, 22, 158, 436, 56, PAL.cianOsc);
    TXT.texto(ctx, p.nombre, 30, 164, PAL.amarilloClaro, 2);
    TXT.texto(ctx, 'CONTACTO: ' + p.contacto, 30, 180, PAL.blanco);
    TXT.texto(ctx, 'DISTANCIA: ' + p.distancia, 30, 190, PAL.blanco);
    TXT.texto(ctx, 'VENTAJA: ' + p.ventaja, 30, 202, PAL.verde);
    UI.boton(ctx, 190, 224, 100, 16, 'LISTO', { color: PAL.verde, accion: function () { A.ir(S.volverDeSeleccion || 'titulo'); } });
  }

  // ---------- Multijugador ----------
  function redMenu(ctx, t, S, A) {
    velo(ctx, 0.85);
    UI.titulo(ctx, 'MULTIJUGADOR', 20);
    TXT.texto(ctx, 'HASTA 8 JUGADORES CON UN CODIGO DE INVITACION', W / 2, 44, PAL.gris, 1, 'centro');
    UI.inicio('redMenu');
    UI.boton(ctx, 150, 64, 180, 18, 'CREAR SALA', { accion: A.crearSala });
    UI.boton(ctx, 150, 88, 180, 18, 'UNIRSE CON UN CODIGO', { accion: function () { S.digitos = ''; DM.Red.error = ''; A.ir('codigo'); } });
    UI.boton(ctx, 150, 112, 180, 18, 'PERSONAJE: ' + DM.PERSONAJES[S.personaje].nombre, { accion: function () { S.volverDeSeleccion = 'redMenu'; A.ir('seleccion'); } });
    UI.boton(ctx, 190, 150, 100, 16, 'VOLVER', { accion: function () { A.ir('titulo'); } });
    TXT.texto(ctx, DM.configRed.transporte === 'local' ? 'MODO DE PRUEBA LOCAL (ENTRE PESTANAS)' : 'POR INTERNET (PEERJS)', W / 2, 186, PAL.cianOsc, 1, 'centro');
    TXT.texto(ctx, 'EL ANFITRION DEBERIA JUGAR EN UN PC CON BUENA CONEXION', W / 2, 198, PAL.grisOsc, 1, 'centro');
    if (DM.Red.error) TXT.textoConCaja(ctx, DM.Red.error, W / 2, 222, PAL.rojo, PAL.rojo);
  }

  // ---------- Código de invitación ----------
  function codigo(ctx, t, S, A) {
    velo(ctx, 0.9);
    UI.titulo(ctx, 'UNIRSE A UNA SALA', 16);
    UI.inicio('codigo');
    UI.panel(ctx, 180, 36, 120, 26, PAL.cian);
    const d = S.digitos || '';
    for (let k = 0; k < 4; k++) TXT.texto(ctx, d[k] || '_', 200 + k * 24, 42, d[k] ? PAL.cianClaro : PAL.grisOsc, 3, 'izq', true);
    for (let k = 0; k < 10; k++) {
      const n = (k + 1) % 10, x = 168 + (k % 5) * 30, y = 72 + Math.floor(k / 5) * 26;
      UI.boton(ctx, x, y, 26, 22, String(n), { accion: function () { if ((S.digitos || '').length < 4) S.digitos = (S.digitos || '') + n; } });
    }
    UI.boton(ctx, 168, 126, 70, 16, 'BORRAR', { color: PAL.magenta, accion: function () { S.digitos = (S.digitos || '').slice(0, -1); } });
    UI.boton(ctx, 242, 126, 70, 16, 'UNIRSE', { color: PAL.verde, apagado: d.length !== 4, accion: function () { A.unirse(S.digitos); } });
    UI.boton(ctx, 190, 150, 100, 16, 'VOLVER', { accion: function () { DM.Red.salir(); A.ir('redMenu'); } });
    if (DM.Red.estado) TXT.texto(ctx, DM.Red.estado, W / 2, 182, PAL.amarilloClaro, 1, 'centro');
    if (DM.Red.error) TXT.textoConCaja(ctx, DM.Red.error, W / 2, 196, PAL.rojo, PAL.rojo);
  }

  // ---------- Sala de espera ----------
  function sala(ctx, t, S, A) {
    const R = DM.Red, s = R.sala;
    velo(ctx, 0.9);
    UI.inicio('sala');
    if (!s) {
      TXT.texto(ctx, R.estado || 'CONECTANDO...', W / 2, 100, PAL.amarilloClaro, 1, 'centro');
      if (R.error) TXT.textoConCaja(ctx, R.error, W / 2, 120, PAL.rojo, PAL.rojo);
      UI.boton(ctx, 190, 150, 100, 16, 'VOLVER', { accion: function () { R.salir(); A.ir('redMenu'); } });
      return;
    }
    const anf = R.rol === 'anfitrion';
    TXT.texto(ctx, 'SALA DE ESPERA', 10, 6, PAL.gris);
    TXT.texto(ctx, 'CODIGO', 10, 16, PAL.cian);
    TXT.texto(ctx, s.codigo, 10, 25, PAL.cianClaro, 3, 'izq', true);
    TXT.texto(ctx, 'COMPARTELO CON TUS AMIGOS', 10, 50, PAL.grisOsc);
    // Lista de jugadores
    UI.panel(ctx, 150, 6, 322, 150, PAL.cianOsc);
    TXT.texto(ctx, 'JUGADORES ' + s.jugadores.length + '/' + DM.configRed.MAX_JUGADORES, 156, 10, PAL.gris);
    s.jugadores.slice().sort(function (a, b) { return a.puesto - b.puesto; }).forEach(function (j, k) {
      const y = 20 + k * 17;
      const p = DM.PERSONAJES[j.personaje] || DM.PERSONAJES.pirulo;
      ctx.drawImage(DM.Retrato.cuadros(j.personaje)[0], 0, 0, 34, 34, 156, y, 16, 16);
      TXT.texto(ctx, (j.id === R.miId ? '> ' : '') + p.nombre + (j.anfitrion ? ' (ANFITRION)' : ''), 176, y + 5, j.id === R.miId ? PAL.amarilloClaro : PAL.blanco);
      if (s.modo === 'versus' && s.versus.modo === 'equipos') { ctx.fillStyle = DM.EQUIPOS[j.equipo || 0].color; ctx.fillRect(360, y + 4, 22, 7); }
      TXT.texto(ctx, j.listo ? 'LISTO' : 'ESPERANDO', 466, y + 5, j.listo ? PAL.verde : PAL.grisOsc, 1, 'der');
      if (j.ping !== undefined && !j.anfitrion) TXT.texto(ctx, j.ping + 'MS', 400, y + 5, PAL.grisOsc);
    });
    // Modo y resumen
    TXT.texto(ctx, 'MODO', 10, 66, PAL.gris);
    UI.boton(ctx, 10, 74, 132, 14, s.modo === 'coop' ? 'COOPERATIVO' : 'VERSUS', { apagado: !anf, accion: function () { R.configurar(function (x) { x.modo = x.modo === 'coop' ? 'versus' : 'coop'; }); } });
    TXT.texto(ctx, s.modo === 'coop' ? 'SECTOR CRIOGENICO 4' : 'SALA DEL REACTOR', 10, 92, PAL.cianOsc);
    if (s.modo === 'coop') {
      UI.boton(ctx, 10, 102, 132, 12, 'FUEGO AMIGO: ' + { no: 'NO', si: 'SI', explosivos: 'EXPLOSIVOS' }[s.coop.fuegoAmigo], { apagado: !anf, accion: function () { R.configurar(function (x) { x.coop.fuegoAmigo = { no: 'si', si: 'explosivos', explosivos: 'no' }[x.coop.fuegoAmigo]; }); } });
      UI.boton(ctx, 10, 116, 132, 12, 'TRAMPAS: ' + siNo(s.coop.trampas), { apagado: !anf, accion: function () { R.configurar(function (x) { x.coop.trampas = !x.coop.trampas; }); } });
    } else {
      const v = s.versus;
      TXT.texto(ctx, (v.modo === 'equipos' ? 'EQUIPOS' : 'TODOS CONTRA TODOS') + ' - ' + (v.bajasMeta || 'SIN LIMITE') + ' BAJAS', 10, 104, PAL.blanco);
      TXT.texto(ctx, (v.duracion ? v.duracion + ' MIN' : 'SIN TIEMPO') + ' - FUEGO AMIGO ' + v.fuegoAmigo.toUpperCase(), 10, 113, PAL.blanco);
      UI.boton(ctx, 10, 122, 132, 12, anf ? 'CONFIGURAR PARTIDA' : 'VER CONFIGURACION', { accion: function () { S.paginaConfig = 0; A.ir('configVersus'); } });
    }
    // Mis botones
    const yo = s.jugadores.find(function (j) { return j.id === R.miId; }) || {};
    UI.boton(ctx, 150, 162, 120, 16, 'PERSONAJE', { accion: function () { S.volverDeSeleccion = 'sala'; A.ir('seleccion'); } });
    if (!anf) UI.boton(ctx, 274, 162, 80, 16, yo.listo ? 'NO LISTO' : 'LISTO', { color: PAL.verde, activo: yo.listo, accion: function () { R.actualizarYo({ listo: !yo.listo }); } });
    if (s.modo === 'versus' && s.versus.modo === 'equipos' && s.versus.asignacion === 'elegir') {
      UI.boton(ctx, 358, 162, 114, 16, 'EQUIPO ' + DM.EQUIPOS[yo.equipo || 0].nombre, { color: DM.EQUIPOS[yo.equipo || 0].color, accion: function () { R.actualizarYo({ equipo: 1 - (yo.equipo || 0) }); } });
    }
    if (anf) UI.boton(ctx, 274, 182, 198, 20, R.todosListos() ? 'INICIAR PARTIDA' : 'ESPERANDO QUE ESTEN LISTOS', { color: PAL.verde, apagado: !R.todosListos(), accion: A.iniciarRed });
    UI.boton(ctx, 150, 182, 120, 20, 'SALIR', { color: PAL.magenta, accion: function () { R.salir(); A.ir('redMenu'); } });
    if (R.estado) TXT.texto(ctx, R.estado, W / 2, 214, PAL.amarilloClaro, 1, 'centro');
    if (R.error) TXT.textoConCaja(ctx, R.error, W / 2, 226, PAL.rojo, PAL.rojo);
    if (!anf) TXT.texto(ctx, 'EL ANFITRION ELIGE LA CONFIGURACION: LA VES EN VIVO', 10, 214, PAL.grisOsc);
  }

  // ---------- Configuración del versus (solo el anfitrión la edita) ----------
  const CICLOS = {
    modo: ['todos', 'equipos'], asignacion: ['auto', 'elegir'], fuegoAmigo: ['no', 'si', 'explosivos'],
    bajasMeta: [5, 10, 15, 20, 30, 50, 0], duracion: [3, 5, 10, 15, 20, 0], reaparicionObjetos: ['rapida', 'normal', 'lenta'],
    cantidadEnemigos: ['pocos', 'normal', 'muchos'], espera: [0, 3, 5], castigoEnemigo: [0, -1]
  };
  const NOMBRES = { todos: 'TODOS VS TODOS', equipos: 'EQUIPOS', auto: 'AUTOMATICA', elegir: 'CADA UNO ELIGE', no: 'NO', si: 'SI', explosivos: 'SOLO EXPLOSIVOS', rapida: 'RAPIDA', normal: 'NORMAL', lenta: 'LENTA', pocos: 'POCOS', muchos: 'MUCHOS' };
  function valor(campo, v) {
    if (campo === 'bajasMeta') return v ? String(v) : 'SIN LIMITE';
    if (campo === 'duracion') return v ? v + ' MIN' : 'SIN LIMITE';
    if (campo === 'espera') return v + ' S';
    if (campo === 'castigoEnemigo') return v ? '-1' : '0';
    return NOMBRES[v] || String(v).toUpperCase();
  }
  function configVersus(ctx, t, S, A) {
    const R = DM.Red;
    const c = R.sala ? R.sala.versus : S.configSolo;
    const edita = !R.sala || R.rol === 'anfitrion';
    const cambiar = function (fn) { if (R.sala) R.configurar(function (s) { fn(s.versus); }); else fn(S.configSolo); };
    velo(ctx, 0.92);
    UI.inicio('configVersus' + (S.paginaConfig || 0));
    UI.titulo(ctx, 'CONFIGURACION DEL VERSUS', 8, PAL.magenta);
    const pag = S.paginaConfig || 0;
    UI.boton(ctx, 120, 22, 116, 12, 'PARTIDA', { activo: pag === 0, accion: function () { S.paginaConfig = 0; } });
    UI.boton(ctx, 244, 22, 116, 12, 'DISPONIBILIDAD', { activo: pag === 1, accion: function () { S.paginaConfig = 1; } });
    const ciclo = function (campo) { return function () { cambiar(function (v) { const l = CICLOS[campo]; v[campo] = l[(l.indexOf(v[campo]) + 1) % l.length]; }); }; };
    const toggle = function (obj, k) { return function () { cambiar(function (v) { (obj ? v[obj] : v)[k] = !(obj ? v[obj] : v)[k]; }); }; };
    if (pag === 0) {
      const filas = [
        ['MODO', 'modo'], ['ASIGNACION DE EQUIPOS', 'asignacion'], ['FUEGO AMIGO', 'fuegoAmigo'], ['BAJAS PARA GANAR', 'bajasMeta'],
        ['DURACION', 'duracion'], ['ESPERA PARA REAPARECER', 'espera'], ['MORIR POR ZOMBI O ROBOT', 'castigoEnemigo']
      ];
      filas.forEach(function (f, k) { UI.opcion(ctx, 20, 42 + k * 14, 210, f[0], valor(f[1], c[f[1]]), ciclo(f[1]), !edita || (f[1] === 'asignacion' && c.modo !== 'equipos')); });
      const extras = [['TRAMPAS', 'trampas'], ['INTERRUPTORES', 'interruptores'], ['ASISTENCIA DE PUNTERIA', 'asistencia'], ['SOLO ARMAS DE PERSONAJE', 'soloPropias']];
      extras.forEach(function (f, k) { UI.opcion(ctx, 250, 42 + k * 14, 210, f[0], siNo(c[f[1]]), toggle(null, f[1]), !edita); });
      TXT.texto(ctx, 'CONFIGURACIONES RAPIDAS', 250, 104, PAL.gris);
      let k = 0;
      for (const id in DM.Partida.RAPIDAS) {
        UI.boton(ctx, 250 + (k % 2) * 106, 114 + Math.floor(k / 2) * 16, 102, 13, DM.Partida.RAPIDAS[id].nombre, { apagado: !edita, color: PAL.amarillo, accion: (function (q) { return function () { cambiar(function (v) { Object.assign(v, DM.Partida.versusBase()); DM.Partida.RAPIDAS[q].aplicar(v); }); }; })(id) });
        k++;
      }
      UI.boton(ctx, 250, 150, 102, 13, 'GUARDAR PROPIA', { apagado: !edita, accion: function () { try { localStorage.setItem(C.CLAVE_CONFIG_VERSUS + '_propia', JSON.stringify(c)); S.aviso2 = 'CONFIGURACION GUARDADA'; } catch (err) { /* nada */ } } });
      UI.boton(ctx, 356, 150, 102, 13, 'CARGAR PROPIA', { apagado: !edita, accion: function () { try { const g = JSON.parse(localStorage.getItem(C.CLAVE_CONFIG_VERSUS + '_propia') || 'null'); if (g) cambiar(function (v) { Object.assign(v, g); }); } catch (err) { /* nada */ } } });
    } else {
      TXT.texto(ctx, 'ARMAS DEL MAPA', 20, 40, PAL.amarillo);
      DM.ARMAS_PESADAS.concat(['desintegrador']).forEach(function (id, k) {
        const on = id === 'desintegrador' ? c.desintegrador : c.armas[id];
        UI.opcion(ctx, 20, 50 + k * 12, 210, DM.ARMAS[id].nombre, siNo(on), id === 'desintegrador' ? toggle(null, 'desintegrador') : toggle('armas', id), !edita || c.soloPropias);
      });
      TXT.texto(ctx, 'ENEMIGOS', 20, 150, PAL.rojo);
      DM.ORDEN_ENEMIGOS.forEach(function (id, k) { UI.opcion(ctx, 20, 160 + k * 12, 210, DM.ENEMIGOS[id].nombre, siNo(c.enemigos[id]), toggle('enemigos', id), !edita); });
      UI.opcion(ctx, 20, 220, 210, 'CANTIDAD DE ENEMIGOS', valor('cantidadEnemigos', c.cantidadEnemigos), ciclo('cantidadEnemigos'), !edita);
      TXT.texto(ctx, 'OBJETOS', 250, 40, PAL.amarillo);
      DM.Partida.OBJETOS_CONFIG.forEach(function (id, k) {
        const n = DM.OBJETOS[id] ? DM.OBJETOS[id].nombre : DM.LANZABLES[id].nombre;
        UI.opcion(ctx, 250, 50 + k * 13, 210, n, siNo(c.objetos[id]), toggle('objetos', id), !edita);
      });
      UI.opcion(ctx, 250, 170, 210, 'REAPARICION', valor('reaparicionObjetos', c.reaparicionObjetos), ciclo('reaparicionObjetos'), !edita);
      TXT.texto(ctx, 'PREMIOS MAYORES', 250, 186, PAL.cian);
      DM.Partida.PREMIOS_CONFIG.forEach(function (id, k) { UI.opcion(ctx, 250, 196 + k * 13, 210, DM.OBJETOS[id].nombre, siNo(c.premios[id]), toggle('premios', id), !edita); });
    }
    UI.boton(ctx, 190, 246, 100, 16, 'VOLVER', { accion: function () { A.ir(R.sala ? 'sala' : 'solo'); } });
    if (!edita) TXT.texto(ctx, 'SOLO EL ANFITRION PUEDE CAMBIARLA', 300, 252, PAL.grisOsc);
    if (S.aviso2) { TXT.texto(ctx, S.aviso2, 20, 252, PAL.verde); }
  }

  // ---------- Opciones / volumen (también se usan en la pausa) ----------
  function controlesAudio(ctx, x, y, S, A) {
    const Au = DM.Audio.prefs;
    const barra = function (yy, nombre, v, campo) {
      TXT.texto(ctx, nombre, x, yy + 3, PAL.gris);
      UI.boton(ctx, x + 70, yy, 14, 11, '-', { accion: function () { DM.Audio.fijarVolumen(campo, v - 0.1); } });
      ctx.fillStyle = '#16151f'; ctx.fillRect(x + 88, yy + 3, 60, 5);
      ctx.fillStyle = PAL.cian; ctx.fillRect(x + 88, yy + 3, Math.round(60 * v), 5);
      UI.boton(ctx, x + 152, yy, 14, 11, '+', { accion: function () { DM.Audio.fijarVolumen(campo, v + 0.1); } });
    };
    barra(y, 'MUSICA', Au.musica, 'musica');
    barra(y + 15, 'EFECTOS', Au.efectos, 'efectos');
    UI.boton(ctx, x, y + 30, 166, 11, 'SILENCIO (M): ' + siNo(Au.silencio), { accion: function () { DM.Audio.alternar(); } });
    TXT.texto(ctx, 'SENSIBILIDAD', x, y + 48, PAL.gris);
    UI.boton(ctx, x + 70, y + 45, 14, 11, '-', { accion: function () { S.sens = Math.max(0.3, Math.round((S.sens - 0.1) * 10) / 10); A.guardarPrefs(); } });
    TXT.texto(ctx, S.sens.toFixed(1), x + 118, y + 48, PAL.blanco, 1, 'centro');
    UI.boton(ctx, x + 152, y + 45, 14, 11, '+', { accion: function () { S.sens = Math.min(3, Math.round((S.sens + 0.1) * 10) / 10); A.guardarPrefs(); } });
    UI.boton(ctx, x, y + 60, 166, 11, 'INVERTIR VERTICAL: ' + siNo(S.invertir), { accion: function () { S.invertir = !S.invertir; A.guardarPrefs(); } });
  }
  function opciones(ctx, t, S, A) {
    velo(ctx, 0.9);
    UI.titulo(ctx, 'OPCIONES', 20);
    UI.inicio('opciones');
    controlesAudio(ctx, 157, 50, S, A);
    TXT.texto(ctx, 'CALIDAD: ' + (DM.raycaster.calidad === 'alta' ? 'ALTA' : 'MEDIA') + ' (TECLA C)', W / 2, 140, PAL.gris, 1, 'centro');
    UI.boton(ctx, 190, 200, 100, 16, 'VOLVER', { accion: function () { A.ir(S.volverDeOpciones || 'titulo'); } });
  }

  // ---------- Pausa (en red la partida sigue corriendo) ----------
  function pausa(ctx, t, S, A) {
    velo(ctx, 0.75);
    TXT.textoNeon(ctx, 'PAUSA', W / 2, 16, PAL.blanco, PAL.magenta, 4, 'centro');
    if (S.enRed) TXT.texto(ctx, 'LA PARTIDA SIGUE CORRIENDO', W / 2, 44, PAL.amarilloClaro, 1, 'centro');
    UI.inicio('pausa');
    UI.boton(ctx, 60, 60, 140, 16, 'CONTINUAR', { color: PAL.verde, accion: A.continuar });
    UI.boton(ctx, 60, 80, 140, 16, 'ARCHIVO DE REGISTROS', { accion: function () { S.archivoSel = 0; A.ir('archivo'); } });
    UI.boton(ctx, 60, 100, 140, 16, 'CONTROLES', { accion: function () { A.ir('controles'); } });
    UI.boton(ctx, 60, 120, 140, 16, 'CREDITOS', { accion: function () { S.volverDeCreditos = 'pausa'; A.ir('creditos'); } });
    UI.boton(ctx, 60, 150, 140, 16, S.enRed && DM.Red.rol === 'anfitrion' ? 'TERMINAR PARTIDA' : 'SALIR AL MENU', { color: PAL.magenta, accion: A.salirPartida });
    UI.panel(ctx, 230, 56, 190, 92, PAL.cianOsc);
    controlesAudio(ctx, 242, 64, S, A);
  }

  function controles(ctx, t, S, A) {
    velo(ctx, 0.92);
    UI.titulo(ctx, 'CONTROLES', 10);
    UI.inicio('controles');
    const filas = [
      ['MOVERSE', 'WASD (SHIFT CORRE)', 'JOYSTICK IZQUIERDO'], ['MIRAR', 'MOUSE', 'DESLIZAR A LA DERECHA'],
      ['DISPARAR / GOLPEAR', 'CLIC IZQUIERDO', 'BOTON DISPARO'], ['ARMAS', '1-4 Y RUEDA', 'BOTON ARMA'],
      ['LANZABLE', 'G O CLIC DERECHO', 'BOTON LANZAR'], ['ELEGIR LANZABLE', 'Q', 'TOCAR EL ICONO'], ['RECARGAR', 'R', 'AUTOMATICA'],
      ['USAR / LEER / REVIVIR', 'E (MANTENER PARA REVIVIR)', 'BOTON USAR'], ['MARCADOR', 'TAB', 'BOTON TAB'],
      ['PAUSA / SILENCIO', 'ESC / M', 'BOTONES'], ['FPS / CALIDAD', 'P / C', '-']
    ];
    TXT.texto(ctx, 'ACCION', 20, 32, PAL.gris); TXT.texto(ctx, 'PC', 170, 32, PAL.gris); TXT.texto(ctx, 'TACTIL', 330, 32, PAL.gris);
    filas.forEach(function (f, k) { const y = 44 + k * 14; TXT.texto(ctx, f[0], 20, y, PAL.blanco); TXT.texto(ctx, f[1], 170, y, PAL.cian); TXT.texto(ctx, f[2], 330, y, PAL.amarilloClaro); });
    UI.boton(ctx, 190, 220, 100, 16, 'VOLVER', { accion: function () { A.ir('pausa'); } });
  }

  // ---------- ARCHIVO: registros leídos ----------
  function archivo(ctx, t, S, A) {
    velo(ctx, 0.92);
    UI.titulo(ctx, 'ARCHIVO', 8);
    UI.inicio('archivo');
    const leidos = A.leidos();
    const lista = DM.ORDEN_REGISTROS.filter(function (id) { return leidos[id]; });
    TXT.texto(ctx, lista.length + ' DE ' + DM.ORDEN_REGISTROS.length + ' REGISTROS ENCONTRADOS', W / 2, 26, PAL.gris, 1, 'centro');
    lista.forEach(function (id, k) {
      const r = DM.REGISTROS[id];
      const col = r.formato === 'reporte' ? PAL.rojo : r.formato === 'carta' ? PAL.blanco : PAL.cian;
      UI.boton(ctx, 10, 38 + k * 15, 150, 13, r.titulo, { activo: S.archivoSel === k, colorTexto: col, alinear: 'izq', accion: function () { S.archivoSel = k; } });
    });
    const id = lista[S.archivoSel || 0];
    if (id) registro(ctx, DM.REGISTROS[id], 170, 38, 300, 180);
    else TXT.texto(ctx, 'TODAVIA NO HAS LEIDO NINGUN REGISTRO', 320, 100, PAL.grisOsc, 1, 'centro');
    UI.boton(ctx, 190, 230, 100, 16, 'VOLVER', { accion: function () { A.ir(S.volverDeArchivo || 'pausa'); } });
  }

  // Dibuja un registro con el estilo de su formato
  function registro(ctx, r, x, y, w, h) {
    if (r.formato === 'carta') {
      ctx.fillStyle = '#d8d4c0'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#f4f0e0'; ctx.fillRect(x, y, w, 2);
      TXT.texto(ctx, r.titulo, x + 8, y + 8, '#3a2418');
      TXT.parrafo(ctx, r.texto, x + 8, y + 22, w - 16, '#2a2a3c', 'izq', 9);
    } else if (r.formato === 'reporte') {
      UI.panel(ctx, x, y, w, h, PAL.rojoOsc);
      ctx.fillStyle = PAL.rojoOsc; ctx.fillRect(x, y, w, 12);
      TXT.texto(ctx, r.titulo, x + 6, y + 4, '#ffd0d0');
      TXT.texto(ctx, 'CONFIDENCIAL', x + w - 6, y + 16, PAL.magenta, 1, 'der');
      TXT.parrafo(ctx, r.texto, x + 8, y + 30, w - 16, '#ffb0b0', 'izq', 9);
    } else {
      UI.panel(ctx, x, y, w, h, PAL.cian);
      ctx.fillStyle = PAL.cianOsc; ctx.fillRect(x, y, w, 12);
      TXT.texto(ctx, r.titulo, x + 6, y + 4, PAL.cianClaro);
      TXT.parrafo(ctx, r.texto, x + 8, y + 20, w - 16, '#7fe9f7', 'izq', 9);
    }
    if (r.pista) { ctx.fillStyle = 'rgba(7,6,13,0.85)'; ctx.fillRect(x + 6, y + h - 18, w - 12, 12); TXT.texto(ctx, 'PISTA: ' + r.pista, x + 10, y + h - 15, PAL.amarilloClaro); }
  }

  // ---------- Resultados ----------
  function resultados(ctx, t, S, A) {
    velo(ctx, 0.85);
    UI.inicio('resultados');
    const res = S.resultado || {};
    if (res.modo === 'coop') {
      const gano = res.resultado === 'victoria';
      TXT.textoNeon(ctx, gano ? 'SECTOR LIMPIO' : 'EQUIPO PERDIDO', W / 2, 16, gano ? PAL.verde : PAL.rojo, gano ? PAL.verde : PAL.rojoOsc, 4, 'centro');
      TXT.texto(ctx, gano ? 'LA NAVE SALVAVIDAS PARTE RUMBO A TEMUKEITOR' : 'LLEGARON A LA OLEADA ' + res.oleada + ' DE ' + res.total, W / 2, 46, PAL.blanco, 1, 'centro');
    } else {
      let txt = 'FIN DE LA PARTIDA';
      if (res.equipos && res.ganador !== null && res.ganador !== undefined) txt = 'GANA EL EQUIPO ' + DM.EQUIPOS[res.ganador].nombre;
      else if (res.nombreGanador) txt = 'GANA ' + res.nombreGanador;
      TXT.textoNeon(ctx, txt, W / 2, 16, PAL.amarilloClaro, PAL.magenta, 3, 'centro');
      if (res.equipos) TXT.texto(ctx, 'CIAN ' + res.puntosEquipo[0] + '  -  ' + res.puntosEquipo[1] + ' AMARILLO', W / 2, 46, PAL.blanco, 1, 'centro');
    }
    UI.panel(ctx, 70, 60, 340, 150, PAL.cianOsc);
    TXT.texto(ctx, 'JUGADOR', 80, 66, PAL.gris); TXT.texto(ctx, 'BAJAS', 280, 66, PAL.gris); TXT.texto(ctx, 'MUERTES', 320, 66, PAL.gris); TXT.texto(ctx, 'PUNTOS', 370, 66, PAL.gris);
    (res.tabla || []).forEach(function (f, k) {
      const y = 80 + k * 15;
      const col = f.equipo !== null && f.equipo !== undefined ? DM.EQUIPOS[f.equipo].claro : f.yo ? PAL.amarilloClaro : PAL.blanco;
      ctx.drawImage(DM.Retrato.cuadros(f.personaje)[0], 0, 0, 34, 34, 80, y - 3, 12, 12);
      TXT.texto(ctx, (k + 1) + '. ' + f.nombre, 96, y, col);
      TXT.texto(ctx, String(f.bajas), 300, y, PAL.blanco, 1, 'der');
      TXT.texto(ctx, String(f.muertes), 350, y, PAL.blanco, 1, 'der');
      TXT.texto(ctx, String(f.puntos), 398, y, PAL.amarilloClaro, 1, 'der');
    });
    const enRed = !!DM.Red.rol;
    if (enRed && DM.Red.rol === 'anfitrion') UI.boton(ctx, 120, 220, 120, 16, 'VOLVER A LA SALA', { color: PAL.verde, accion: A.volverASala });
    if (enRed && DM.Red.rol === 'cliente') TXT.texto(ctx, 'ESPERANDO AL ANFITRION...', 180, 225, PAL.grisOsc, 1, 'centro');
    UI.boton(ctx, enRed ? 250 : 190, 220, 110, 16, 'MENU PRINCIPAL', { color: PAL.magenta, accion: A.salirPartida });
  }

  // ---------- Créditos ----------
  function creditos(ctx, t, S, A) {
    velo(ctx, 0.92);
    UI.titulo(ctx, 'CREDITOS', 12);
    UI.inicio('creditos');
    const l = [
      ['DUMULTI', PAL.cianClaro], ['UN JUEGO DE FERNANDO ARAVENA (ORBITA MATEMATICA)', PAL.blanco], ['', ''],
      ['MUNDO DE WORODOROX 3073', PAL.gris], ['', ''],
      ['MUSICA: MONUME - KULAKOVKA - ATLASAUDIO - ALEX-MORGAN (VIA PIXABAY)', PAL.amarilloClaro],
      ['PIXABAY CONTENT LICENSE', PAL.grisOsc], ['', ''],
      ['RED: PEERJS (LICENCIA MIT)', PAL.cian], ['', ''],
      ['GRAFICOS, SONIDOS Y CODIGO GENERADOS CON CODIGO PROPIO', PAL.gris],
      ['INSPIRADO EN DOOM Y WOLFENSTEIN 3D (SIN USAR SU CODIGO NI SUS RECURSOS)', PAL.grisOsc]
    ];
    l.forEach(function (f, k) { if (f[0]) TXT.texto(ctx, f[0], W / 2, 40 + k * 12, f[1], 1, 'centro'); });
    UI.boton(ctx, 190, 220, 100, 16, 'VOLVER', { accion: function () { A.ir(S.volverDeCreditos || 'titulo'); } });
  }

  DM.Pantallas = {
    titulo: titulo, solo: solo, seleccion: seleccion, redMenu: redMenu, codigo: codigo, sala: sala,
    configVersus: configVersus, opciones: opciones, pausa: pausa, controles: controles, archivo: archivo,
    resultados: resultados, creditos: creditos, registro: registro, velo: velo
  };
})();
