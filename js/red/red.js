// =====================================================
// Multijugador: sala de espera y sincronización de la partida
//
// ANFITRIÓN AUTORITATIVO: los clientes envían solo sus comandos (con número de
// secuencia); el anfitrión simula todo (jugadores, IA, proyectiles, objetos) y
// envía instantáneas ~20 veces por segundo.
// CLIENTES: predicen su propio movimiento (y lo corrigen suave cuando llega la
// instantánea), e interpolan a los demás con ~100 ms de búfer.
// COMPENSACIÓN DE RETRASO: el anfitrión "rebobina" las posiciones según la latencia
// de quien disparó (máximo 150 ms) para evaluar el disparo como lo vio esa persona.
// Si un cliente se va, desaparece sin cortar la partida. Si se va el anfitrión,
// la partida termina con un aviso claro.
// =====================================================
(function () {
  'use strict';
  const C = DM.config, CR = DM.configRed, I = DM.Instantanea;

  const R = {
    rol: null,            // 'anfitrion' | 'cliente' | null
    codigo: '',
    miId: null,
    sala: null,           // { codigo, jugadores: [...], modo, mapa, versus, coop }
    enPartida: false,
    estado: '',           // texto para la interfaz ("CONECTANDO...")
    error: '',
    ping: 0,
    al: {}                // callbacks: sala, inicio, desconectado, fin
  };
  let tr = null;          // transporte
  // Anfitrión
  const colas = {};       // idCliente → comandos pendientes
  const ultimoCmd = {};
  const antes = {};       // idCliente → lo último enviado (para mandar solo cambios)
  const ultimaVez = {};   // idCliente → cuándo llegó su último mensaje
  let eventosRed = [];
  let tInstantanea = 0, tPing = 0;
  // Cliente
  const buffer = [];      // instantáneas recibidas { tm, llegada, m }
  let desfase = null;     // tiempo del anfitrión − reloj local
  const pendientes = [];  // comandos aún no confirmados
  let seq = 0;
  let eventosCliente = [];
  let correccion = { x: 0, y: 0 };
  let tUltimaInstantanea = 0;

  function transporte() { return CR.transporte === 'local' || !DM.Transporte.peer.disponible() ? DM.Transporte.local : DM.Transporte.peer; }
  function ahora() { return performance.now() / 1000; }

  // =====================================================
  // SALA DE ESPERA
  // =====================================================
  function difundirSala() { if (R.rol === 'anfitrion') { R.sala.mapa = mapaDeSala(R.sala); tr.difundir({ t: 'sala', s: R.sala }); if (R.al.sala) R.al.sala(); } }

  R.crear = function (personaje) {
    R.salir();
    R.rol = 'anfitrion'; R.miId = 'h'; R.error = ''; R.estado = 'CREANDO SALA...';
    R.codigo = String(1000 + Math.floor(Math.random() * 9000));
    R.sala = {
      codigo: R.codigo, modo: 'campana', nivel: DM.Progreso.pendiente(), mapa: 'sector4',
      versus: cargarConfigVersus(), coop: DM.Partida.coopBase(),
      jugadores: [{ id: 'h', puesto: 0, personaje: personaje, listo: true, equipo: 0, anfitrion: true }]
    };
    R.sala.mapa = mapaDeSala(R.sala);
    tr = transporte().anfitrion(CR.PREFIJO + R.codigo, {
      listo: function () { R.estado = ''; if (R.al.sala) R.al.sala(); },
      conexion: function (cid) {
        if (R.enPartida || R.sala.jugadores.length >= CR.MAX_JUGADORES) {
          tr.enviar(cid, { t: 'rechazo', motivo: R.enPartida ? 'LA PARTIDA YA EMPEZO' : 'LA SALA ESTA LLENA' });
          setTimeout(function () { tr.cerrar(cid); }, 300);
          return;
        }
        const usados = R.sala.jugadores.map(function (j) { return j.puesto; });
        let puesto = 0; while (usados.indexOf(puesto) >= 0) puesto++;
        R.sala.jugadores.push({ id: cid, puesto: puesto, personaje: 'pirulo', listo: false, equipo: puesto % 2 });
        colas[cid] = []; antes[cid] = {};
        tr.enviar(cid, { t: 'bienvenida', id: cid, puesto: puesto });
        difundirSala();
      },
      mensaje: function (cid, m) { mensajeAnfitrion(cid, m); },
      desconexion: function (cid) { quitarCliente(cid); },
      error: function (tipo) {
        R.error = tipo === 'unavailable-id' ? 'ESE CODIGO ESTA OCUPADO: PRUEBA OTRA VEZ' : tipo === 'network' || tipo === 'server-error' ? 'SIN CONEXION AL SERVIDOR DE SALAS' : 'ERROR DE RED: ' + String(tipo).toUpperCase();
        if (R.al.sala) R.al.sala();
      }
    });
  };

  // Un cliente se fue (o dejó de responder): desaparece sin cortar la partida
  function quitarCliente(cid) {
        if (!R.sala) return;
        const j = R.sala.jugadores.find(function (x) { return x.id === cid; });
        if (!j) return;
        R.sala.jugadores = R.sala.jugadores.filter(function (x) { return x.id !== cid; });
        delete colas[cid]; delete antes[cid]; delete ultimoCmd[cid]; delete ultimaVez[cid];
        if (R.enPartida && R.mundo) {
          const pj = R.mundo.jugadores[cid];
          if (pj) R.mundo.evento({ t: 'anuncio', texto: pj.nombre + ' SE DESCONECTO', color: 'gris' });
          R.mundo.quitarJugador(cid);
        } else if (j && R.al.aviso) R.al.aviso('UN JUGADOR SALIO DE LA SALA');
        difundirSala();
        if (tr) tr.cerrar(cid);
  }

  R.unirse = function (codigo, personaje) {
    R.salir();
    R.rol = 'cliente'; R.codigo = codigo; R.error = ''; R.estado = 'CONECTANDO...';
    const limite = setTimeout(function () { if (R.estado === 'CONECTANDO...') { R.error = 'NO SE ENCONTRO LA SALA ' + codigo; R.estado = ''; if (R.al.sala) R.al.sala(); } }, CR.TIEMPO_CONEXION * 1000);
    tr = transporte().cliente(CR.PREFIJO + codigo, {
      listo: function () { clearTimeout(limite); R.estado = ''; tr.enviar({ t: 'yo', personaje: personaje, listo: false }); },
      mensaje: function (m) { mensajeCliente(m); },
      desconexion: function () {
        const motivo = R.enPartida ? 'EL ANFITRION SALIO: LA PARTIDA TERMINO' : 'SE CERRO LA SALA';
        R.salir();
        if (R.al.desconectado) R.al.desconectado(motivo);
      },
      error: function (tipo) {
        clearTimeout(limite);
        R.error = tipo === 'peer-unavailable' ? 'NO EXISTE LA SALA ' + codigo : 'ERROR DE RED: ' + String(tipo).toUpperCase();
        R.estado = '';
        if (R.al.sala) R.al.sala();
      }
    });
  };

  R.salir = function () {
    if (tr) { try { if (R.rol === 'cliente') tr.enviar({ t: 'adios' }); tr.cerrar(); } catch (err) { /* nada */ } }
    tr = null; R.rol = null; R.sala = null; R.enPartida = false; R.mundo = null; R.miId = null;
    for (const k in colas) delete colas[k];
    buffer.length = 0; pendientes.length = 0; desfase = null; eventosRed = []; eventosCliente = [];
  };

  // Cambios de uno mismo en la sala (personaje, listo, equipo)
  R.actualizarYo = function (cambios) {
    if (!R.sala) return;
    const yo = R.sala.jugadores.find(function (j) { return j.id === R.miId; });
    if (yo) Object.assign(yo, cambios);
    if (R.rol === 'anfitrion') difundirSala();
    else if (tr) tr.enviar(Object.assign({ t: 'yo' }, cambios));
  };
  // El anfitrión cambia la configuración: los demás la ven en vivo
  R.configurar = function (fn) {
    if (R.rol !== 'anfitrion') return;
    fn(R.sala);
    R.sala.mapa = mapaDeSala(R.sala);
    guardarConfigVersus(R.sala.versus);
    difundirSala();
  };
  // Modos de la sala: 'campana' (sector elegido), 'coop' (oleadas del sector 1) y 'versus'
  function mapaDeSala(s) {
    if (s.modo === 'campana') return (DM.CAMPANA_POR_ID[s.nivel] || DM.CAMPANA[0]).mapa;
    if (s.modo === 'coop') return 'sector4';
    return DM.Partida.arenaVersus(s.versus && s.versus.arena, s.jugadores ? s.jugadores.length : 1);
  }
  R.todosListos = function () { return R.sala && R.sala.jugadores.every(function (j) { return j.listo; }); };

  function cargarConfigVersus() {
    const base = DM.Partida.versusBase();
    try { const g = JSON.parse(localStorage.getItem(C.CLAVE_CONFIG_VERSUS) || 'null'); if (g) return Object.assign(base, g); } catch (err) { /* nada */ }
    return base;
  }
  function guardarConfigVersus(c) { try { localStorage.setItem(C.CLAVE_CONFIG_VERSUS, JSON.stringify(c)); } catch (err) { /* nada */ } }
  R.cargarConfigVersus = cargarConfigVersus;

  function mensajeAnfitrion(cid, m) {
    if (!m || !R.sala) return;
    const j = R.sala.jugadores.find(function (x) { return x.id === cid; });
    ultimaVez[cid] = ahora();
    switch (m.t) {
      case 'yo':
        if (!j) return;
        if (m.personaje && DM.PERSONAJES[m.personaje]) j.personaje = m.personaje;
        if (m.listo !== undefined) j.listo = !!m.listo;
        if (m.equipo === 0 || m.equipo === 1) j.equipo = m.equipo;
        difundirSala();
        break;
      case 'c': {
        const q = colas[cid];
        if (!q) return;
        for (const a of m.c) q.push(I.expandirCmd(a));
        // Si se acumulan demasiados (el cliente se atrasó), se descartan uniendo los toques
        while (q.length > 8) { const viejo = q.shift(); I.unirToques(viejo, q[0]); }
        break;
      }
      case 'pong': {
        const rtt = ahora() - m.ts;
        if (j) j.ping = Math.round(rtt * 1000);
        if (R.mundo && R.mundo.jugadores[cid]) R.mundo.jugadores[cid].rebobinar = Math.min(C.REBOBINADO_MAX, rtt / 2 + CR.RETRASO_INTERP);
        break;
      }
      case 'adios': break;
    }
  }

  // Inicio de partida (anfitrión)
  R.iniciarPartida = function () {
    if (R.rol !== 'anfitrion') return null;
    const s = R.sala;
    const datos = {
      t: 'inicio', modo: s.modo === 'versus' ? 'versus' : 'coop', mapa: mapaDeSala(s), semilla: (Math.random() * 1e9) | 0,
      nivel: s.modo === 'campana' ? s.nivel : null,
      conf: DM.Partida.copiar(s.modo === 'versus' ? s.versus : s.coop),
      jugadores: s.jugadores.map(function (j) { return { id: j.id, puesto: j.puesto, personaje: j.personaje, equipo: j.equipo }; })
    };
    R.enPartida = true;
    tr.difundir(datos);
    return datos;
  };
  R.volverASala = function () {
    if (R.rol !== 'anfitrion') return;
    R.enPartida = false; R.mundo = null;
    for (const j of R.sala.jugadores) j.listo = j.id === 'h';
    tr.difundir({ t: 'aSala' });
    difundirSala();
  };

  // ---------- Partida: anfitrión ----------
  // Comandos de los clientes para un paso de simulación
  R.comandosClientes = function (cmds) {
    for (const cid in colas) {
      const q = colas[cid];
      let c = q.length ? q.shift() : null;
      if (!c && ultimoCmd[cid]) { c = Object.assign({}, ultimoCmd[cid], { usarToque: false, lanzar: false, recargar: false, cambiaLanzable: false, arma: 0 }); }
      if (c) { cmds[cid] = c; ultimoCmd[cid] = c; }
    }
    return cmds;
  };
  R.eventosParaRed = function (lista) { if (R.rol === 'anfitrion' && R.enPartida) for (const e of lista) eventosRed.push(e); };
  R.pasoAnfitrion = function (dt, mundo) {
    if (R.rol !== 'anfitrion' || !R.enPartida) return;
    R.mundo = mundo;
    tInstantanea -= dt; tPing -= dt;
    if (tPing <= 0) {
      tPing = 1; tr.difundir({ t: 'ping', ts: ahora() });
      // Quien no responde en 8 s se considera desconectado
      for (const cid in colas) if (ultimaVez[cid] && ahora() - ultimaVez[cid] > 8) quitarCliente(cid);
    }
    if (tInstantanea > 0) return;
    tInstantanea = 1 / CR.HZ;
    const ev = eventosRed; eventosRed = [];
    for (const cid in colas) tr.enviar(cid, I.armar(mundo, cid, antes[cid] || (antes[cid] = {}), ev));
  };

  // ---------- Partida: cliente ----------
  function mensajeCliente(m) {
    if (!m) return;
    switch (m.t) {
      case 'bienvenida': R.miId = m.id; break;
      case 'rechazo': R.error = m.motivo; if (R.al.sala) R.al.sala(); break;
      case 'sala': R.sala = m.s; if (R.al.sala) R.al.sala(); break;
      case 'inicio': R.enPartida = true; buffer.length = 0; pendientes.length = 0; desfase = null; if (R.al.inicio) R.al.inicio(m); break;
      case 'aSala': R.enPartida = false; if (R.al.aSala) R.al.aSala(); break;
      case 'ping': if (tr) tr.enviar({ t: 'pong', ts: m.ts }); break;
      case 'e': {
        const t = ahora();
        const d = m.tm - t;
        desfase = desfase === null ? d : Math.max(desfase - 0.002, Math.min(desfase + 0.05, d > desfase ? d : desfase * 0.95 + d * 0.05));
        buffer.push({ tm: m.tm, m: m, mapas: indexar(m) });
        if (buffer.length > 30) buffer.shift();
        for (const e of m.ev || []) eventosCliente.push(e);
        tUltimaInstantanea = t;
        break;
      }
    }
  }
  function indexar(m) {
    const j = {}, en = {}, pr = {};
    for (const a of m.j) j[a[0]] = a;
    for (const a of m.en) en[a[0]] = a;
    for (const a of m.pr) pr[a[0]] = a;
    return { j: j, en: en, pr: pr };
  }

  // Comandos del jugador local (cliente): se predicen y se envían
  R.cmdCliente = function (cmd, mundo, jug) {
    cmd.seq = ++seq;
    pendientes.push(cmd);
    if (pendientes.length > 120) pendientes.shift();
    jug.pasoMovimiento(C.PASO_SIM, cmd, mundo.mapa);
    R._porEnviar = R._porEnviar || [];
    R._porEnviar.push(I.comprimirCmd(cmd));
  };
  R.enviarComandos = function () {
    if (R.rol !== 'cliente' || !tr || !R._porEnviar || !R._porEnviar.length) return;
    tr.enviar({ t: 'c', c: R._porEnviar });
    R._porEnviar = [];
  };
  R.sinNoticias = function () { return R.rol === 'cliente' && R.enPartida && tUltimaInstantanea && ahora() - tUltimaInstantanea > 4; };

  // Aplica lo recibido al mundo del cliente. Devuelve los eventos nuevos.
  R.aplicarCliente = function (mundo, jug) {
    if (!buffer.length || desfase === null) return [];
    const tAnf = ahora() + desfase;
    mundo.tiempo = tAnf;
    const ult = buffer[buffer.length - 1];
    const m = ult.m;
    // --- Estado "lento" de la última instantánea ---
    if (m.ob) mundo.items = m.ob.map(function (a) { return { id: a[0], tipo: a[1], piso: a[2], x: a[3], y: a[4], activo: !!a[5], premio: !!a[6], parpadea: !!a[7] }; });
    if (m.pu) m.pu.forEach(function (v, k) { if (mundo.mapa.puertas[k]) mundo.mapa.puertas[k].apertura = v; });
    if (m.ba) mundo.barriles.forEach(function (b, k) {
      const muerto = m.ba[k] === '1';
      if (muerto && !b.muerto) { const p = mundo.mapa.pisos[b.piso]; p.bloqueo[p.indice(Math.floor(b.x), Math.floor(b.y))] = 0; }
      b.muerto = muerto;
    });
    m.sw.forEach(function (a, k) { const s = mundo.interruptores[k]; if (s) { s.mantenido = mundo.tiempo + a[0]; s.activoHasta = mundo.tiempo + a[1]; s.activador = a[2]; } });
    mundo.estadoRed = m.re;
    mundo.nubes = m.nu.map(function (a) { return { piso: a[0], x: a[1], y: a[2], radio: a[3] }; });
    mundo.torretas = m.to.map(function (a) { return { id: a[0], clase: 'torreta', piso: a[1], x: a[2], y: a[3], ang: a[4] }; });

    // --- Propio jugador: autoridad del anfitrión + reaplicar comandos pendientes ---
    const yo = ult.mapas.j[R.miId];
    if (yo && !ult.aplicado) {
      ult.aplicado = true;
      const px = jug.x, py = jug.y, pp = jug.piso;
      I.aplicarJugador(jug, yo);
      while (pendientes.length && pendientes[0].seq <= jug.seq) pendientes.shift();
      if (!jug.transicion && jug.estado === 'vivo') for (const c of pendientes) jug.pasoMovimiento(C.PASO_SIM, c, mundo.mapa);
      if (pp === jug.piso && Math.hypot(px - jug.x, py - jug.y) < 0.6) { correccion.x += px - jug.x; correccion.y += py - jug.y; }
      else { correccion.x = 0; correccion.y = 0; }
    }

    // --- Los demás: interpolación entre dos instantáneas ---
    const tR = tAnf - CR.RETRASO_INTERP;
    let s0 = buffer[0], s1 = ult;
    for (let k = buffer.length - 1; k > 0; k--) { if (buffer[k - 1].tm <= tR) { s0 = buffer[k - 1]; s1 = buffer[k]; break; } }
    const f = s1.tm > s0.tm ? Math.max(0, Math.min(1.2, (tR - s0.tm) / (s1.tm - s0.tm))) : 1;
    const lerp = function (a, b) { return a + (b - a) * f; };
    const lerpAng = function (a, b) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * f; };
    // Jugadores
    const vistos = {};
    for (const id in s1.mapas.j) {
      vistos[id] = true;
      if (id === R.miId) continue;
      const a1 = s1.mapas.j[id], a0 = s0.mapas.j[id] || a1;
      let j = mundo.jugadores[id];
      if (!j) { j = new DM.Jugador(id, a1[2], a1[1]); mundo.jugadores[id] = j; }
      I.aplicarJugador(j, a1);
      if (a0[4] === a1[4]) { j.x = lerp(a0[5], a1[5]); j.y = lerp(a0[6], a1[6]); j.ang = lerpAng(a0[7], a1[7]); }
    }
    for (const id in mundo.jugadores) if (!vistos[id] && id !== R.miId) delete mundo.jugadores[id];
    // Enemigos
    mundo.enemigos = [];
    for (const id in s1.mapas.en) {
      const a1 = s1.mapas.en[id], a0 = s0.mapas.en[id] || a1, d = DM.ENEMIGOS[a1[1]];
      mundo.enemigos.push({
        id: a1[0], clase: 'enemigo', tipo: a1[1], piso: a1[2], x: a0[2] === a1[2] ? lerp(a0[3], a1[3]) : a1[3], y: a0[2] === a1[2] ? lerp(a0[4], a1[4]) : a1[4], z: lerp(a0[5], a1[5]),
        ang: a1[6], anim: a1[7], cargaT: a1[8], apunta: a1[9] ? { x: a1[9][0], y: a1[9][1], z: a1[9][2] } : null, muerto: !!a1[10], tMuerto: a1[11],
        ef: { congelado: a1[12] }, vida: a1[13], vidaMax: a1[14], radio: d.radio, alto: d.alto
      });
    }
    // Proyectiles
    mundo.proyectiles = [];
    for (const id in s1.mapas.pr) {
      const a1 = s1.mapas.pr[id], a0 = s0.mapas.pr[id] || a1;
      const mismo = a0[3] === a1[3];
      mundo.proyectiles.push({ id: a1[0], lanzable: a1[2] ? a1[1] : null, bala: a1[2] ? null : a1[1], piso: a1[3], x: mismo ? lerp(a0[4], a1[4]) : a1[4], y: mismo ? lerp(a0[5], a1[5]) : a1[5], z: mismo ? lerp(a0[6], a1[6]) : a1[6], armada: a1[7], quieto: a1[8] });
    }
    const ev = eventosCliente; eventosCliente = [];
    // Eventos que cambian el mapa del cliente
    for (const e of ev) {
      if (e.t === 'rejilla') { const p = mundo.mapa.pisos[e.piso], i = p.indice(e.x, e.y); p.paredes[i] = 0; p.paredOriginal[i] = 0; }
      if (e.t === 'archivo') mundo.archivo[e.id] = true;
    }
    return ev;
  };
  // Corrección visual suave del propio jugador (se suma a la cámara y se desvanece)
  R.correccionVisual = function (dt) {
    const k = Math.max(0, 1 - dt * 10);
    correccion.x *= k; correccion.y *= k;
    return correccion;
  };

  DM.Red = R;
})();
