// =====================================================
// Control USB o Bluetooth (mando): valores ajustables y botones.
// Los números de botón son los del estándar de los navegadores
// (control de Xbox; en PlayStation es la misma posición):
//   0 A/✕  1 B/○  2 X/□  3 Y/△  4 LB/L1  5 RB/R1  6 LT/L2  7 RT/R2
//   8 View/Select  9 Menú/Start  10 stick izq.  11 stick der.
//   12 cruceta arriba  13 abajo  14 izquierda  15 derecha
// =====================================================
DM.MANDO = {
  zonaMuerta: 0.18,        // por debajo de esto el stick cuenta como suelto (sube si el personaje se mueve solo)
  giro: 3.2,               // radianes por segundo con el stick derecho a fondo (se multiplica por la sensibilidad)
  mirarVertical: 1.6,      // velocidad para mirar arriba y abajo
  curva: 1.6,              // >1: más precisión cerca del centro del stick
  gatillo: 0.35,           // cuánto hay que apretar LT/RT para que cuente
  repetirMenu: [0.35, 0.12], // menús: espera antes de repetir y cada cuánto repite
  // En partida: botón → acción
  juego: {
    7: 'disparo', 6: 'lanzar', 0: 'usar', 2: 'recargar', 4: 'armaAnterior', 5: 'armaSiguiente',
    3: 'lanzable', 12: 'ping', 13: 'mapa', 8: 'marcador', 9: 'pausa', 10: 'correr'
  },
  // En los menús
  menu: { 0: 'aceptar', 1: 'volver', 9: 'volver', 12: 'arriba', 13: 'abajo', 14: 'izquierda', 15: 'derecha' }
};
