// =====================================================
// Mapa automático (tecla Q o botón MAPA): muestra los dos pisos lado a lado,
// solo con las casillas que ya viste (como el mapa de Worodorox 3073).
// No pausa la partida. Marca tu posición, tus compañeros, puertas, escaleras,
// ascensores, estaciones de respaldo, trampas y premios mayores.
// =====================================================
(function () {
  'use strict';
  const C = DM.config, PAL = DM.paleta, TXT = DM.Texto, P = DM.PARED, S = DM.SUELO;

  function dibujar(ctx, mundo, jug, t) {
    const VH = C.VISTA_ALTO, pisos = mundo.mapa.pisos;
    ctx.fillStyle = 'rgba(7,6,13,0.93)';
    ctx.fillRect(0, 0, C.ANCHO, VH);
    const n = pisos.length;
    const tam = Math.floor(Math.min((C.ANCHO - 30) / (n * 24 + (n - 1) * 2), (VH - 40) / 24));
    let x0 = Math.floor((C.ANCHO - (n * 24 * tam + (n - 1) * 2 * tam)) / 2);
    pisos.forEach(function (p, k) {
      const visto = DM.raycaster.visto(k);
      const ox = x0 + k * (p.ancho + 2) * tam, oy = 18;
      TXT.texto(ctx, p.nombre, ox, oy - 8, k === jug.piso ? PAL.amarilloClaro : PAL.gris);
      ctx.fillStyle = k === jug.piso ? PAL.cianOsc : '#1c1b28';
      ctx.fillRect(ox - 1, oy - 1, p.ancho * tam + 2, 1); ctx.fillRect(ox - 1, oy + p.alto * tam, p.ancho * tam + 2, 1);
      for (let y = 0; y < p.alto; y++) for (let x = 0; x < p.ancho; x++) {
        const i = p.indice(x, y);
        if (!visto || !visto[i]) continue;
        const w = p.paredes[i];
        let col = null;
        if (w) {
          const info = DM.PAREDES[w];
          col = info.puerta ? (w === P.SECUENCIA ? PAL.cian : PAL.magenta) : w === P.REJILLA ? '#5a6075' : w === P.INTERRUPTOR ? PAL.magentaOsc : w === P.PANTALLA || w === P.TERMINAL ? PAL.cianOsc : '#3a3a52';
        } else {
          const s = p.suelo[i];
          col = s === S.ESCALERA ? PAL.amarillo : s === S.ASCENSOR ? PAL.amarilloClaro : s === S.ESTACION ? PAL.verde : s === S.PLASMA ? PAL.magentaOsc : s === S.REJILLA ? '#22202f' : '#121119';
          if (p.trampa[i] >= 0) col = PAL.magentaOsc;
        }
        ctx.fillStyle = col;
        ctx.fillRect(ox + x * tam, oy + y * tam, tam - (w ? 0 : 1), tam - (w ? 0 : 1));
      }
      // Premios mayores visibles
      for (const it of mundo.items) {
        if (!it.activo || !it.premio || it.piso !== k) continue;
        const i = p.indice(Math.floor(it.x), Math.floor(it.y));
        if (!visto || !visto[i]) continue;
        if (Math.floor(t * 4) % 2) { ctx.fillStyle = PAL.amarilloClaro; ctx.fillRect(ox + it.x * tam - 2, oy + it.y * tam - 2, 4, 4); }
      }
      // Compañeros
      for (const id in mundo.jugadores) {
        const o = mundo.jugadores[id];
        if (o === jug || o.piso !== k || o.estado === 'muerto') continue;
        const amigo = mundo.modo === 'coop' || (mundo.conf.modo === 'equipos' && o.equipo === jug.equipo);
        if (!amigo) continue;
        ctx.fillStyle = o.estado === 'caido' ? (Math.floor(t * 4) % 2 ? PAL.rojo : '#6b1010') : mundo.modo === 'coop' ? PAL.verde : DM.EQUIPOS[o.equipo].color;
        ctx.fillRect(ox + o.x * tam - 2, oy + o.y * tam - 2, 4, 4);
      }
      // Tú: flecha con tu dirección
      if (k === jug.piso) {
        const px = ox + jug.x * tam, py = oy + jug.y * tam, a = jug.ang;
        ctx.fillStyle = PAL.amarilloClaro;
        for (let q = 0; q < 6; q++) ctx.fillRect(Math.round(px + Math.cos(a) * q) - 1, Math.round(py + Math.sin(a) * q) - 1, 2, 2);
        ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
      }
    });
    const ley = [[PAL.amarillo, 'ESCALERA'], [PAL.amarilloClaro, 'ASCENSOR'], [PAL.verde, 'ESTACION'], [PAL.magenta, 'COMPUERTA'], [PAL.magentaOsc, 'TRAMPA']];
    let lx = 20;
    for (const l of ley) { ctx.fillStyle = l[0]; ctx.fillRect(lx, VH - 10, 5, 5); TXT.texto(ctx, l[1], lx + 8, VH - 10, PAL.gris); lx += DM.fuente.ancho(l[1]) + 22; }
    TXT.texto(ctx, (DM.Entrada.tactil ? 'MAPA' : 'Q') + ': CERRAR', C.ANCHO - 8, VH - 10, PAL.gris, 1, 'der');
  }

  DM.MapaUI = { dibujar: dibujar, abierto: false };
})();
