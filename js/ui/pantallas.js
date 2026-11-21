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
    UI.boton(ctx, 110, 44, 260, 22, 'CAMPANA: ' + DM.Progreso.cuantos() + ' DE ' + DM.CAMPANA.length + ' SECTORES', { color: PAL.verde, accion: function () { S.nivelSel = DM.Progreso.pendiente(); A.ir('campana'); } });
    TXT.texto(ctx, 'LA HISTORIA: DE LA CRIOGENIA AL HANGAR. SE GUARDA TU AVANCE', W / 2, 70, PAL.gris, 1, 'centro');
    UI.boton(ctx, 110, 86, 260, 20, 'SUPERVIVENCIA: 8 OLEADAS', { accion: A.soloCoop });
    TXT.texto(ctx, 'EN EL SECTOR 1. AL FINAL, EL ROBOT GUARDIAN', W / 2, 110, PAL.gris, 1, 'centro');
    UI.boton(ctx, 110, 126, 260, 20, 'PRACTICA: SALA DEL REACTOR', { accion: A.soloPractica });
    TXT.texto(ctx, 'LA ARENA DEL VERSUS CON ZOMBIS Y DRONES', W / 2, 150, PAL.gris, 1, 'centro');
    UI.boton(ctx, 110, 168, 260, 16, 'PERSONAJE: ' + DM.PERSONAJES[S.personaje].nombre, { accion: function () { S.volverDeSeleccion = 'solo'; A.ir('seleccion'); } });
    UI.boton(ctx, 190, 206, 100, 16, 'VOLVER', { accion: function () { A.ir('titulo'); } });
  }

  // ---------- Campaña: elegir sector ----------
  // Medallas (v1.2)
  const MEDALLAS = [['sinReimpresiones', 'S', 'SIN REIMPRESIONES'], ['rapido', 'R', 'RAPIDO'], ['archivista', 'A', 'ARCHIVISTA']];
  function medalla(ctx, x, y, letra, ganada, nueva) {
    ctx.fillStyle = ganada ? (nueva ? PAL.amarilloClaro : PAL.verde) : '#2a2a3c';
    ctx.fillRect(x, y, 9, 9);
    TXT.texto(ctx, letra, x + 5, y + 2, ganada ? '#07060d' : PAL.grisOsc, 1, 'centro');
  }
  function reloj(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  const FASES_NOMBRE = { oleadas: 'OLEADAS', activar: 'CONSOLAS', jefe: 'JEFE', resistir: 'RESISTIR', salida: 'SALIDA' };
  function campana(ctx, t, S, A) {
    velo(ctx, 0.9);
    UI.titulo(ctx, 'CAMPANA', 8, PAL.verde);
    UI.inicio('campana');
    if (!S.nivelSel || !DM.Progreso.disponible(S.nivelSel)) S.nivelSel = DM.Progreso.pendiente();
    DM.CAMPANA.forEach(function (n, k) {
      const y = 30 + k * 26;
      const hecho = DM.Progreso.completado(n.id), disp = DM.Progreso.disponible(n.id);
      UI.boton(ctx, 20, y, 200, 22, '', { activo: S.nivelSel === n.id, apagado: !disp, accion: function () { S.nivelSel = n.id; } });
      TXT.texto(ctx, n.nombre.replace(/^SECTOR \d - /, ''), 28, y + 4, disp ? PAL.blanco : PAL.grisOsc);
      TXT.texto(ctx, 'SECTOR ' + n.n, 28, y + 13, PAL.gris);
      TXT.texto(ctx, hecho ? 'SUPERADO' : disp ? 'DISPONIBLE' : 'BLOQUEADO', 214, y + 13, hecho ? PAL.verde : disp ? PAL.amarilloClaro : PAL.grisOsc, 1, 'der');
      const md = DM.Progreso.medallas(n.id);
      MEDALLAS.forEach(function (m, q) { medalla(ctx, 178 + q * 12, y + 3, m[1], !!md[m[0]]); });
    });
    TXT.texto(ctx, 'MEDALLAS: S SIN REIMPRESIONES  R RAPIDO  A ARCHIVISTA', 20, 188, PAL.grisOsc);
    const n = DM.CAMPANA_POR_ID[S.nivelSel];
    UI.panel(ctx, 232, 30, 230, 126, PAL.cianOsc);
    TXT.texto(ctx, n.nombre, 240, 36, PAL.cianClaro);
    TXT.parrafo(ctx, n.intro, 240, 50, 214, PAL.blanco, 'izq', 9);
    TXT.texto(ctx, 'OBJETIVOS', 240, 90, PAL.gris);
    n.fases.forEach(function (f, k) { TXT.texto(ctx, (k + 1) + '. ' + FASES_NOMBRE[f.tipo] + ': ' + f.texto, 240, 100 + k * 10, PAL.amarilloClaro); });
    TXT.texto(ctx, 'MAPA: ' + DM.mapas[n.mapa].nombre, 240, 144, PAL.grisOsc);
    UI.boton(ctx, 232, 164, 230, 22, 'JUGAR ' + n.nombre.split(' - ')[0], { color: PAL.verde, accion: function () { A.soloCampana(S.nivelSel); } });
    UI.boton(ctx, 20, 164, 200, 16, 'PERSONAJE: ' + DM.PERSONAJES[S.personaje].nombre, { accion: function () { S.volverDeSeleccion = 'campana'; A.ir('seleccion'); } });
    UI.boton(ctx, 190, 206, 100, 16, 'VOLVER', { accion: function () { A.ir('solo'); } });
    TXT.texto(ctx, 'TAMBIEN SE JUEGA EN COOPERATIVO DESDE MULTIJUGADOR', W / 2, 228, PAL.grisOsc, 1, 'centro');
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
    const NOMBRE_MODO = { campana: 'CAMPANA (COOPERATIVO)', coop: 'SUPERVIVENCIA', versus: 'VERSUS' };
    UI.boton(ctx, 10, 74, 132, 14, NOMBRE_MODO[s.modo] || 'VERSUS', { apagado: !anf, accion: function () { R.configurar(function (x) { x.modo = { campana: 'coop', coop: 'versus', versus: 'campana' }[x.modo] || 'campana'; if (!x.nivel) x.nivel = DM.Progreso.pendiente(); }); } });
    if (s.modo === 'campana') {
      // El sector se elige entre los que el anfitrión ya desbloqueó
      const disp = DM.Progreso.disponibles();
      const k = Math.max(0, disp.indexOf(s.nivel));
      const n = DM.CAMPANA_POR_ID[s.nivel] || DM.CAMPANA[0];
      if (anf) {
        UI.boton(ctx, 10, 90, 14, 10, '<', { apagado: k <= 0, accion: function () { R.configurar(function (x) { x.nivel = disp[Math.max(0, k - 1)]; }); } });
        UI.boton(ctx, 128, 90, 14, 10, '>', { apagado: k >= disp.length - 1, accion: function () { R.configurar(function (x) { x.nivel = disp[Math.min(disp.length - 1, k + 1)]; }); } });
      }
      TXT.texto(ctx, 'SECTOR ' + n.n, 76, 92, PAL.cianClaro, 1, 'centro');
      TXT.texto(ctx, n.nombre.replace(/^SECTOR \d - /, '').slice(0, 33), 76, 104, PAL.cian, 1, 'centro');
    } else TXT.texto(ctx, s.modo === 'coop' ? 'SECTOR 1 - 8 OLEADAS' : (DM.mapas[s.mapa] || { nombre: '' }).nombre, 10, 92, PAL.cianOsc);
    if (s.modo === 'campana' || s.modo === 'coop') {
      const yb = s.modo === 'campana' ? 114 : 102;
      UI.boton(ctx, 10, yb, 132, 12, 'FUEGO AMIGO: ' + { no: 'NO', si: 'SI', explosivos: 'EXPLOSIVOS' }[s.coop.fuegoAmigo], { apagado: !anf, accion: function () { R.configurar(function (x) { x.coop.fuegoAmigo = { no: 'si', si: 'explosivos', explosivos: 'no' }[x.coop.fuegoAmigo]; }); } });
      UI.boton(ctx, 10, yb + 14, 132, 12, 'TRAMPAS: ' + siNo(s.coop.trampas), { apagado: !anf, accion: function () { R.configurar(function (x) { x.coop.trampas = !x.coop.trampas; }); } });
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
    cantidadEnemigos: ['pocos', 'normal', 'muchos'], espera: [0, 3, 5], castigoEnemigo: [0, -1], arena: ['auto', 'chica', 'grande']
  };
  const NOMBRES = { todos: 'TODOS VS TODOS', equipos: 'EQUIPOS', auto: 'AUTOMATICA', elegir: 'CADA UNO ELIGE', no: 'NO', si: 'SI', explosivos: 'SOLO EXPLOSIVOS', rapida: 'RAPIDA', normal: 'NORMAL', lenta: 'LENTA', pocos: 'POCOS', muchos: 'MUCHOS', chica: 'CHICA (2 A 4)', grande: 'GRANDE (5 A 8)' };
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
        ['DURACION', 'duracion'], ['ESPERA PARA REAPARECER', 'espera'], ['MORIR POR ZOMBI O ROBOT', 'castigoEnemigo'], ['ARENA', 'arena']
      ];
      if (!c.arena) c.arena = 'auto';
      filas.forEach(function (f, k) { UI.opcion(ctx, 20, 42 + k * 14, 210, f[0], valor(f[1], c[f[1]]), ciclo(f[1]), !edita || (f[1] === 'asignacion' && c.modo !== 'equipos')); });
      const nJug = R.sala ? R.sala.jugadores.length : 1;
      TXT.texto(ctx, 'AHORA: ' + DM.mapas[DM.Partida.arenaVersus(c.arena, nJug)].nombre + ' (' + nJug + ' JUG.)', 20, 42 + 8 * 14 + 2, PAL.cianOsc);
      if (c.delatar === undefined) c.delatar = true;
      const extras = [['TRAMPAS', 'trampas'], ['INTERRUPTORES', 'interruptores'], ['ASISTENCIA DE PUNTERIA', 'asistencia'], ['SOLO ARMAS DE PERSONAJE', 'soloPropias'], ['DISPARAR TE DELATA', 'delatar']];
      extras.forEach(function (f, k) { UI.opcion(ctx, 250, 42 + k * 14, 210, f[0], siNo(c[f[1]]), toggle(null, f[1]), !edita); });
      TXT.texto(ctx, 'CONFIGURACIONES RAPIDAS', 250, 116, PAL.gris);
      let k = 0;
      for (const id in DM.Partida.RAPIDAS) {
        UI.boton(ctx, 250 + (k % 2) * 106, 126 + Math.floor(k / 2) * 16, 102, 13, DM.Partida.RAPIDAS[id].nombre, { apagado: !edita, color: PAL.amarillo, accion: (function (q) { return function () { cambiar(function (v) { Object.assign(v, DM.Partida.versusBase()); DM.Partida.RAPIDAS[q].aplicar(v); }); }; })(id) });
        k++;
      }
      UI.boton(ctx, 250, 162, 102, 13, 'GUARDAR PROPIA', { apagado: !edita, accion: function () { try { localStorage.setItem(C.CLAVE_CONFIG_VERSUS + '_propia', JSON.stringify(c)); S.aviso2 = 'CONFIGURACION GUARDADA'; } catch (err) { /* nada */ } } });
      UI.boton(ctx, 356, 162, 102, 13, 'CARGAR PROPIA', { apagado: !edita, accion: function () { try { const g = JSON.parse(localStorage.getItem(C.CLAVE_CONFIG_VERSUS + '_propia') || 'null'); if (g) cambiar(function (v) { Object.assign(v, g); }); } catch (err) { /* nada */ } } });
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
    TXT.texto(ctx, 'CALIDAD: ' + (DM.raycaster.calidad === 'alta' ? 'ALTA' : 'MEDIA') + ' (TECLA C)', W / 2, 128, PAL.gris, 1, 'centro');
    // Diagnóstico de la música: qué archivo busca y si lo encontró
    const em = DM.Audio.estadoMusica();
    const NOM = { menu: 'MENU', coop: 'OLEADAS', final: 'OLEADA FINAL', versus: 'VERSUS' };
    const EST = { ok: ['OK', PAL.verde], falta: ['NO ENCONTRADO (SUENA LA PISTA GENERADA)', PAL.rojo], bloqueada: ['BLOQUEADA: HAZ CLIC', PAL.amarillo], cargando: ['CARGANDO...', PAL.gris], 'sin cargar': ['HAZ CLIC PARA ACTIVAR EL SONIDO', PAL.gris] };
    TXT.texto(ctx, 'MUSICA (CARPETA ASSETS/MUSICA)', 40, 140, PAL.cian);
    ['menu', 'coop', 'final', 'versus'].forEach(function (u, k) {
      const e = EST[em[u].estado] || [em[u].estado.toUpperCase(), PAL.gris];
      TXT.texto(ctx, NOM[u] + ': ' + em[u].archivo.replace('assets/musica/', ''), 40, 149 + k * 9, PAL.blanco);
      TXT.texto(ctx, e[0], 440, 149 + k * 9, e[1], 1, 'der');
    });
    // Control USB o Bluetooth
    const MD = DM.Mando, PM = MD.prefs;
    TXT.texto(ctx, MD.conectado ? 'CONTROL: ' + MD.nombre.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').slice(0, 40) : 'CONTROL: NO DETECTADO (APRIETA UN BOTON)', W / 2, 186, MD.conectado ? PAL.verde : PAL.grisOsc, 1, 'centro');
    UI.boton(ctx, 60, 196, 170, 11, 'STICK: SENSIBILIDAD ' + PM.sens.toFixed(1).replace('.', ','), { accion: function () { PM.sens = PM.sens >= 2 ? 0.4 : Math.round((PM.sens + 0.2) * 10) / 10; MD.guardar(); } });
    UI.boton(ctx, 250, 196, 170, 11, 'ZONA MUERTA ' + Math.round(PM.zonaMuerta * 100) + ' %', { accion: function () { PM.zonaMuerta = PM.zonaMuerta >= 0.4 ? 0.06 : Math.round((PM.zonaMuerta + 0.04) * 100) / 100; MD.guardar(); } });
    UI.boton(ctx, 130, 210, 100, 16, 'ESTADISTICAS', { color: PAL.amarillo, accion: function () { S.estMapa = null; A.ir('estadisticas'); } });
    UI.boton(ctx, 250, 210, 100, 16, 'VOLVER', { accion: function () { A.ir(S.volverDeOpciones || 'titulo'); } });
  }

  // ---------- Estadísticas (v1.2): mapa de calor de las muertes y tiempo por fase ----------
  function estadisticas(ctx, t, S, A) {
    velo(ctx, 0.94);
    UI.titulo(ctx, 'ESTADISTICAS', 12, PAL.amarillo);
    UI.inicio('estadisticas');
    const lista = DM.Estadisticas.lista();
    const mapas = [];
    lista.forEach(function (p) { if (p.mapa && DM.mapas[p.mapa] && mapas.indexOf(p.mapa) < 0) mapas.push(p.mapa); });
    TXT.texto(ctx, lista.length + ' PARTIDAS GUARDADAS EN ESTE DISPOSITIVO (MAXIMO 30)', W / 2, 28, PAL.gris, 1, 'centro');
    if (!mapas.length) {
      TXT.texto(ctx, 'TODAVIA NO HAY PARTIDAS TERMINADAS', W / 2, 110, PAL.grisOsc, 1, 'centro');
    } else {
      if (mapas.indexOf(S.estMapa) < 0) { S.estMapa = mapas[0]; S.estPiso = 0; }
      const def = DM.mapas[S.estMapa], mapa = new DM.Mapa(def);
      const piso = Math.min(S.estPiso || 0, mapa.pisos.length - 1), p = mapa.pisos[piso];
      UI.boton(ctx, 10, 38, 150, 13, 'MAPA: ' + def.nombre.slice(0, 22), { accion: function () { S.estMapa = mapas[(mapas.indexOf(S.estMapa) + 1) % mapas.length]; S.estPiso = 0; } });
      UI.boton(ctx, 10, 54, 150, 13, 'PISO ' + (piso + 1) + ' DE ' + mapa.pisos.length, { apagado: mapa.pisos.length < 2, accion: function () { S.estPiso = (piso + 1) % mapa.pisos.length; } });
      // Plano del piso con las muertes encima
      const tam = Math.floor(Math.min(170 / p.ancho, 170 / p.alto)), ox = 175, oy = 38;
      const cuenta = new Uint16Array(p.ancho * p.alto); let max = 1;
      const delMapa = lista.filter(function (q) { return q.mapa === S.estMapa; });
      delMapa.forEach(function (q) { (q.muertes || []).forEach(function (m) { if (m.piso !== piso || !p.dentro(Math.floor(m.x), Math.floor(m.y))) return; const i = p.indice(Math.floor(m.x), Math.floor(m.y)); cuenta[i]++; if (cuenta[i] > max) max = cuenta[i]; }); });
      for (let y = 0; y < p.alto; y++) for (let x = 0; x < p.ancho; x++) {
        const i = p.indice(x, y);
        ctx.fillStyle = p.paredes[i] ? '#2a2a3c' : '#0d0c16';
        ctx.fillRect(ox + x * tam, oy + y * tam, tam, tam);
        if (cuenta[i]) { ctx.fillStyle = 'rgba(255,59,59,' + (0.35 + 0.65 * cuenta[i] / max).toFixed(2) + ')'; ctx.fillRect(ox + x * tam, oy + y * tam, tam, tam); }
      }
      TXT.texto(ctx, 'ROJO: DONDE CAYERON (MAS FUERTE = MAS VECES)', ox, oy + p.alto * tam + 3, PAL.grisOsc);
      // Causas y tiempos por fase
      const causas = {}; let total = 0;
      delMapa.forEach(function (q) { (q.muertes || []).forEach(function (m) { causas[m.causa] = (causas[m.causa] || 0) + 1; total++; }); });
      TXT.texto(ctx, 'CAIDAS: ' + total, 10, 74, PAL.rojo);
      Object.keys(causas).sort(function (a, b) { return causas[b] - causas[a]; }).slice(0, 5).forEach(function (c, k) { TXT.texto(ctx, String(c).toUpperCase().slice(0, 18) + ': ' + causas[c], 14, 84 + k * 9, PAL.gris); });
      const fases = {};
      delMapa.forEach(function (q) { (q.fases || []).forEach(function (f) { const e = fases[f.nombre] = fases[f.nombre] || [0, 0]; e[0] += f.s; e[1]++; }); });
      TXT.texto(ctx, 'TIEMPO MEDIO POR FASE', 10, 134, PAL.cian);
      Object.keys(fases).slice(0, 7).forEach(function (f, k) { TXT.texto(ctx, f.slice(0, 20) + ': ' + reloj(fases[f][0] / fases[f][1]), 14, 144 + k * 9, PAL.gris); });
      const gan = delMapa.filter(function (q) { return q.resultado === 'victoria'; }).length;
      TXT.texto(ctx, 'PARTIDAS: ' + delMapa.length + (delMapa[0] && delMapa[0].modo !== 'versus' ? '  GANADAS: ' + gan : ''), 10, 210, PAL.blanco);
    }
    UI.boton(ctx, 10, 240, 110, 14, 'COPIAR (JSON)', { apagado: !lista.length, accion: function () { A.copiar(DM.Estadisticas.json()); S.aviso2 = 'DATOS COPIADOS: PEGALOS EN EL CHAT'; } });
    UI.boton(ctx, 126, 240, 90, 14, 'BORRAR', { color: PAL.magenta, apagado: !lista.length, accion: function () { DM.Estadisticas.borrar(); } });
    UI.boton(ctx, 370, 240, 100, 14, 'VOLVER', { accion: function () { A.ir('opciones'); } });
    if (S.aviso2) TXT.texto(ctx, S.aviso2, 222, 244, PAL.verde);
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
      ['LANZABLE', 'G O CLIC DERECHO', 'BOTON LANZAR'], ['ELEGIR LANZABLE', 'X', 'BOTON GIRAR'], ['RECARGAR', 'R', 'AUTOMATICA'],
      ['USAR / LEER / REVIVIR', 'E (MANTENER PARA REVIVIR)', 'BOTON USAR'], ['MARCADOR', 'TAB', 'BOTON TAB'], ['MAPA', 'Q', 'BOTON MAPA'],
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
    if (res.modo === 'campana') {
      const gano = res.resultado === 'victoria';
      const n = DM.CAMPANA_POR_ID[res.nivel] || DM.CAMPANA[0];
      const ultimo = n.n === DM.CAMPANA.length;
      TXT.textoNeon(ctx, gano ? (ultimo ? 'ESCAPARON' : 'SECTOR SUPERADO') : 'EQUIPO PERDIDO', W / 2, 16, gano ? PAL.verde : PAL.rojo, gano ? PAL.verde : PAL.rojoOsc, 4, 'centro');
      const sig = DM.Progreso.siguiente(n.id);
      TXT.texto(ctx, gano ? (ultimo ? n.final : 'SE DESBLOQUEO EL ' + DM.CAMPANA_POR_ID[sig].nombre) : n.nombre + ': CAYERON EN EL OBJETIVO ' + res.fase + ' DE ' + res.fases, W / 2, 40, PAL.blanco, 1, 'centro');
      // Medallas de esta partida (amarillas si son nuevas) y secretos encontrados
      let xm = 78;
      MEDALLAS.forEach(function (m) {
        const g = res.medallas && res.medallas[m[0]], nueva = (res.medallasNuevas || []).indexOf(m[0]) >= 0;
        medalla(ctx, xm, 50, m[1], g, nueva);
        const txt = m[2] + (m[0] === 'rapido' ? ' ' + reloj(res.tiempo) + '/' + reloj(n.tiempoMeta) : '');
        TXT.texto(ctx, txt, xm + 12, 52, g ? (nueva ? PAL.amarilloClaro : PAL.verde) : PAL.grisOsc);
        xm += DM.fuente.ancho(txt) + 22;
      });
      if (res.secretos && res.secretos[1]) TXT.texto(ctx, 'SECRETOS ' + res.secretos[0] + '/' + res.secretos[1], 402, 52, res.secretos[0] === res.secretos[1] ? PAL.verde : PAL.gris, 1, 'der');
    } else if (res.modo === 'coop') {
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
    UI.panel(ctx, 70, 60, 340, 132, PAL.cianOsc);
    TXT.texto(ctx, 'JUGADOR', 80, 66, PAL.gris); TXT.texto(ctx, 'BAJAS', 280, 66, PAL.gris); TXT.texto(ctx, 'MUERTES', 320, 66, PAL.gris); TXT.texto(ctx, 'PUNTOS', 370, 66, PAL.gris);
    (res.tabla || []).forEach(function (f, k) {
      const y = 80 + k * 13;
      const col = f.equipo !== null && f.equipo !== undefined ? DM.EQUIPOS[f.equipo].claro : f.yo ? PAL.amarilloClaro : PAL.blanco;
      ctx.drawImage(DM.Retrato.cuadros(f.personaje)[0], 0, 0, 34, 34, 80, y - 3, 12, 12);
      TXT.texto(ctx, (k + 1) + '. ' + f.nombre, 96, y, col);
      TXT.texto(ctx, String(f.bajas), 300, y, PAL.blanco, 1, 'der');
      TXT.texto(ctx, String(f.muertes), 350, y, PAL.blanco, 1, 'der');
      TXT.texto(ctx, String(f.puntos), 398, y, PAL.amarilloClaro, 1, 'der');
    });
    const enRed = !!DM.Red.rol;
    // Campaña: seguir con el siguiente sector, reintentar o ver el final
    const puedeElegir = !enRed || DM.Red.rol === 'anfitrion';
    if (res.modo === 'campana') {
      const gano = res.resultado === 'victoria';
      const sig = DM.Progreso.siguiente(res.nivel);
      if (gano && !sig) UI.boton(ctx, 30, 198, 130, 16, 'VER EL FINAL', { color: PAL.verde, accion: function () { A.ir('final'); } });
      else if (gano && puedeElegir) UI.boton(ctx, 30, 198, 130, 16, 'SIGUIENTE SECTOR', { color: PAL.verde, accion: A.siguienteSector });
      else if (puedeElegir) UI.boton(ctx, 30, 198, 130, 16, 'REINTENTAR', { color: PAL.amarillo, accion: A.reintentar });
    } else if (!enRed && res.modo !== 'campana') UI.boton(ctx, 30, 198, 130, 16, 'JUGAR DE NUEVO', { color: PAL.amarillo, accion: A.reintentar });
    if (enRed && DM.Red.rol === 'anfitrion') UI.boton(ctx, 120, 220, 120, 16, 'VOLVER A LA SALA', { color: PAL.verde, accion: A.volverASala });
    if (enRed && DM.Red.rol === 'cliente') TXT.texto(ctx, 'ESPERANDO AL ANFITRION...', 180, 225, PAL.grisOsc, 1, 'centro');
    UI.boton(ctx, enRed ? 250 : 190, 220, 110, 16, 'MENU PRINCIPAL', { color: PAL.magenta, accion: A.salirPartida });
  }

  // ---------- Final de la campaña ----------
  function final(ctx, t, S, A) {
    velo(ctx, 0.95);
    UI.inicio('final');
    const sube = Math.min(1, t * 0.4);
    ctx.globalAlpha = sube;
    TXT.textoNeon(ctx, 'RUMBO A TEMUKEITOR', W / 2, 18, PAL.cianClaro, PAL.cian, 3, 'centro');
    TXT.parrafo(ctx, 'LA NAVE SALVAVIDAS SE SUELTA DEL HANGAR B Y CAE HACIA LA NOCHE. ATRAS QUEDA LA WORODOROX 3073, CON SUS DORMIDOS DESPIERTOS, SUS DRONES CIEGOS Y EL REACTOR APAGADO.', W / 2, 56, 400, PAL.blanco, 'centro', 10);
    TXT.parrafo(ctx, 'EN LA RADIO SE ESCUCHA UNA VOZ LEJANA: OTRO GRUPO, UNA NINA LLAMADA CHISPA, LLEGO AL NUCLEO DE LA IA. TAL VEZ TAMBIEN ENCUENTREN LA SALIDA.', W / 2, 100, 400, PAL.cian, 'centro', 10);
    TXT.parrafo(ctx, 'ADELANTE, LAS LUCES DE TEMUKEITOR: EL ULTIMO REDUCTO DONDE LOS HUMANOS VIVEN EN PAZ.', W / 2, 140, 400, PAL.amarilloClaro, 'centro', 10);
    TXT.texto(ctx, 'FIN DE LA CAMPANA', W / 2, 172, PAL.verde, 1, 'centro');
    ctx.globalAlpha = 1;
    UI.boton(ctx, 120, 200, 110, 16, 'CREDITOS', { accion: function () { S.volverDeCreditos = 'titulo'; A.ir('creditos'); } });
    UI.boton(ctx, 250, 200, 110, 16, 'MENU PRINCIPAL', { color: PAL.magenta, accion: A.salirPartida });
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
    titulo: titulo, solo: solo, campana: campana, final: final, seleccion: seleccion, estadisticas: estadisticas, redMenu: redMenu, codigo: codigo, sala: sala,
    configVersus: configVersus, opciones: opciones, pausa: pausa, controles: controles, archivo: archivo,
    resultados: resultados, creditos: creditos, registro: registro, velo: velo
  };
})();
