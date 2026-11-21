// =====================================================
// HUD tipo Doom (barra inferior de 480×36 con el retrato al centro)
//   VIDA (rojo) | ESCUDO (cian) | ARMAS 1-4 | RETRATO | MUNICION (amarillo) | BAJAS (blanco)
// Arriba: oleada (cooperativo) o marcador y tiempo (versus); a la derecha, registro de bajas.
// Centro: mira, aviso "[E] ..." en cian, barra de revivir, anuncios y mensajes.
// Pantalla: destello de daño con su dirección, tinte celeste del modo dios, veneno,
// frío, aturdido, caído/muerto, fundido entre pisos y HUD apagado por un EMP.
// =====================================================
(function () {
  'use strict';
  const C = DM.config, PAL = DM.paleta, TXT = DM.Texto;
  const A = C.ANCHO, H = C.ALTO, HB = C.HUD_ALTO, VH = C.VISTA_ALTO;

  const PANELES = {
    vida: { x: 4, w: 92, et: 'VIDA', col: PAL.rojo },
    escudo: { x: 100, w: 70, et: 'ESCUDO', col: PAL.cian },
    armas: { x: 174, w: 44, et: 'ARMAS', col: PAL.gris },
    municion: { x: 262, w: 92, et: 'MUNICION', col: PAL.amarillo },
    bajas: { x: 358, w: 118, et: 'BAJAS', col: PAL.blanco }
  };
  const RET_X = 222, RET_W = 36;
  const NOMBRE_LANZ = { granada: 'GRANADA', mina: 'MINA', bengala: 'BENGALA', emp: 'EMP', torreta: 'TORRETA' };

  let fondoBarra = null;
  function prepararFondo() {
    const c = document.createElement('canvas');
    c.width = A; c.height = HB;
    const g = c.getContext('2d');
    const R = function (x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); };
    R(0, 0, A, HB, '#1c1b28');
    for (let x = 0; x < A; x += 4) R(x, 2 + ((x >> 2) & 1), 2, 1, '#22212f');
    for (let y = 4; y < HB; y += 4) for (let x = (y & 4) ? 0 : 2; x < A; x += 4) R(x, y, 1, 1, '#24233a');
    R(0, 0, A, 2, PAL.magenta); R(0, 2, A, 1, PAL.magentaOsc); R(0, 3, A, 1, '#3a3a52'); R(0, HB - 1, A, 1, '#07060d');
    for (const k in PANELES) {
      const p = PANELES[k];
      R(p.x, 6, p.w, HB - 9, '#0b0a12'); R(p.x, 6, p.w, 1, '#07060d'); R(p.x, 6, 1, HB - 9, '#07060d');
      R(p.x, HB - 4, p.w, 1, '#3a3a52'); R(p.x + p.w - 1, 6, 1, HB - 9, '#2a2a3c');
      DM.fuente.dibujarCrudo(g, p.et, p.x + 4, 9, p.col, 1);
    }
    R(RET_X - 2, 3, RET_W + 4, HB - 3, '#2a2a3c'); R(RET_X - 1, 4, RET_W + 2, HB - 5, PAL.cianOsc); R(RET_X, 5, RET_W, HB - 7, '#06141a');
    [2, 98, 172, 220, 260, 356, 478].forEach(function (x) { R(x - 1, 8, 2, 2, PAL.remache); R(x - 1, HB - 7, 2, 2, PAL.remache); });
    fondoBarra = c;
  }

  const HUD = { mensaje: '', tiempoMsg: 0, t: 0, nombrePiso: '', tPiso: 0, feed: [], anuncios: [], tDanio: 0, dirDanio: null, tRecoger: 0, tablero: false, lectura: null, tLectura: 0 };

  HUD.mostrar = function (msg, segundos) { HUD.mensaje = msg; HUD.tiempoMsg = segundos || 3; };
  HUD.anunciarPiso = function (nombre) { HUD.nombrePiso = nombre; HUD.tPiso = 3.5; };
  HUD.anunciar = function (texto, color) { HUD.anuncios.push({ texto: texto, color: PAL[color] || PAL.blanco, t: 3.5 }); if (HUD.anuncios.length > 3) HUD.anuncios.shift(); };
  HUD.baja = function (texto) { HUD.feed.unshift({ texto: texto, t: 6 }); if (HUD.feed.length > 5) HUD.feed.pop(); };
  HUD.reiniciar = function () { HUD.feed = []; HUD.anuncios = []; HUD.tiempoMsg = 0; HUD.lectura = null; HUD.tDanio = 0; };

  // Eventos del mundo que le importan al HUD
  HUD.procesar = function (eventos, jug, mundo) {
    for (const e of eventos) {
      switch (e.t) {
        case 'herido': if (e.id === jug.id) { HUD.tDanio = 0.45; HUD.dirDanio = e.dx !== null ? Math.atan2(e.dy - jug.y, e.dx - jug.x) : null; } break;
        case 'recoger': if (e.id === jug.id) { HUD.tRecoger = 0.25; HUD.mostrar(nombreObjeto(e.tipo), 1.5); } break;
        case 'baja': HUD.baja(e.texto); break;
        case 'anuncio': HUD.anunciar(e.texto, e.color); break;
        case 'oleada': HUD.anunciar(e.final ? 'OLEADA FINAL: EL GUARDIAN DESPERTO' : e.ultima ? 'ULTIMA OLEADA' : 'OLEADA ' + e.n + ' DE ' + e.total, e.final ? 'rojo' : 'amarillo'); break;
        case 'sinMunicion': if (e.id === jug.id) HUD.mostrar('SIN MUNICION', 1.5); break;
        case 'revivido': HUD.anunciar((mundo.jugadores[e.id] || {}).nombre + ' VOLVIO A LA PELEA', 'verde'); break;
        case 'piso': if (e.id === jug.id) HUD.anunciarPiso(mundo.mapa.pisos[e.piso].nombre); break;
        case 'leer': if (e.quien === jug.id) { HUD.lectura = e.id; HUD.tLectura = 0; } break;
        case 'interruptor': if (e.on && mundo.modo === 'versus') HUD.anunciar('TRAMPAS ACTIVADAS POR ' + ((mundo.jugadores[e.id] || {}).nombre || '?'), 'magenta'); break;
      }
    }
  };
  function nombreObjeto(t) {
    if (t.indexOf('arma:') === 0) return DM.ARMAS[t.slice(5)].nombre;
    if (t.indexOf('lanz:') === 0) return '+1 ' + NOMBRE_LANZ[t.slice(5)];
    return (DM.OBJETOS[t] || {}).nombre || t;
  }

  function numero(ctx, p, valor, color) { TXT.texto(ctx, String(valor), p.x + p.w - 5, VH + 17, color, 2, 'der', true); }

  // Estado de las reglas (en red viene en la instantánea)
  function estadoReglas(mundo) { return mundo.estadoRed || mundo.reglas.estado(); }

  // ---------- Barra inferior ----------
  HUD.barra = function (ctx, jug, mundo, t) {
    if (!fondoBarra) prepararFondo();
    ctx.drawImage(fondoBarra, 0, VH);
    const P = PANELES;
    if (jug.ef.hud > 0) {
      // EMP: el HUD queda apagado unos segundos
      for (let k = 0; k < 400; k++) { ctx.fillStyle = Math.random() < 0.5 ? '#3a3a52' : '#0b0a12'; ctx.fillRect((Math.random() * A) | 0, VH + 4 + ((Math.random() * (HB - 6)) | 0), 3, 1); }
      TXT.texto(ctx, 'HUD SIN SENAL', A / 2, VH + 15, PAL.cian, 1, 'centro');
      return;
    }
    const vidaBaja = jug.vida <= 25 && Math.floor(t * 4) % 2;
    numero(ctx, P.vida, Math.max(0, Math.ceil(jug.vida)) + '%', vidaBaja ? '#ffd0d0' : PAL.rojo);
    numero(ctx, P.escudo, Math.ceil(jug.escudo), PAL.cian);
    // Munición del arma en la mano
    const id = jug.armaActual(), a = DM.ARMAS[id];
    let mun = '--';
    if (a.pesada && jug.pesada) mun = String(jug.pesada.municion);
    else if (a.cargador) mun = jug.recargando > 0 ? 'REC' : String(jug.cargador[id] === undefined ? a.cargador : jug.cargador[id]);
    if (mun === 'REC') TXT.texto(ctx, 'RECARGANDO', P.municion.x + P.municion.w - 5, VH + 21, PAL.amarilloClaro, 1, 'der');
    else numero(ctx, P.municion, mun, PAL.amarillo);
    // Lanzable elegido
    const n = jug.lanzables[jug.lanzSel] || 0;
    TXT.texto(ctx, (NOMBRE_LANZ[jug.lanzSel] || '') + ' ' + n, P.municion.x + 4, VH + 27, n ? PAL.amarilloClaro : PAL.grisOsc);
    // Bajas (en versus: puntos)
    numero(ctx, P.bajas, mundo.modo === 'versus' ? jug.puntos : jug.bajas, PAL.blanco);
    TXT.texto(ctx, jug.nombre, P.bajas.x + 4, VH + 17, PAL.grisOsc);
    TXT.texto(ctx, a.nombre.slice(0, 14), P.bajas.x + 4, VH + 26, PAL.gris);
    // Armas 1-4
    for (let k = 1; k <= 4; k++) {
      const x = P.armas.x + 5 + ((k - 1) % 2) * 18, y = VH + 17 + ((k - 1) >> 1) * 8;
      const tiene = k <= 3 || !!jug.pesada;
      TXT.texto(ctx, String(k), x, y, k === jug.arma ? PAL.amarilloClaro : tiene ? PAL.gris : PAL.grisOsc);
    }
    // Retrato: mira a los lados, parpadea y hace muecas al recibir daño
    const cuadros = DM.Retrato.cuadros(jug.personaje);
    ctx.drawImage(cuadros[DM.Retrato.elegir(t, HUD.tDanio > 0.15 || jug.vida < 25 && Math.floor(t) % 3 === 0)], RET_X + 1, VH + 1);
    if (jug.ef.dios > 0) { ctx.fillStyle = 'rgba(34,228,255,0.35)'; ctx.fillRect(RET_X, VH + 5, RET_W, HB - 7); }
  };

  // ---------- Sobre la vista 3D ----------
  HUD.vista = function (ctx, jug, mundo, cam, aviso, tactil, dt, t) {
    HUD.t += dt;
    const cx = A / 2, cy = VH / 2;
    const ef = jug.ef;
    // Tintes de pantalla
    if (ef.dios > 0) {
      ctx.fillStyle = 'rgba(120,220,255,0.16)'; ctx.fillRect(0, 0, A, VH);
      if (ef.dios < 3 && Math.floor(t * 4) % 2) TXT.textoConCaja(ctx, 'EL NUCLEO SE APAGA', cx, 40, PAL.cianClaro, PAL.cian);
    }
    if (ef.veneno > 0) { ctx.fillStyle = 'rgba(60,220,110,' + (0.08 + 0.05 * Math.sin(t * 6)).toFixed(3) + ')'; ctx.fillRect(0, 0, A, VH); }
    if (ef.congelado > 0 || ef.ralentizado > 0) { ctx.fillStyle = 'rgba(160,230,255,0.12)'; ctx.fillRect(0, 0, A, VH); }
    if ((ef.aturdido > 0 || ef.paralizado > 0) && Math.floor(t * 12) % 2) { ctx.fillStyle = 'rgba(230,227,255,0.12)'; ctx.fillRect(0, 0, A, VH); }
    if (HUD.tDanio > 0) {
      HUD.tDanio -= dt;
      ctx.fillStyle = 'rgba(255,40,40,' + (HUD.tDanio * 0.6).toFixed(3) + ')'; ctx.fillRect(0, 0, A, VH);
      if (HUD.dirDanio !== null) {
        // Marca roja en el borde por donde vino el daño
        let a = HUD.dirDanio - cam.ang; a = Math.atan2(Math.sin(a), Math.cos(a));
        const mx = cx + Math.sin(a) * 90, my = cy - Math.cos(a) * 70;
        ctx.fillStyle = PAL.rojo; ctx.globalAlpha = Math.min(1, HUD.tDanio * 3);
        ctx.fillRect(mx - 4, my - 4, 8, 8); ctx.globalAlpha = 1;
      }
    }
    if (HUD.tRecoger > 0) { HUD.tRecoger -= dt; ctx.fillStyle = 'rgba(232,185,35,' + (HUD.tRecoger * 0.6).toFixed(3) + ')'; ctx.fillRect(0, 0, A, VH); }

    // Etiquetas de compañeros (y aviso de caídos, visible a través de las paredes cercanas)
    for (const id in mundo.jugadores) {
      const o = mundo.jugadores[id];
      if (o === jug || o.estado === 'muerto' || o.piso !== cam.piso) continue;
      const amigo = mundo.modo === 'coop' || (mundo.conf.modo === 'equipos' && o.equipo === jug.equipo);
      if (!amigo) continue;
      const p = DM.Escena.proyectar(cam, o.piso, o.x, o.y, o.estado === 'caido' ? 0.4 : 1.05);
      if (!p || p.x < 0 || p.x > A || p.y < 0 || p.y > VH || p.d > 14) continue;
      const col = mundo.modo === 'coop' ? PAL.verde : DM.EQUIPOS[o.equipo].claro;
      if (o.estado === 'caido') TXT.textoConCaja(ctx, '! ' + o.nombre + ' CAIDO', p.x, p.y - 8, PAL.rojo, PAL.rojo);
      else if (p.d < DM.raycaster.zbuf[Math.max(0, Math.min(A - 1, p.x | 0))] + 0.3) TXT.texto(ctx, o.nombre, p.x, p.y - 7, col, 1, 'centro');
    }

    // Mira
    ctx.fillStyle = PAL.cian; ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.fillStyle = 'rgba(34,228,255,0.45)';
    ctx.fillRect(cx - 6, cy - 1, 3, 2); ctx.fillRect(cx + 3, cy - 1, 3, 2); ctx.fillRect(cx - 1, cy - 6, 2, 3); ctx.fillRect(cx - 1, cy + 3, 2, 3);

    // Aviso [E] y barra de revivir
    if (aviso && jug.estado === 'vivo' && !HUD.lectura) {
      TXT.textoConCaja(ctx, (tactil ? 'USAR: ' : '[E] ') + aviso.texto, cx, cy + 22, PAL.cianClaro, PAL.cian);
      if (aviso.accion === 'revivir' || (aviso.accion === 'consola' && aviso.progreso > 0 && aviso.progreso < 1)) {
        ctx.fillStyle = '#16151f'; ctx.fillRect(cx - 40, cy + 34, 80, 4);
        ctx.fillStyle = PAL.verde; ctx.fillRect(cx - 40, cy + 34, Math.round(80 * (aviso.progreso || 0)), 4);
      }
    }
    // Información de la partida (arriba al centro)
    const st = estadoReglas(mundo);
    if (st) {
      let txt = '';
      if (st.modo === 'campana') {
        txt = campanaTexto(st, mundo);
      } else if (st.modo === 'coop') {
        txt = st.oleada ? 'OLEADA ' + st.oleada + '/' + st.total + '   QUEDAN ' + st.quedan : 'PREPARENSE';
        if (st.pausa !== null && st.pausa !== undefined && st.pausa > 0) txt = 'SIGUIENTE OLEADA EN ' + Math.ceil(st.pausa);
        txt += '   REIMPRESIONES ' + st.vidas;
      } else {
        const reloj = st.restante >= 0 ? Math.floor(st.restante / 60) + ':' + ('0' + Math.floor(st.restante % 60)).slice(-2) : '';
        if (st.equipos) txt = 'CIAN ' + st.puntosEquipo[0] + ' - ' + st.puntosEquipo[1] + ' AMARILLO';
        else {
          let lider = null;
          for (const id in mundo.jugadores) { const o = mundo.jugadores[id]; if (!lider || o.puntos > lider.puntos) lider = o; }
          txt = 'TU ' + jug.puntos + '   LIDER ' + (lider ? lider.puntos + ' ' + lider.nombre : '-');
        }
        if (st.meta) txt += '   META ' + st.meta;
        if (reloj) txt += '   ' + reloj;
        if (st.subita) txt = 'MUERTE SUBITA   ' + txt;
      }
      ctx.fillStyle = 'rgba(7,6,13,0.6)'; const w = DM.fuente.ancho(txt) + 10; ctx.fillRect(cx - w / 2, 2, w, 10);
      TXT.texto(ctx, txt, cx, 4, st.subita ? PAL.magenta : PAL.blanco, 1, 'centro');
      if (st.modo === 'campana') campanaVista(ctx, st, mundo, jug, cam, t);
    }
    // Registro de bajas (arriba a la derecha)
    let y = 16;
    for (let i = HUD.feed.length - 1; i >= 0; i--) { HUD.feed[i].t -= dt; if (HUD.feed[i].t <= 0) HUD.feed.splice(i, 1); }
    for (const b of HUD.feed) { TXT.texto(ctx, b.texto, A - 6, y, PAL.blanco, 1, 'der'); y += 8; }
    // Anuncios (premios, oleadas)
    let ya = 52;
    for (let i = HUD.anuncios.length - 1; i >= 0; i--) { HUD.anuncios[i].t -= dt; if (HUD.anuncios[i].t <= 0) HUD.anuncios.splice(i, 1); }
    for (const an of HUD.anuncios) { TXT.textoConCaja(ctx, an.texto, cx, ya, an.color, an.color); ya += 13; }
    if (HUD.tPiso > 0) { HUD.tPiso -= dt; ctx.globalAlpha = Math.min(1, HUD.tPiso); TXT.textoConCaja(ctx, HUD.nombrePiso, cx, 18, PAL.blanco, PAL.cian); ctx.globalAlpha = 1; }
    if (HUD.tiempoMsg > 0) { HUD.tiempoMsg -= dt; TXT.textoConCaja(ctx, HUD.mensaje, cx, VH - 70, PAL.blanco, PAL.amarillo); }

    // Caído o muerto
    if (jug.estado === 'caido') {
      ctx.fillStyle = 'rgba(255,40,40,0.22)'; ctx.fillRect(0, 0, A, VH);
      TXT.textoConCaja(ctx, 'CAIDO: UN COMPANERO PUEDE REVIVIRTE', cx, 90, PAL.blanco, PAL.rojo);
      TXT.textoConCaja(ctx, 'REAPARECES EN LA ESTACION EN ' + Math.ceil(jug.tCaido) + ' S', cx, 104, PAL.gris, PAL.rojo);
      if (jug.reviviendo > 0) { ctx.fillStyle = PAL.verde; ctx.fillRect(cx - 40, 118, Math.round(80 * jug.reviviendo), 4); }
    } else if (jug.estado === 'muerto') {
      ctx.fillStyle = 'rgba(7,6,13,0.55)'; ctx.fillRect(0, 0, A, VH);
      TXT.textoConCaja(ctx, 'ELIMINADO', cx, 90, PAL.rojo, PAL.rojo);
      TXT.textoConCaja(ctx, 'REAPARECES EN ' + Math.max(0, Math.ceil(jug.tReaparecer)), cx, 104, PAL.blanco, PAL.rojo);
    }
    // Fundido de cambio de piso
    if (jug.transicion) {
      const m = C.TRANSICION / 2, a = 1 - Math.abs(jug.transicion.t / m - 1);
      ctx.fillStyle = 'rgba(7,6,13,' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; ctx.fillRect(0, 0, A, VH);
    }
    // Registro que se está leyendo (no pausa la partida)
    if (HUD.lectura) {
      HUD.tLectura += dt;
      DM.Pantallas.registro(ctx, DM.REGISTROS[HUD.lectura], 90, 24, 300, 150);
      TXT.texto(ctx, tactil ? 'TOCA USAR PARA CERRAR' : '[E] CERRAR - QUEDA EN EL ARCHIVO', cx, 178, PAL.gris, 1, 'centro');
      if (HUD.tLectura > 25 || jug.estado !== 'vivo') HUD.lectura = null;
    }
    // Destello del desintegrador
    const es = DM.Escena.estado;
    if (es.tDestello > 0) { ctx.fillStyle = 'rgba(77,255,138,' + (es.tDestello * 1.2).toFixed(3) + ')'; ctx.fillRect(0, 0, A, VH); }
    if (HUD.tablero) tablero(ctx, mundo, jug);
  };

  // ---------- Campaña ----------
  function reloj(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function campanaTexto(st) {
    let txt = 'SECTOR ' + st.n + '   ';
    switch (st.tipo) {
      case 'intro': txt += 'PREPARENSE'; break;
      case 'oleadas':
        txt += st.oleada ? 'OLEADA ' + st.oleada + '/' + st.total + '   QUEDAN ' + st.quedan : 'PREPARENSE';
        if (st.pausa !== null && st.pausa !== undefined && st.pausa > 0) txt = 'SECTOR ' + st.n + '   SIGUIENTE OLEADA EN ' + Math.ceil(st.pausa);
        break;
      case 'activar': txt += 'CONSOLAS ' + st.consolas.filter(function (v) { return v >= 1; }).length + '/' + st.consolas.length; break;
      case 'jefe': txt += 'JEFE'; break;
      case 'resistir': txt += 'RESISTAN ' + reloj(st.restante); break;
      case 'salida': txt += 'EN LA SALIDA ' + st.enSalida + '/' + st.jugadores + (st.restante >= 0 ? '   ' + reloj(st.restante) : ''); break;
    }
    return txt + '   REIMPRESIONES ' + st.vidas;
  }
  // Objetivo, barra del jefe, flecha hacia el objetivo y presentación del sector
  function campanaVista(ctx, st, mundo, jug, cam, t) {
    const cx = A / 2;
    const nivel = DM.CAMPANA_POR_ID[st.nivel];
    if (st.tipo === 'intro') {
      DM.UI.panel(ctx, 70, 40, 340, 62, PAL.cian);
      TXT.texto(ctx, nivel.nombre, cx, 47, PAL.cianClaro, 1, 'centro');
      TXT.parrafo(ctx, nivel.intro, cx, 62, 320, PAL.blanco, 'centro', 10);
      TXT.texto(ctx, 'EMPIEZA EN ' + Math.max(1, Math.ceil(st.pausa || 0)), cx, 92, PAL.amarilloClaro, 1, 'centro');
      return;
    }
    if (HUD.tPiso <= 0) TXT.texto(ctx, st.texto, cx, 15, PAL.amarilloClaro, 1, 'centro');
    // Barra del jefe
    if (st.tipo === 'jefe' && st.jefe >= 0) {
      ctx.fillStyle = 'rgba(7,6,13,0.7)'; ctx.fillRect(cx - 82, 25, 164, 12);
      ctx.fillStyle = '#3a0a10'; ctx.fillRect(cx - 80, 31, 160, 4);
      ctx.fillStyle = PAL.rojo; ctx.fillRect(cx - 80, 31, Math.round(160 * st.jefe), 4);
      TXT.texto(ctx, 'ROBOT GUARDIAN', cx, 25, PAL.rojo, 1, 'centro');
    }
    // Flecha hacia el objetivo más cercano (consola pendiente o salida)
    let puntos = [];
    if (st.tipo === 'activar') puntos = mundo.mapa.consolas.filter(function (c, k) { return st.consolas[k] < 1; }).map(function (c) { return { piso: c.piso, x: c.x + 0.5, y: c.y + 0.5 }; });
    if (st.tipo === 'salida') puntos = mundo.mapa.salidas.map(function (c) { return { piso: c.piso, x: c.x + 0.5, y: c.y + 0.5 }; });
    if (!puntos.length || jug.estado !== 'vivo') return;
    let mejor = null, md = 1e9;
    for (const p of puntos) { const d = Math.hypot(p.x - jug.x, p.y - jug.y) + (p.piso !== jug.piso ? 40 : 0); if (d < md) { md = d; mejor = p; } }
    if (mejor.piso !== jug.piso) { TXT.textoConCaja(ctx, 'OBJETIVO EN EL ' + mundo.mapa.pisos[mejor.piso].nombre.split(' - ')[0], cx, 26, PAL.amarilloClaro, PAL.amarillo); return; }
    const d = Math.hypot(mejor.x - jug.x, mejor.y - jug.y);
    if (d < 1.2) return;
    const rel = Math.atan2(mejor.y - jug.y, mejor.x - jug.x) - cam.ang;
    const ax = cx, ay = 34, sx = Math.sin(rel), sy = -Math.cos(rel);
    ctx.fillStyle = Math.floor(t * 3) % 2 ? PAL.amarilloClaro : PAL.amarillo;
    for (let q = 0; q < 9; q++) ctx.fillRect(Math.round(ax + sx * q) - 1, Math.round(ay + sy * q) - 1, 2, 2);
    for (let q = 1; q < 5; q++) {
      for (const lado of [-1, 1]) {
        const bx = ax + sx * (8 - q) + lado * sy * q * -1, by = ay + sy * (8 - q) + lado * -sx * q * -1;
        ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 2, 2);
      }
    }
    TXT.texto(ctx, Math.round(d) + ' M', cx + 14, ay - 2, PAL.gris);
  }

  // Marcador (tecla Tab)
  function tablero(ctx, mundo, jug) {
    const lista = Object.keys(mundo.jugadores).map(function (k) { return mundo.jugadores[k]; });
    lista.sort(function (a, b) { return (b.puntos - a.puntos) || (b.bajas - a.bajas); });
    const h = 24 + lista.length * 12;
    DM.UI.panel(ctx, 110, 40, 260, h, PAL.cian);
    TXT.texto(ctx, 'JUGADOR', 118, 46, PAL.gris); TXT.texto(ctx, 'BAJAS', 290, 46, PAL.gris); TXT.texto(ctx, 'MUERTES', 322, 46, PAL.gris);
    lista.forEach(function (o, k) {
      const y = 58 + k * 12;
      const col = o.equipo !== null && mundo.modo === 'versus' && mundo.conf.modo === 'equipos' ? DM.EQUIPOS[o.equipo].claro : o === jug ? PAL.amarilloClaro : PAL.blanco;
      TXT.texto(ctx, o.nombre + (o.estado !== 'vivo' ? ' (' + (o.estado === 'caido' ? 'CAIDO' : 'MUERTO') + ')' : ''), 118, y, col);
      TXT.texto(ctx, String(mundo.modo === 'versus' ? o.puntos : o.bajas), 310, y, PAL.blanco, 1, 'der');
      TXT.texto(ctx, String(o.muertes), 352, y, PAL.blanco, 1, 'der');
    });
  }

  DM.HUD = HUD;
})();
