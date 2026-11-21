// =====================================================
// Utilidades de texto en pantalla (canvas 2D)
// Reutilizado de ui/hud.js de Worodorox 3073: caché de textos ya dibujados,
// alineación, párrafos y texto con caja. Se agregó el texto con brillo neón.
// =====================================================
(function () {
  'use strict';
  const F = DM.fuente;

  // Caché de textos (evita repintar píxel por píxel en cada cuadro)
  const cache = new Map();
  function imagenTexto(str, color, esc, grande) {
    const clave = str + '|' + color + '|' + esc + '|' + (grande ? 1 : 0);
    let img = cache.get(clave);
    if (img) return img;
    if (cache.size > 500) cache.clear();
    const w = Math.max(1, grande ? F.anchoGrande(str, esc) : F.ancho(str, esc));
    const h = (grande ? 7 : 5) * esc;
    img = document.createElement('canvas');
    img.width = w; img.height = h;
    const c = img.getContext('2d');
    if (grande) F.dibujarGrande(c, str, 0, 0, color, esc);
    else F.dibujarCrudo(c, str, 0, 0, color, esc);
    cache.set(clave, img);
    return img;
  }

  // alinear: 'izq', 'centro', 'der'
  function texto(ctx, str, x, y, color, esc, alinear, grande) {
    esc = esc || 1;
    const s = grande ? String(str) : F.normalizar(str);
    if (!s.length) return 0;
    const img = imagenTexto(s, color, esc, grande);
    let px = x;
    if (alinear === 'centro') px = x - (img.width >> 1);
    else if (alinear === 'der') px = x - img.width;
    ctx.drawImage(img, Math.round(px), Math.round(y));
    return img.width;
  }

  // Texto con un halo de color detrás (efecto neón)
  function textoNeon(ctx, str, x, y, color, halo, esc, alinear) {
    ctx.globalAlpha = 0.35;
    for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]]) texto(ctx, str, x + d[0] * Math.max(1, esc >> 1), y + d[1] * Math.max(1, esc >> 1), halo, esc, alinear);
    ctx.globalAlpha = 1;
    texto(ctx, str, x, y, color, esc, alinear);
  }

  // Texto en varias líneas que no excedan "ancho" píxeles. Devuelve la Y final.
  function parrafo(ctx, str, x, y, ancho, color, alinear, interlinea) {
    const palabras = F.normalizar(str).split(' ');
    const maxCar = Math.floor((ancho + 1) / 4);
    let linea = '';
    const lineas = [];
    for (const p of palabras) {
      if ((linea + ' ' + p).trim().length > maxCar) { lineas.push(linea.trim()); linea = p; }
      else linea += ' ' + p;
    }
    if (linea.trim()) lineas.push(linea.trim());
    for (const l of lineas) { texto(ctx, l, x, y, color, 1, alinear); y += interlinea || 8; }
    return y;
  }

  // Texto con caja oscura de fondo y borde de color
  function textoConCaja(ctx, str, x, y, color, borde) {
    const w = F.ancho(str, 1);
    const bx = Math.round(x - w / 2) - 4;
    ctx.fillStyle = 'rgba(7,6,13,0.85)';
    ctx.fillRect(bx, y - 3, w + 8, 11);
    ctx.fillStyle = borde;
    ctx.fillRect(bx, y - 3, w + 8, 1);
    ctx.fillRect(bx, y + 7, w + 8, 1);
    texto(ctx, str, x, y, color, 1, 'centro');
  }

  DM.Texto = { texto: texto, textoNeon: textoNeon, parrafo: parrafo, textoConCaja: textoConCaja };
})();
