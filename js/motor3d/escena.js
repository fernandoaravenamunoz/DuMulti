// =====================================================
// Escena: arma la lista de sprites de cada cuadro a partir del mundo,
// maneja los efectos visuales (partículas, explosiones, trazas de disparos,
// rayos de aviso) y las luces dinámicas. Solo dibujo: no cambia la simulación.
// Los efectos nacen de los EVENTOS del mundo (en red llegan con las instantáneas).
// =====================================================
(function () {
  'use strict';
  const C = DM.config, PAL = DM.paleta;
  const A = C.ANCHO, VH = C.VISTA_ALTO, P = C.PROYECCION;
  const SP = DM.sprites;

  const particulas = [];   // { piso, x, y, z, vx, vy, vz, vida, tex, alto, grav }
  const explosiones = [];  // { piso, x, y, z, r, estilo, t }
  const trazas = [];       // { tramos, t, dur, color, ancho }
  const escena = { temblor: 0, destello: null, tDestello: 0 };

  // Marca de trampa (Ñoquimbo las ve a través de las paredes)
  const MARCA = SP.spriteDesde(function (r, e) {
    for (let k = 0; k < 10; k++) { e(32 - k, 22 + k, 1, 1, PAL.magenta); e(32 + k, 22 + k, 1, 1, PAL.magenta); e(32 - k, 42 - k, 1, 1, PAL.magenta); e(32 + k, 42 - k, 1, 1, PAL.magenta); }
    e(31, 28, 2, 7, PAL.magentaClaro); e(31, 37, 2, 2, PAL.magentaClaro);
  });

  function particula(piso, x, y, z, tex, n, fuerza, vida, grav) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = fuerza * (0.4 + Math.random() * 0.6);
      particulas.push({ piso: piso, x: x, y: y, z: z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (Math.random() * 1.4 + 0.3) * fuerza, vida: vida * (0.6 + Math.random() * 0.6), tex: tex, alto: 0.08 + Math.random() * 0.06, grav: grav === undefined ? 6 : grav });
    }
    if (particulas.length > 300) particulas.splice(0, particulas.length - 300);
  }

  // ---------- Efectos a partir de los eventos ----------
  function procesar(eventos, jugLocal) {
    const E = SP.efectos;
    for (const ev of eventos) {
      switch (ev.t) {
        case 'explosion':
          explosiones.push({ piso: ev.piso, x: ev.x, y: ev.y, z: ev.z || 0.3, r: ev.r, estilo: ev.estilo, t: 0 });
          particula(ev.piso, ev.x, ev.y, (ev.z || 0.3) + 0.1, ev.estilo === 'frio' ? E.hielo : ev.estilo === 'plasma' ? E.magenta : E.fuegoP, 14, 3, 0.7);
          if (jugLocal && jugLocal.piso === ev.piso) {
            const d = Math.hypot(jugLocal.x - ev.x, jugLocal.y - ev.y);
            escena.temblor = Math.max(escena.temblor, Math.max(0, 1 - d / 7) * 0.5);
          }
          break;
        case 'traza': {
          const col = ev.arma === 'dronLaser' ? PAL.rojo : ev.laser ? PAL.cian : ev.arma === 'torreta' ? PAL.amarilloClaro : '#e6e3ff';
          trazas.push({ tramos: ev.tramos, t: 0, dur: ev.laser ? 0.25 : 0.07, color: col, ancho: ev.laser ? 2 : 1, laser: !!ev.laser });
          const ult = ev.tramos[ev.tramos.length - 1];
          if (ult && !ev.golpe) particula(ult[0], ult[4], ult[5], ult[6], E.metal, 3, 1.2, 0.35);
          break;
        }
        case 'impacto': particula(ev.piso, ev.x, ev.y, ev.z || 0.4, E.metal, 4, 1.4, 0.4); break;
        case 'chispa': case 'zap': particula(ev.piso, ev.x, ev.y, ev.z || 0.1, ev.t === 'zap' ? E.chispaCian : E.chispa, 6, 2, 0.4); break;
        case 'golpeEnemigo': particula(ev.piso, ev.x, ev.y, ev.z, ev.robot ? E.metal : E.hielo, 5, 1.6, 0.5); break;
        case 'muereEnemigo': particula(ev.piso, ev.x, ev.y, (ev.z || 0) + 0.5, ev.tipo === 'dron' || ev.tipo === 'guardian' ? E.metal : E.hielo, 16, 2.4, 0.9); break;
        case 'aplastar': particula(ev.piso, ev.x, ev.y, 0.3, E.metal, 12, 2.5, 0.6); escena.temblor = Math.max(escena.temblor, 0.2); break;
        case 'emp': explosiones.push({ piso: ev.piso, x: ev.x, y: ev.y, z: 0.3, r: ev.r, estilo: 'frio', t: 0, emp: true }); break;
        case 'desintegrar': escena.destello = PAL.verde; escena.tDestello = 0.5; escena.temblor = 0.6; break;
        case 'herido': if (jugLocal && ev.id === jugLocal.id) escena.temblor = Math.max(escena.temblor, Math.min(0.35, ev.n / 60)); break;
      }
    }
  }

  // ---------- Avance de los efectos ----------
  function paso(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.vida -= dt;
      p.vz -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.3; p.vx *= 0.5; p.vy *= 0.5; }
      if (p.vida <= 0) particulas.splice(i, 1);
    }
    for (let i = explosiones.length - 1; i >= 0; i--) { explosiones[i].t += dt; if (explosiones[i].t > 0.45) explosiones.splice(i, 1); }
    for (let i = trazas.length - 1; i >= 0; i--) { trazas[i].t += dt; if (trazas[i].t > trazas[i].dur) trazas.splice(i, 1); }
    escena.temblor = Math.max(0, escena.temblor - dt * 1.6);
    if (escena.tDestello > 0) escena.tDestello -= dt;
  }

  // ---------- Lista de sprites ----------
  const lista = [];
  function sprites(mundo, jugLocal, t) {
    lista.length = 0;
    const L = DM.luces;
    const push = function (o) { lista.push(o); return o; };
    // Jugadores (los demás)
    for (const id in mundo.jugadores) {
      const j = mundo.jugadores[id];
      if (j === jugLocal || j.estado === 'muerto' || j.oculto) continue;
      const marca = mundo.modo === 'versus' && mundo.conf.modo === 'equipos' && j.equipo !== null ? DM.EQUIPOS[j.equipo].color : mundo.modo === 'coop' ? PAL.verde : '#e6e3ff';
      const cu = DM.Personajes3D.de(j.personaje, marca);
      const tex = j.estado === 'caido' ? cu.caido : DM.Personajes3D.elegir(cu, j.ang, jugLocal.x - j.x, jugLocal.y - j.y, (j.andar || 0) > 0.08, t);
      const dios = j.ef && j.ef.dios > 0;
      push({ x: j.x, y: j.y, z: 0, piso: j.piso, tex: tex, alto: 0.95, brillo: dios || (j.ef && j.ef.proteccion > 0 && (Math.floor(t * 10) & 1)), siempre: dios && Math.hypot(j.x - jugLocal.x, j.y - jugLocal.y) < 8 });
      if (dios) L.agregar(j.piso, j.x, j.y, 2.2, PAL.cian, 1.2);
      if (j.disparando > 0) L.agregar(j.piso, j.x + Math.cos(j.ang) * 1.5, j.y + Math.sin(j.ang) * 1.5, 2.5, DM.ARMAS[j.armaActual ? j.armaActual() : 'soplete'].color || '#ff8a2b', 1);
    }
    // Enemigos
    for (const e of mundo.enemigos) {
      const def = SP.enemigos[e.tipo];
      let tex;
      if (e.muerto) { if ((e.tMuerto || 0) > 0.6) continue; tex = def.restos; }
      else if ((e.anim > 0 && e.anim < 0.6) || e.cargaT > 0) tex = def.ataque;
      else tex = def.cuadros[Math.floor(t * def.fps + e.id * 0.37) % def.cuadros.length];
      push({ x: e.x, y: e.y, z: e.muerto ? 0 : e.z, piso: e.piso, tex: tex, alto: def.alto, brillo: e.ef && e.ef.congelado > 0 });
      if (e.tipo === 'dron' && !e.muerto) L.agregar(e.piso, e.x, e.y, 1.6, PAL.rojo, e.cargaT > 0 ? 1.2 : 0.4);
    }
    // Barriles
    for (const b of mundo.barriles) if (!b.muerto) { push({ x: b.x, y: b.y, z: 0, piso: b.piso, tex: DM.sprites.barril, alto: 0.6 }); }
    // Objetos
    for (const it of mundo.items) {
      if (!it.activo) continue;
      let def = SP.objetos[it.tipo];
      if (!def && it.tipo.indexOf('arma:') === 0) def = SP.armaSuelo[it.tipo.slice(5)];
      if (!def) continue;
      const bob = 0.03 + Math.sin(t * 3 + it.id) * 0.03;
      push({ x: it.x, y: it.y, z: bob, piso: it.piso, tex: def.tex, alto: def.alto });
      if (it.premio) L.agregar(it.piso, it.x, it.y, 2.2, it.tipo === 'nucleo' ? PAL.cian : it.tipo === 'arma:desintegrador' ? PAL.verde : PAL.amarilloClaro, 0.9 + Math.sin(t * 5) * 0.3);
    }
    // Cartas (registros en el piso)
    for (const r of mundo.mapa.registros) if (r.carta) push({ x: r.x + 0.5, y: r.y + 0.5, z: 0, piso: r.piso, tex: SP.objetos.carta.tex, alto: 0.3 });
    // Proyectiles y lanzables
    for (const p of mundo.proyectiles) {
      if (p.lanzable) {
        const cu = SP.lanzados[p.lanzable];
        const n = p.lanzable === 'bengala' ? Math.floor(t * 12) % 3 : p.lanzable === 'mina' ? (p.armada && Math.floor(t * 3) % 2 ? 1 : 0) : p.lanzable === 'granada' ? Math.floor(t * 6) % 2 : 0;
        push({ x: p.x, y: p.y, z: Math.max(0, p.z - 0.05), piso: p.piso, tex: cu[n % cu.length], alto: 0.3 });
        if (p.lanzable === 'bengala' && p.quieto) L.agregar(p.piso, p.x, p.y, 4, '#ff8a2b', 1.4 + Math.random() * 0.3);
      } else {
        const tex = SP.balas[p.bala] || SP.balas.piedra;
        push({ x: p.x, y: p.y, z: p.z - 0.15, piso: p.piso, tex: tex, alto: 0.3 });
        if (p.bala === 'plasma') L.agregar(p.piso, p.x, p.y, 1.6, PAL.magenta, 0.9);
        if (p.bala === 'orbe') L.agregar(p.piso, p.x, p.y, 1.6, PAL.rojo, 0.9);
      }
    }
    // Torretas
    for (const tr of mundo.torretas) push({ x: tr.x, y: tr.y, z: 0, piso: tr.piso, tex: SP.lanzados.torreta[Math.floor(t * 4) % 2], alto: 0.45 });
    // Nubes de gas
    for (const n of mundo.nubes) push({ x: n.x, y: n.y, z: 0, piso: n.piso, tex: SP.efectos.nube[Math.floor(t * 3) % 2], alto: 1.2 });
    // Trampas: láseres, gas activo, focos y luz de las que están encendidas
    const noquimbo = jugLocal.personaje === 'noquimbo';
    for (const tr of mundo.trampas) {
      const cx = tr.x + 0.5, cy = tr.y + 0.5;
      if (tr.car === 'l') push({ x: cx, y: cy, z: 0, piso: tr.piso, tex: SP.trampas.laser[tr.fase], alto: 1 });
      else if (tr.car === 'g' && tr.fase === 2) push({ x: cx, y: cy, z: 0, piso: tr.piso, tex: SP.efectos.nube[Math.floor(t * 3) % 2], alto: 1 });
      else if (tr.car === 'f') {
        push({ x: cx, y: cy, z: 0, piso: tr.piso, tex: SP.trampas.foco[tr.fase === 2 || (tr.fase === 1 && Math.floor(t * 8) % 2) ? 1 : 0], alto: 0.5 });
        if (tr.fase >= 1 && (tr.fase === 2 || Math.floor(t * 8) % 2)) for (let k = 1; k <= 4; k++) L.agregar(tr.piso, cx + Math.cos(tr.ang) * k, cy + Math.sin(tr.ang) * k, 1.1, PAL.magenta, tr.fase === 2 ? 1.1 : 0.4);
      }
      if (tr.fase === 2 && (tr.car === 'x' || tr.car === 'l')) L.agregar(tr.piso, cx, cy, 1.6, tr.car === 'x' ? PAL.cianClaro : PAL.magenta, 0.7);
      if (noquimbo && tr.piso === jugLocal.piso && Math.hypot(cx - jugLocal.x, cy - jugLocal.y) < 7) push({ x: cx, y: cy, z: 0.55, piso: tr.piso, tex: MARCA, alto: 0.3, siempre: true, brillo: true });
    }
    // Campaña: la salida activa brilla en verde y las consolas encendidas en verde
    if (mundo.mapa.salidas.length || mundo.mapa.consolas.length) {
      const st = mundo.estadoRed || mundo.reglas.estado();
      if (st && st.modo === 'campana') {
        if (st.salida) for (let k = 0; k < mundo.mapa.salidas.length; k += 2) { const s = mundo.mapa.salidas[k]; L.agregar(s.piso, s.x + 0.5, s.y + 0.5, 2.2, PAL.verde, 0.7 + Math.sin(t * 4) * 0.25); }
        mundo.mapa.consolas.forEach(function (c, k) {
          const v = st.consolas ? st.consolas[k] : 0;
          if (v >= 1) L.agregar(c.piso, c.x + 0.5, c.y + 0.5, 2.4, PAL.verde, 0.9);
          else if (v > 0 && st.tipo === 'activar') L.agregar(c.piso, c.x + 0.5, c.y + 0.5, 2, PAL.amarilloClaro, 0.5 + v);
        });
      }
    }
    // Partículas y explosiones
    for (const p of particulas) push({ x: p.x, y: p.y, z: p.z, piso: p.piso, tex: p.tex, alto: p.alto, brillo: true });
    for (const ex of explosiones) {
      const k = Math.min(3, Math.floor(ex.t / 0.45 * 4));
      const cu = SP.efectos[ex.estilo] || SP.efectos.fuego;
      push({ x: ex.x, y: ex.y, z: Math.max(0, ex.z - ex.r * 0.4), piso: ex.piso, tex: cu[k], alto: ex.r * 1.2, brillo: true });
      L.agregar(ex.piso, ex.x, ex.y, ex.r * 2.2, ex.estilo === 'plasma' ? PAL.magenta : ex.estilo === 'frio' ? PAL.cian : '#ff8a2b', 2.2 * (1 - ex.t / 0.45));
    }
    return lista;
  }

  // ---------- Proyección de un punto 3D a la pantalla ----------
  function proyectar(cam, piso, x, y, z) {
    const dirX = Math.cos(cam.ang), dirY = Math.sin(cam.ang);
    const plX = -dirY * C.PLANO, plY = dirX * C.PLANO;
    const invDet = 1 / (plX * dirY - dirX * plY);
    const sx = x - cam.x, sy = y - cam.y;
    const tX = invDet * (dirY * sx - dirX * sy), tY = invDet * (-plY * sx + plX * sy);
    if (tY <= 0.05) return null;
    const hor = Math.round(VH / 2 + cam.pitch * C.PITCH_MAX);
    return { x: (A / 2) * (1 + tX / tY), y: hor + (cam.camZ - z - (piso - cam.piso)) * P / tY, d: tY };
  }

  // Línea en 3D con prueba de profundidad por columna (rayos, trazas)
  function linea3D(ctx, cam, piso, x0, y0, z0, x1, y1, z1, color, ancho, salto) {
    if (piso !== cam.piso) return;
    const zb = DM.raycaster.zbuf;
    const n = Math.max(6, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 10));
    ctx.fillStyle = color;
    for (let k = 0; k <= n; k++) {
      if (salto && (k % 4) > 1) continue;
      const t = k / n;
      const p = proyectar(cam, piso, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t);
      if (!p) continue;
      const cx = p.x | 0;
      if (cx < 0 || cx >= A || p.y < 0 || p.y >= VH) continue;
      if (p.d > zb[cx] + 0.02) continue;
      const w = Math.max(1, Math.min(4, ancho * 1.5 / Math.max(0.6, p.d) + 0.5));
      ctx.fillRect(cx - (w >> 1), (p.y | 0) - (w >> 1), w, w);
    }
  }

  // Dibuja trazas y rayos de aviso (después del raycaster)
  function dibujarRayos(ctx, cam, mundo, jugLocal, t) {
    for (const tr of trazas) {
      const a = 1 - tr.t / tr.dur;
      ctx.globalAlpha = Math.max(0.2, a);
      for (const s of tr.tramos) linea3D(ctx, cam, s[0], s[1], s[2], s[3], s[4], s[5], s[6], tr.color, tr.ancho, !tr.laser);
    }
    ctx.globalAlpha = 1;
    // Drones cargando: rayo de aviso rojo discontinuo
    for (const e of mundo.enemigos) {
      if (e.muerto || !(e.cargaT > 0) || !e.apunta) continue;
      if (Math.floor(t * 16) % 2) linea3D(ctx, cam, e.piso, e.x, e.y, e.z + 0.15, e.apunta.x, e.apunta.y, e.apunta.z, PAL.rojo, 1, true);
    }
    // Jugadores cargando el láser o el desintegrador
    for (const id in mundo.jugadores) {
      const j = mundo.jugadores[id];
      if (j === jugLocal || !(j.cargaT > 0) || j.estado !== 'vivo') continue;
      const l = 12, pend = DM.Combate.pendiente(j.pitch);
      linea3D(ctx, cam, j.piso, j.x, j.y, j.camZ, j.x + Math.cos(j.ang) * l, j.y + Math.sin(j.ang) * l, j.camZ + pend * l, j.pesada && j.pesada.id === 'desintegrador' ? PAL.verde : PAL.cian, 1, true);
    }
  }

  DM.Escena = {
    procesar: procesar, paso: paso, sprites: sprites, dibujarRayos: dibujarRayos, proyectar: proyectar,
    estado: escena,
    reiniciar: function () { particulas.length = 0; explosiones.length = 0; trazas.length = 0; escena.temblor = 0; escena.tDestello = 0; }
  };
})();
