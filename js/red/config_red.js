// =====================================================
// Configuración del multijugador (adaptado de Worodorox 3073)
// =====================================================
DM.configRed = {
  // Prefijo de los identificadores en el servidor de PeerJS (evita choques con otros juegos)
  PREFIJO: 'dumulti-v1-',
  HZ: 20,                  // instantáneas por segundo del anfitrión
  MAX_JUGADORES: 8,
  RETRASO_INTERP: 0.1,     // los demás se dibujan 100 ms en el pasado (movimiento suave)
  TIEMPO_CONEXION: 15,     // segundos de espera al unirse antes de dar error

  // 'peer' = por internet con PeerJS | 'local' = entre pestañas del mismo navegador (para probar).
  // También se puede elegir con la dirección: index.html?red=local
  transporte: /[?&]red=local/.test(location.search) ? 'local' : 'peer',

  // Servidores ICE para atravesar routers.
  // STUN sirve en la mayoría de las casas. Si alguien no logra conectarse (datos móviles,
  // algunas redes de empresas o colegios), agrega aquí un servidor TURN con sus credenciales:
  //   { urls: 'turn:servidor.ejemplo.com:3478', username: 'usuario', credential: 'clave' }
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
