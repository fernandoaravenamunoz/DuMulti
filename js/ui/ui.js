// =====================================================
// Kit de interfaz: botones con clic, toque y teclado (flechas + Enter)
// Cada pantalla registra sus botones en cada cuadro con UI.boton(...);
// main.js le pasa los clics y las teclas.
// =====================================================
(function () {
  'use strict';
  const PAL = DM.paleta, TXT = DM.Texto, F = DM.fuente;

  const UI = { botones: [], foco: 0, pantalla: null };

  UI.inicio = function (pantalla) {
    if (UI.pantalla !== pantalla) { UI.pantalla = pantalla; UI.foco = 0; }
    UI.botones = [];
  };

  // opc: { color, activo (resaltado), apagado (no se puede usar), accion, chico, alinear }
  UI.boton = function (ctx, x, y, w, h, texto, opc) {
    opc = opc || {};
    const k = UI.botones.length;
    const enfocado = k === UI.foco && !opc.apagado;
    const col = opc.apagado ? PAL.grisOsc : (opc.color || PAL.cian);
    ctx.fillStyle = opc.activo ? 'rgba(34,228,255,0.22)' : enfocado ? 'rgba(232,185,35,0.16)' : 'rgba(7,6,13,0.78)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = enfocado ? PAL.amarilloClaro : col;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    if (enfocado) { ctx.fillRect(x - 3, y + (h >> 1) - 1, 2, 3); }
    const tc = opc.apagado ? PAL.grisOsc : enfocado ? PAL.amarilloClaro : opc.activo ? PAL.cianClaro : (opc.colorTexto || PAL.blanco);
    const s = typeof texto === 'function' ? texto() : texto;
    if (opc.alinear === 'izq') TXT.texto(ctx, s, x + 5, y + ((h - 5) >> 1), tc, 1, 'izq');
    else TXT.texto(ctx, s, x + (w >> 1), y + ((h - 5) >> 1), tc, 1, 'centro');
    UI.botones.push({ x: x, y: y, w: w, h: h, accion: opc.apagado ? null : opc.accion, apagado: !!opc.apagado });
    return k;
  };

  // Fila con etiqueta a la izquierda y valor que se cambia con clic (o flechas)
  UI.opcion = function (ctx, x, y, w, etiqueta, valor, alCambiar, apagado) {
    TXT.texto(ctx, etiqueta, x, y + 3, apagado ? PAL.grisOsc : PAL.gris);
    UI.boton(ctx, x + w - 96, y, 96, 11, valor, { accion: alCambiar, apagado: apagado, chico: true });
  };

  UI.clic = function (x, y) {
    for (let k = UI.botones.length - 1; k >= 0; k--) {
      const b = UI.botones[k];
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
        UI.foco = k;
        if (b.accion) { if (DM.Audio) DM.Audio.sfx('clic'); b.accion(); }
        return true;
      }
    }
    return false;
  };

  UI.tecla = function (k) {
    const n = UI.botones.length;
    if (!n) return false;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'KeyS' || k === 'Tab') { mover(1); return true; }
    if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'KeyW') { mover(-1); return true; }
    if (k === 'Enter' || k === 'Space') {
      const b = UI.botones[UI.foco];
      if (b && b.accion) { if (DM.Audio) DM.Audio.sfx('clic'); b.accion(); }
      return true;
    }
    return false;
  };
  function mover(d) {
    const n = UI.botones.length;
    for (let i = 0; i < n; i++) {
      UI.foco = (UI.foco + d + n) % n;
      if (!UI.botones[UI.foco].apagado) break;
    }
  }

  // Panel con borde
  UI.panel = function (ctx, x, y, w, h, borde) {
    ctx.fillStyle = 'rgba(7,6,13,0.9)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = borde || PAL.cianOsc;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  };
  UI.titulo = function (ctx, texto, y, color) { TXT.textoNeon(ctx, texto, 240, y || 14, PAL.blanco, color || PAL.cian, 2, 'centro'); };
  UI.ancho = function (s) { return F.ancho(s, 1); };

  DM.UI = UI;
})();
