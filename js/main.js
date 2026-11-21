// =====================================================
// DUMULTI - Bucle principal, estados y coordinación
//
// Pantallas: titulo, solo, seleccion, redMenu, codigo, sala, configVersus, opciones,
//            creditos, juego, pausa, controles, archivo, resultados
//
// Separación estricta:
//   ENTRADA (input.js)  → main.js arma un COMANDO por paso de 1/60 s
//   SIMULACIÓN (sim/)   → mundo.paso(dt, comandos); no toca el DOM
//   RED (red/)          → anfitrión: junta comandos y envía instantáneas;
//                         cliente: predice su movimiento e interpola a los demás
//   DIBUJO (motor3d/, ui/) y AUDIO solo leen el estado y los eventos
// =====================================================
(function () {
  'use strict';
  const C = DM.config, PAL = DM.paleta, Red = DM.Red, E = DM.Entrada;

  const canvas = document.getElementById('pantalla');
  const ctx = canvas.getContext('2d');
  const contenedor = document.getElementById('contenedor');
  canvas.width = C.ANCHO; canvas.height = C.ALTO;
  ctx.imageSmoothingEnabled = false;
  E.iniciar(canvas, contenedor);
  E.fijarModo('ui');
  DM.raycaster.iniciar(ctx);

  // ---------- Preferencias ----------
  const S = { personaje: 'pirulo', sens: 1, invertir: false, digitos: '', paginaConfig: 0, archivoSel: 0, aviso: '', enRed: false, tactil: false, configSolo: null };
  try { Object.assign(S, JSON.parse(localStorage.getItem(C.CLAVE_PREFS) || '{}')); } catch (err) { /* nada */ }
  if (!DM.PERSONAJES[S.personaje]) S.personaje = 'pirulo';
  function guardarPrefs() { try { localStorage.setItem(C.CLAVE_PREFS, JSON.stringify({ personaje: S.personaje, sens: S.sens, invertir: S.invertir })); } catch (err) { /* nada */ } }

  // ---------- Estado ----------
  let estado = 'titulo', tEstado = 0, tiempo = 0, ultimo = performance.now(), acum = 0;
  let mundo = null, jug = null;
  let mostrarFps = false, fps = 0, acumFps = 0, cuadros = 0;
  let aviso = null, tFin = -1, audioListo = false;
  const vista = { ang: 0, pitch: 0 };
  const toques = { usarToque: false, lanzar: false, arma: 0, recargar: false, cambiaLanzable: false };
  const fasesTrampa = {};
  let tPaso = 0, tAmbiente = 2;

  // Mundo de fondo para los menús (solo se dibuja)
  const fondo = new DM.Mundo(DM.mapas.reactor, 'versus', null, { cliente: true });
  const camFondo = { x: 12, y: 5.5, piso: 0, ang: 1.57, pitch: 0, camZ: 0.5 };
  let motorDe = null;   // mundo para el que está preparado el motor de dibujo
  function prepararMotor(m) { motorDe = m; DM.luces.preparar(m.mapa); DM.raycaster.preparar(m.mapa); DM.Escena.reiniciar(); }
  prepararMotor(fondo);

  function tactil() { return E.tactil || matchMedia('(pointer: coarse)').matches; }
  function ajustar() {
    const esc = Math.min(window.innerWidth / C.ANCHO, window.innerHeight / C.ALTO);
    contenedor.style.width = Math.floor(C.ANCHO * esc) + 'px';
    contenedor.style.height = Math.floor(C.ALTO * esc) + 'px';
  }
  window.addEventListener('resize', ajustar);
  ajustar();

  const EN_JUEGO = { juego: 1, pausa: 1, controles: 1, archivo: 1 };
  function cambiar(nuevo) {
    estado = nuevo; tEstado = 0;
    E.fijarModo(nuevo === 'juego' ? 'juego' : 'ui');
    document.body.classList.toggle('en-partida', !!EN_JUEGO[nuevo]);
    musicaSegunEstado();
  }
  function musicaSegunEstado() {
    if (!DM.Audio) return;
    if (EN_JUEGO[estado] && mundo) {
      const st = mundo.estadoRed || mundo.reglas.estado();
      let pista = mundo.modo === 'versus' ? 'versus' : st.oleada === st.total ? 'final' : 'coop';
      if (st.modo === 'campana') pista = st.tipo === 'jefe' || (st.n === DM.CAMPANA.length && st.fase >= 2) || (st.tipo === 'oleadas' && st.oleada === st.total) ? 'final' : 'coop';
      DM.Audio.musica(pista);
    } else if (estado !== 'resultados') DM.Audio.musica('menu');
  }

  // =====================================================
  // INICIO DE PARTIDAS
  // =====================================================
  function empezar(m, idLocal) {
    mundo = m; jug = mundo.jugadores[idLocal];
    DM.MapaUI.abierto = false;
    vista.ang = jug.ang; vista.pitch = 0;
    acum = 0; tFin = -1; aviso = null;
    prepararMotor(mundo);
    DM.HUD.reiniciar();
    DM.HUD.anunciarPiso(mundo.mapa.pisos[jug.piso].nombre);
    for (const k in fasesTrampa) delete fasesTrampa[k];
    cambiar('juego');
    E.pedirBloqueo();
  }
  function soloCoop() {
    S.enRed = false; S.ultima = { tipo: 'coop' };
    const m = new DM.Mundo(DM.mapas.sector4, 'coop', DM.Partida.coopBase(), { semilla: (Math.random() * 1e9) | 0 });
    m.agregarJugador('h', S.personaje, 0); m.iniciar();
    empezar(m, 'h');
  }
  function soloPractica() {
    S.enRed = false; S.ultima = { tipo: 'practica' };
    const c = DM.Partida.versusBase();
    for (const k in c.enemigos) c.enemigos[k] = k !== 'guardian';
    c.bajasMeta = 0; c.duracion = 0;
    const m = new DM.Mundo(DM.mapas.reactor, 'versus', c, { semilla: (Math.random() * 1e9) | 0 });
    m.agregarJugador('h', S.personaje, 0); m.iniciar();
    empezar(m, 'h');
  }
  // Campaña en solitario: un sector (s1..s5)
  function soloCampana(id) {
    const n = DM.CAMPANA_POR_ID[id];
    if (!n) return;
    S.enRed = false; S.ultima = { tipo: 'campana', nivel: id };
    const m = new DM.Mundo(DM.mapas[n.mapa], 'coop', DM.Partida.coopBase(), { semilla: (Math.random() * 1e9) | 0, nivel: id });
    m.agregarJugador('h', S.personaje, 0); m.iniciar();
    empezar(m, 'h');
  }
  // Partida en red (anfitrión y clientes reciben los mismos datos de inicio)
  function iniciarDesdeDatos(d) {
    S.enRed = true;
    const m = new DM.Mundo(DM.mapas[d.mapa], d.modo, d.conf, { semilla: d.semilla, cliente: Red.rol === 'cliente', nivel: d.nivel || null });
    for (const j of d.jugadores) { const pj = m.agregarJugador(j.id, j.personaje, j.puesto); pj.equipo = j.equipo; }
    if (Red.rol === 'anfitrion') m.iniciar();
    empezar(m, Red.miId);
  }

  // ---------- Red: callbacks ----------
  Red.al.inicio = function (d) { iniciarDesdeDatos(d); };
  Red.al.aSala = function () { mundo = null; jug = null; prepararMotor(fondo); cambiar('sala'); };
  Red.al.desconectado = function (motivo) { mundo = null; jug = null; prepararMotor(fondo); S.aviso = motivo; cambiar('titulo'); };
  Red.al.aviso = function (m) { DM.HUD.mostrar(m, 2); };

  // Acciones que usan las pantallas
  const A = {
    ir: function (e) { if (e === 'configVersus' && !Red.sala && !S.configSolo) S.configSolo = Red.cargarConfigVersus(); cambiar(e); },
    guardarPrefs: guardarPrefs,
    soloCoop: soloCoop, soloPractica: soloPractica, soloCampana: soloCampana,
    // Después de un sector: seguir con el siguiente o reintentar (solo o como anfitrión)
    siguienteSector: function () {
      const sig = S.resultado && DM.Progreso.siguiente(S.resultado.nivel);
      if (!sig) return;
      if (Red.rol === 'anfitrion') { Red.configurar(function (x) { x.modo = 'campana'; x.nivel = sig; }); A.iniciarRed(); }
      else soloCampana(sig);
    },
    reintentar: function () {
      if (Red.rol === 'anfitrion') { A.iniciarRed(); return; }
      const u = S.ultima || { tipo: 'coop' };
      if (u.tipo === 'campana') soloCampana(u.nivel); else if (u.tipo === 'practica') soloPractica(); else soloCoop();
    },
    crearSala: function () { Red.crear(S.personaje); cambiar('sala'); },
    unirse: function (cod) { Red.unirse(cod, S.personaje); cambiar('sala'); },
    iniciarRed: function () { const d = Red.iniciarPartida(); if (d) iniciarDesdeDatos(d); },
    continuar: function () { cambiar('juego'); E.pedirBloqueo(); },
    salirPartida: function () {
      if (Red.rol === 'anfitrion') { Red.volverASala(); mundo = null; jug = null; prepararMotor(fondo); cambiar('sala'); return; }
      if (Red.rol === 'cliente') Red.salir();
      mundo = null; jug = null; prepararMotor(fondo); cambiar('titulo');
    },
    volverASala: function () { Red.volverASala(); mundo = null; jug = null; prepararMotor(fondo); cambiar('sala'); },
    leidos: function () { if (!mundo) return {}; return mundo.modo === 'coop' ? Object.assign({}, mundo.archivo, jug.leidos) : jug.leidos; }
  };
  // Al volver de elegir personaje dentro de la sala, avisar a los demás
  const irOriginal = A.ir;
  A.ir = function (e) { if (e === 'sala' && estado === 'seleccion' && Red.sala) Red.actualizarYo({ personaje: S.personaje }); irOriginal(e); };

  // =====================================================
  // EVENTOS DE ENTRADA
  // =====================================================
  function procesarEntrada(eventos, clics) {
    const teclas = [];
    for (const ev of eventos) if (ev.indexOf('tecla:') === 0) teclas.push(ev.slice(6));
    if (eventos.some(function (e) { return e === 'clic' || e === 'toque' || e === 'clicLibre' || e === 'disparo' || e.indexOf('tecla:') === 0; })) {
      if (!audioListo) { audioListo = true; DM.Audio.iniciar(); musicaSegunEstado(); }
      else DM.Audio.reintentar();
    }
    S.tactil = tactil();
    for (const k of teclas) {
      if (k === 'KeyM') DM.Audio.alternar();
      if (k === 'KeyP') mostrarFps = !mostrarFps;
      if (k === 'KeyC') DM.raycaster.calidad = DM.raycaster.calidad === 'alta' ? 'media' : 'alta';
    }
    if (eventos.indexOf('boton:silencio') >= 0) DM.Audio.alternar();
    if (estado !== 'juego') {
      for (const c of clics) DM.UI.clic(c.x, c.y);
      for (const k of teclas) {
        if (DM.UI.tecla(k)) continue;
        if (k === 'Escape') {
          if (estado === 'pausa') A.continuar();
          else if (EN_JUEGO[estado]) cambiar('pausa');
          else if (estado !== 'titulo' && estado !== 'sala') cambiar('titulo');
        }
      }
      if (estado === 'codigo') for (const k of teclas) {
        if (/^Digit\d$/.test(k) && S.digitos.length < 4) S.digitos += k.slice(5);
        if (k === 'Backspace') S.digitos = S.digitos.slice(0, -1);
      }
      if (estado === 'pausa' && eventos.indexOf('boton:pausa') >= 0 && tEstado > 0.2) A.continuar();
      return;
    }
    // En partida
    for (const ev of eventos) {
      if (ev === 'perdioBloqueo' || ev === 'tecla:Escape' || ev === 'boton:pausa') { cambiar('pausa'); return; }
      if (ev === 'tecla:KeyE' || ev === 'boton:usar') {
        if (DM.HUD.lectura) DM.HUD.lectura = null; else toques.usarToque = true;
      }
      if (/^tecla:Digit[1-4]$/.test(ev)) toques.arma = +ev.slice(-1);
      if (ev === 'rueda:1' || ev === 'boton:arma') toques.arma = 5;
      if (ev === 'rueda:-1') toques.arma = 6;
      if (ev === 'tecla:KeyG' || ev === 'lanzar' || ev === 'boton:lanzar') toques.lanzar = true;
      if (ev === 'tecla:KeyX' || ev === 'boton:lanzsel') toques.cambiaLanzable = true;
      if (ev === 'tecla:KeyQ' || ev === 'boton:mapa') DM.MapaUI.abierto = !DM.MapaUI.abierto;
      if (ev === 'tecla:KeyR') toques.recargar = true;
      if (ev === 'boton:tab') DM.HUD.tablero = !DM.HUD.tablero;
    }
  }

  // ---------- Comando de este paso ----------
  function comando(entrada) {
    const c = {
      avance: entrada.avance, lateral: entrada.lateral, correr: entrada.correr,
      ang: vista.ang, pitch: vista.pitch, disparo: entrada.disparo && estado === 'juego',
      usar: !!(E.teclas.KeyE || E.mantenidos.usar) && !DM.HUD.lectura,
      usarToque: toques.usarToque, lanzar: toques.lanzar, arma: toques.arma, recargar: toques.recargar, cambiaLanzable: toques.cambiaLanzable,
      tactil: E.tactil, tolerancia: E.tactil ? C.ANGULO_APUNTAR_TACTIL : C.ANGULO_APUNTAR
    };
    if (estado !== 'juego') { c.avance = c.lateral = 0; c.disparo = c.usar = false; }
    toques.usarToque = toques.lanzar = toques.recargar = toques.cambiaLanzable = false; toques.arma = 0;
    return c;
  }

  // =====================================================
  // ACTUALIZACIÓN
  // =====================================================
  function actualizar(dt, entrada) {
    if (!EN_JUEGO[estado] && estado !== 'resultados') {
      camFondo.ang += dt * 0.12;
      fondo.tiempo += dt;
      DM.Trampas.estados(fondo);
      DM.luces.actualizar(fondo.tiempo);
      return;
    }
    if (!mundo) return;
    // Mirada inmediata (no espera a la simulación)
    if (estado === 'juego') {
      vista.ang += entrada.giro * S.sens;
      vista.pitch = Math.max(-1, Math.min(1, vista.pitch + entrada.pitch * S.sens * (S.invertir ? -1 : 1)));
    }
    DM.HUD.tablero = estado === 'juego' && (!!E.teclas.Tab || (DM.HUD.tablero && E.tactil));
    const pausado = !S.enRed && estado !== 'juego';
    let eventos = [];
    if (Red.rol === 'cliente') {
      // Cliente: predice su movimiento y envía los comandos
      acum += dt;
      let pasos = 0;
      while (acum >= C.PASO_SIM && pasos < 5) { Red.cmdCliente(comando(entrada), mundo, jug); acum -= C.PASO_SIM; pasos++; }
      if (pasos >= 5) acum = 0;
      eventos = Red.aplicarCliente(mundo, jug);
      DM.Trampas.estados(mundo);
      Red.enviarComandos();
      if (Red.sinNoticias()) DM.HUD.mostrar('SIN SENAL DEL ANFITRION...', 0.5);
    } else if (!pausado) {
      acum += dt;
      let pasos = 0;
      while (acum >= C.PASO_SIM && pasos < 5) {
        const cmds = { h: comando(entrada) };
        if (Red.rol === 'anfitrion') Red.comandosClientes(cmds);
        mundo.paso(C.PASO_SIM, cmds);
        acum -= C.PASO_SIM; pasos++;
      }
      if (pasos >= 5) acum = 0;
      eventos = mundo.sacarEventos();
      Red.eventosParaRed(eventos);
      Red.pasoAnfitrion(dt, mundo);
    }
    // Eventos → interfaz, efectos y sonido
    for (const ev of eventos) if (ev.t === 'piso' && ev.id === jug.id && ev.ang !== null && ev.ang !== undefined) vista.ang = ev.ang;
    DM.HUD.procesar(eventos, jug, mundo);
    DM.Escena.procesar(eventos, jug);
    sonidos(eventos);
    for (const ev of eventos) {
      if (ev.t === 'fin' && tFin < 0) tFin = 2.5;
      if (ev.t === 'oleada' || ev.t === 'fase') musicaSegunEstado();
    }
    if (tFin >= 0) { tFin -= dt; if (tFin < 0) terminarPartida(); }
    DM.Escena.paso(dt);
    DM.luces.actualizar(mundo.tiempo);
    aviso = mundo.cliente ? alFrenteCliente() : mundo.alFrente(jug, E.tactil ? C.ANGULO_APUNTAR_TACTIL : C.ANGULO_APUNTAR);
    ambiente(dt);
  }
  // En el cliente, el aviso [E] se calcula con su copia del mapa
  function alFrenteCliente() { try { return mundo.alFrente(jug, E.tactil ? C.ANGULO_APUNTAR_TACTIL : C.ANGULO_APUNTAR); } catch (err) { return null; } }

  function terminarPartida() {
    const st = mundo.estadoRed || mundo.reglas.estado();
    const lista = Object.keys(mundo.jugadores).map(function (k) { return mundo.jugadores[k]; });
    lista.sort(function (a, b) { return mundo.modo === 'versus' ? (b.puntos - a.puntos) : (b.bajas - a.bajas); });
    const g = st.ganador;
    if (st.modo === 'campana' && st.fin === 'victoria') DM.Progreso.marcar(st.nivel);
    S.resultado = {
      modo: st.modo, resultado: st.fin, oleada: st.oleada, total: st.total, equipos: st.equipos, ganador: g, puntosEquipo: st.puntosEquipo,
      nivel: st.nivel, fase: st.fase, fases: st.fases,
      nombreGanador: !st.equipos && g && mundo.jugadores[g] ? mundo.jugadores[g].nombre : null,
      tabla: lista.map(function (j) { return { nombre: j.nombre, personaje: j.personaje, bajas: j.bajas, muertes: j.muertes, puntos: j.puntos, equipo: mundo.modo === 'versus' && mundo.conf.modo === 'equipos' ? j.equipo : null, yo: j === jug }; })
    };
    const gane = st.modo === 'coop' || st.modo === 'campana' ? st.fin === 'victoria' : (st.equipos ? g === jug.equipo : g === jug.id);
    DM.Audio.sfx(gane ? 'victoria' : 'derrota');
    DM.Audio.musica(null);
    cambiar('resultados');
  }

  // ---------- Sonidos a partir de los eventos ----------
  function sonidos(eventos) {
    const Au = DM.Audio;
    Au.oyente.x = jug.x; Au.oyente.y = jug.y; Au.oyente.ang = vista.ang; Au.oyente.piso = jug.piso;
    for (const e of eventos) {
      const yo = e.id === jug.id;
      const pos = e.x !== undefined ? e : (mundo.jugadores[e.id] || null);
      switch (e.t) {
        case 'disparo': Au.sfx((DM.ARMAS[e.arma] || {}).sonido || 'golpe', yo ? null : e, yo ? 0.9 : 1); break;
        case 'puerta': Au.sfx('puerta', e, 0.8); break;
        case 'explosion': Au.sfx(e.estilo === 'frio' ? 'siseo' : 'explosion', e); break;
        case 'herido': if (yo) Au.sfx('herido'); break;
        case 'muerte': Au.sfx('muerte', yo ? null : pos); break;
        case 'mordisco': Au.sfx('mordisco', e); break;
        case 'recoger': if (yo) Au.sfx(e.premio ? 'premio' : 'recoger'); break;
        case 'recarga': if (yo) Au.sfx('recarga'); break;
        case 'recargado': if (yo) Au.sfx('recargado'); break;
        case 'cambioArma': if (yo) Au.sfx('cambioArma'); break;
        case 'carga': Au.sfx('carga', yo ? null : pos); break;
        case 'cargaDron': Au.sfx('cargaDron', e); break;
        case 'disparoGuardian': Au.sfx('disparoGuardian', e); break;
        case 'lanzar': Au.sfx('lanzar', yo ? null : pos); break;
        case 'rebote': Au.sfx('rebote', e, 0.6); break;
        case 'emp': Au.sfx('emp', e); break;
        case 'zap': Au.sfx('zap', e); break;
        case 'aplastar': Au.sfx('golpeMetal', e); break;
        case 'interruptor': Au.sfx('interruptor'); break;
        case 'consola': Au.sfx(e.on ? 'premio' : 'interruptor'); break;
        case 'fase': Au.sfx('oleada'); break;
        case 'anuncio': Au.sfx(e.premio ? 'premio' : 'anuncio'); break;
        case 'oleada': Au.sfx('oleada'); break;
        case 'revivido': Au.sfx('revivir'); break;
        case 'leer': if (yo) Au.sfx('leer'); break;
        case 'bloqueo': Au.sfx('bloqueo', yo ? null : pos); break;
        case 'traza': if (e.arma === 'dronLaser') { const s = e.tramos[0]; if (s) Au.sfx('laser', { piso: s[0], x: s[1], y: s[2] }, 0.7); } break;
        case 'muereEnemigo': Au.sfx(e.tipo === 'dron' || e.tipo === 'guardian' ? 'explosion' : 'gemido', e, 0.7); break;
        case 'barril': break;
      }
    }
  }

  // Pasos, gemidos de zombis, zumbido de drones y avisos de trampas
  function ambiente(dt) {
    if (jug.estado === 'vivo' && jug.andar > 0.1) {
      tPaso -= dt * (2 + jug.andar * 4);
      if (tPaso <= 0) {
        tPaso = 1;
        const p = mundo.mapa.pisos[jug.piso];
        const s = p.suelo[p.indice(Math.floor(jug.x), Math.floor(jug.y))];
        DM.Audio.sfx(s === DM.SUELO.PLASMA ? 'pasoCharco' : 'paso', null, 0.5);
      }
    }
    tAmbiente -= dt;
    if (tAmbiente <= 0) {
      tAmbiente = 1.2 + Math.random() * 1.5;
      let cerca = null, md = 12;
      for (const e of mundo.enemigos) { if (e.muerto) continue; const d = Math.hypot(e.x - jug.x, e.y - jug.y) + (e.piso !== jug.piso ? 6 : 0); if (d < md) { md = d; cerca = e; } }
      if (cerca) DM.Audio.sfx(cerca.tipo === 'dron' ? 'zumbido' : cerca.tipo === 'guardian' ? 'hidraulica' : 'gemido', cerca, 0.7);
    }
    // Avisos de trampas cercanas al pasar a la fase de aviso
    for (const t of mundo.trampas) {
      const antes = fasesTrampa[t.k];
      fasesTrampa[t.k] = t.fase;
      if (antes === 0 && t.fase === 1 && t.piso === jug.piso && Math.hypot(t.x + 0.5 - jug.x, t.y + 0.5 - jug.y) < 6) {
        DM.Audio.sfx(t.car === 'g' ? 'siseo' : t.car === 'k' ? 'hidraulica' : t.car === 'f' ? 'aviso' : 'zumbido', { piso: t.piso, x: t.x + 0.5, y: t.y + 0.5 }, 0.6);
      }
    }
  }

  // =====================================================
  // DIBUJO
  // =====================================================
  function camara() {
    const corr = Red.rol === 'cliente' ? Red.correccionVisual(1 / 60) : { x: 0, y: 0 };
    const tm = DM.Escena.estado.temblor;
    return {
      x: jug.x + corr.x + (Math.random() - 0.5) * tm * 0.06, y: jug.y + corr.y + (Math.random() - 0.5) * tm * 0.06, piso: jug.piso,
      ang: vista.ang + (Math.random() - 0.5) * tm * 0.03, pitch: vista.pitch + (Math.random() - 0.5) * tm * 0.08, camZ: jug.camZ
    };
  }

  function dibujar(dt) {
    const t = tactil();
    S.tactil = t;
    if (EN_JUEGO[estado] || estado === 'resultados') {
      if (!mundo) return;
      const cam = camara();
      DM.texturas.actualizar(mundo.tiempo, DM.luces.fases);
      DM.raycaster.actualizarDinamico(mundo);
      DM.raycaster.render(cam, mundo, DM.Escena.sprites(mundo, jug, mundo.tiempo));
      DM.Escena.dibujarRayos(ctx, cam, mundo, jug, mundo.tiempo);
      if (estado !== 'resultados') {
        DM.ArmaFP.dibujar(ctx, jug, mundo.tiempo);
        DM.HUD.vista(ctx, jug, mundo, cam, estado === 'juego' ? aviso : null, t, dt, mundo.tiempo);
        if (DM.MapaUI.abierto && estado === 'juego') DM.MapaUI.dibujar(ctx, mundo, jug, mundo.tiempo);
      }
      DM.HUD.barra(ctx, jug, mundo, mundo.tiempo);
      if (estado === 'juego' && !t && !E.bloqueado && !E.modoArrastre) DM.Texto.textoConCaja(ctx, 'CLIC PARA CAPTURAR EL MOUSE', C.ANCHO / 2, 150, PAL.amarilloClaro, PAL.amarillo);
      if (estado !== 'juego') DM.Pantallas[estado](ctx, tiempo, S, A);
    } else {
      if (motorDe !== fondo) prepararMotor(fondo);
      DM.texturas.actualizar(fondo.tiempo, DM.luces.fases);
      DM.raycaster.actualizarDinamico(fondo);
      DM.raycaster.render(camFondo, fondo, DM.Escena.sprites(fondo, { x: camFondo.x, y: camFondo.y, piso: 0, personaje: '' }, fondo.tiempo));
      ctx.fillStyle = '#07060d'; ctx.fillRect(0, C.VISTA_ALTO, C.ANCHO, C.HUD_ALTO);
      DM.Pantallas[estado](ctx, tiempo, S, A);
    }
  }

  // =====================================================
  // BUCLE
  // =====================================================
  function cuadro(dt) {
    tiempo += dt; tEstado += dt;
    procesarEntrada(E.sacarEventos(), E.sacarClics());
    actualizar(dt, E.leer(dt));
    dibujar(dt);
    cuadros++; acumFps += dt;
    if (acumFps >= 0.5) { fps = Math.round(cuadros / acumFps); cuadros = 0; acumFps = 0; }
    if (mostrarFps) DM.Texto.texto(ctx, fps + ' FPS', 4, 4, PAL.verde);
    vigilarRendimiento(dt);
  }
  function bucle(ahora) {
    let dt = Math.max(0, (ahora - ultimo) / 1000);
    ultimo = ahora;
    if (dt > 0.1) dt = 0.1;
    cuadro(dt);
    requestAnimationFrame(bucle);
  }

  // Calidad automática: si en 3 s de juego el promedio baja de ~45 fps, el piso y el
  // techo pasan a calcularse cada 2 píxeles (tecla C para cambiar a mano).
  let medT = 0, medN = 0;
  function vigilarRendimiento(dt) {
    if (estado !== 'juego' || DM.raycaster.calidad !== 'alta') return;
    medT += dt; medN++;
    if (medT >= 3) { if (medN / medT < 45) { DM.raycaster.calidad = 'media'; DM.HUD.mostrar('CALIDAD MEDIA PARA GANAR FPS (TECLA C)', 3); } medT = 0; medN = 0; }
  }

  // Si la pestaña del anfitrión queda oculta, el navegador frena requestAnimationFrame:
  // este latido mantiene viva la simulación y la red para los demás jugadores.
  setInterval(function () {
    if (!document.hidden || Red.rol !== 'anfitrion' || !mundo) return;
    const ahora = performance.now();
    let dt = (ahora - ultimo) / 1000; ultimo = ahora;
    if (dt > 0.1) dt = 0.1;
    procesarEntrada(E.sacarEventos(), E.sacarClics());
    actualizar(dt, { avance: 0, lateral: 0, giro: 0, pitch: 0, correr: false, disparo: false });
  }, 50);

  // Acceso para depurar desde la consola del navegador (F12)
  DM.juego = {
    get mundo() { return mundo; }, get jugador() { return jug; }, vista: vista, S: S, A: A,
    get estado() { return estado; },
    ir: function (piso, x, y, ang) { jug.piso = piso; jug.x = x; jug.y = y; if (ang !== undefined) vista.ang = ang; },
    mirar: function (p) { vista.pitch = p; },
    cuadro: cuadro
  };

  // El audio se activa DENTRO del clic, toque o tecla (algunos navegadores lo exigen)
  function gestoAudio() { DM.Audio.iniciar(); DM.Audio.desbloquear(); DM.Audio.reintentar(); }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (t) { window.addEventListener(t, gestoAudio, true); });
  window.addEventListener('beforeunload', function () { if (Red.rol) Red.salir(); });
  requestAnimationFrame(bucle);
})();
