# DuMulti v1.2

Shooter en primera persona multijugador (hasta 8 jugadores) en el universo de **Worodorox 3073**, con estética 32 bits "Alarma neón". Corre en el navegador (PC y celular) y como APK de Android.

## Cómo jugar (sin terminal)

1. Descomprime el `.zip`.
2. **Doble clic en `index.html`** (Chrome o Edge recomendados).
3. JUGAR SOLO → CAMPAÑA, SUPERVIVENCIA o PRÁCTICA, o MULTIJUGADOR → CREAR SALA / UNIRSE.

> Para el **multijugador por internet** el juego debe estar publicado (GitHub Pages, ver `docs/GITHUB-PAGES.md`) o servido con un servidor local (VS Code → extensión *Live Server* → clic derecho en `index.html` → *Open with Live Server*). Con doble clic funciona todo el juego solo; la red puede no conectar desde un archivo local.

### Probar la red en un solo computador
Abre dos pestañas con `index.html?red=local` (con Live Server: `http://127.0.0.1:5500/index.html?red=local`). En una: CREAR SALA. En la otra: UNIRSE con el código de 4 cifras.

### Jugar por internet
El anfitrión (idealmente en un PC con buena conexión) crea la sala y comparte el código. Los demás entran con UNIRSE. La configuración la elige el anfitrión y todos la ven en vivo. Si alguien no logra conectarse (datos móviles, redes de colegios), hay que agregar un servidor TURN en `js/red/config_red.js`.

## Controles

| Acción | PC | Táctil | Control USB / Bluetooth |
|---|---|---|---|
| Moverse | WASD (Shift corre) | Joystick izquierdo (al borde corre) | Stick izquierdo (apretarlo o a fondo corre) |
| Mirar | Mouse | Deslizar en la mitad derecha | Stick derecho |
| Disparar / golpear | Clic izquierdo | DISPARO | Gatillo derecho (RT / R2) |
| Armas | 1–4 y rueda | ARMA | LB / RB |
| Lanzable / elegir lanzable | G o clic derecho / X | LANZAR / ↻ | Gatillo izquierdo (LT / L2) / Y (△) |
| Mapa | Q | MAPA | Cruceta abajo |
| Ping (marcar para el equipo) | F o clic de la rueda | ! | Cruceta arriba |
| Recargar | R (también automática) | automática | X (□) |
| Usar, leer, revivir | E (mantener para revivir, sostener un interruptor o activar una consola) | USAR | A (✕), mantener igual que E |
| Marcador | Tab | TAB | View / Select |
| Pausa / silencio | Esc / M | II / ♫ | Menú / Start |
| FPS / calidad | P / C | — | — |

**Control:** se conecta y se usa sin configurar nada (Chrome o Edge; también en el celular por Bluetooth). En los menús: cruceta o stick para moverse, A para aceptar, B para volver. Con el control la ayuda de puntería es la del celular. En OPCIONES se ve si el juego lo detectó y se ajustan la sensibilidad del stick y la zona muerta (súbela si el personaje se mueve solo); invertir vertical es la misma opción de siempre. Los botones y velocidades están en `js/datos/mando.js`. Si el navegador no lo detecta, aprieta cualquier botón con la ventana del juego activa.

## Qué incluye

- **Campaña de 5 sectores** (solo o cooperativo, se guarda el avance): cada sector se desbloquea al superar el anterior.
  | Sector | Mapa | Objetivos |
  |---|---|---|
  | 1 Bloque criogénico | `sector4.js` | 4 oleadas → llegar a la escotilla del reactor |
  | 2 Pasarelas industriales | `pasarelas.js` | activar 3 consolas (una en el piso 2) → volver al montacargas |
  | 3 Laboratorios de seguridad | `laboratorios.js` | 5 oleadas con drones → llegar a la esclusa |
  | 4 Núcleo del reactor | `reactor.js` | derrotar al robot guardián |
  | 5 Hangar | `hangar.js` | encender la nave en la torre → resistir 60 s → subir en 45 s |

  Las consolas se activan manteniendo USAR; una flecha arriba de la pantalla apunta al objetivo y el MAPA lo marca. En multijugador el anfitrión elige el sector entre los que él ya desbloqueó; al ganar, todos guardan el avance.
- **Supervivencia** "Sector 1 - Bloque criogénico" (solo o cooperativo) (24×24, 2 pisos): 8 oleadas desde las cápsulas hacia la sala central, robot guardián al final, caer y revivir, estaciones de respaldo, 3 reimpresiones del equipo, premios en momentos clave y el desintegrador en la oleada final.
- **Versus** con dos arenas: **Cámara de pruebas** (20×20, 1 piso, para 2 a 4 jugadores) y **Sala del reactor** (24×24, 2 pisos, para 5 a 8). La opción ARENA (AUTO / CHICA / GRANDE) elige según cuántos hay en la sala; PRÁCTICA también la usa. Se reaparece a distancia media (sin que un rival te vea, a 8–14 casillas de camino) y quien dispara un arma a distancia aparece 2 s en el mapa de sus rivales (configurable). Versus: todos contra todos o por equipos Cian/Amarillo, fuego amigo (no / sí / solo explosivos), bajas y tiempo, muerte súbita, puntaje completo, disponibilidad de cada arma, objeto, premio, enemigo y trampa, configuraciones rápidas y una propia guardada.
- **8 personajes** con puños, arma de contacto, arma a distancia y ventaja propias.
- **7 armas pesadas + desintegrador**, **5 lanzables**, **5 enemigos**, **9 tipos de trampas** e interruptores de sala.
- **v1.2 – combate:** marca de acierto en la mira, destello y retroceso del enemigo al pegarle, el zombi levanta los brazos 0,3 s antes de golpear, los enemigos sueltan elixires y munición, y las trampas dañan al 40 % a los enemigos.
- **v1.2 – equipo y orientación:** ping (F), zonas con nombre y color de luz propio, rejillas que solo Gargolfo rompe, paneles lejanos para Pirulo, consolas que se mantienen a la vez en el sector 2 (con 2 o más jugadores).
- **v1.2 – rejugar y datos:** medallas por sector (SIN REIMPRESIONES, RÁPIDO, ARCHIVISTA), 3 secretos por mapa de campaña (paredes falsas y nichos tras rejillas) y OPCIONES → ESTADÍSTICAS: mapa de calor de las caídas, tiempo por fase y botón para copiar los datos.
- **Registros de la nave** (comunicados, cartas, reportes) con ARCHIVO en la pausa; en cooperativo se comparten.
- **Sonido**: efectos posicionales generados con código, música desde `assets/musica/` (si falta un MP3, suena una pista generada), volumen de música y efectos por separado, silencio.

## Música

Copia los 4 MP3 (128 kbps) en `assets/musica/` con estos nombres: `monume.mp3`, `kulakovka.mp3`, `atlasaudio.mp3`, `alex-morgan.mp3`.
Si prefieres dejar los nombres con que los descargaste, escríbelos en `js/datos/musica.js`. En **OPCIONES** el juego muestra qué archivo busca y si lo encontró.
Para el APK, la música también tiene que quedar en `android/app/src/main/assets/public/assets/musica/` (ver `docs/ANDROID.md`).

## Arquitectura

```
js/
├── config.js            constantes, paleta, códigos de casillas
├── mando.js             control USB o Bluetooth (se suma a input.js)
├── datos/               personajes, armas, enemigos y objetos, registros, configuración de partida,
│                        campana.js (los 5 sectores y el progreso guardado)
├── mapas/               sector4.js, pasarelas.js, laboratorios.js, hangar.js (campaña y cooperativo),
│                        reactor.js (versus grande y sector 4), arena_chica.js (versus chico)
├── sim/                 SIMULACIÓN PURA (sin DOM): mapa, jugador, combate, enemigos,
│                        trampas, objetos, reglas de cada modo, mundo
├── red/                 transporte (PeerJS / BroadcastChannel), instantáneas, sala y sincronización
├── motor3d/             texturas, sprites, personajes, luces, raycaster, escena (efectos)
├── ui/                  kit de botones, pantallas, HUD, retratos, armas en primera persona
├── audio/synth.js       efectos y música
└── main.js              bucle y estados
```

- **Anfitrión autoritativo:** los clientes envían comandos compactos con número de secuencia; el anfitrión simula todo y envía instantáneas a 20 Hz (solo cambios para objetos, puertas y barriles).
- **Clientes:** predicen su propio movimiento y lo corrigen suave; interpolan a los demás con 100 ms de búfer.
- **Compensación de retraso:** el anfitrión rebobina las posiciones hasta 150 ms según la latencia de quien dispara.
- **Trampas por reloj:** se ven sincronizadas sin gastar red.

## Editar sin tocar el motor

- **Nombres de personajes:** `js/datos/personajes.js`.
- **Daño, alcance y cadencia:** `js/datos/armas.js` y `js/datos/enemigos.js`.
- **Oleadas de supervivencia y configuraciones rápidas:** `js/datos/partida.js`.
- **Campaña (fases, oleadas, enemigos que siguen llegando, premios, tiempos):** `js/datos/campana.js`.
- **Textos de los registros:** `js/datos/registros.js`.
- **Mapas:** `js/mapas/*.js` (la leyenda está al inicio de `sector4.js`). Después de cambiarlos, valida con `npm run validar` (o desde el panel NPM SCRIPTS de VS Code). Para comprobar que los 5 sectores se pueden terminar (y las pruebas de trampas y consolas): `npm run probar`. Para medir tamaño, visibilidad y cada cuánto se encuentran 2 jugadores, y revisar la reaparición del versus: `npm run medir`.
- **Objetos que sueltan los enemigos, daño de las trampas y arenas del versus:** `js/datos/partida.js` (SUELTAN, TRAMPAS_A_ENEMIGOS, arenaVersus).
- **Zonas, rutas de personaje y secretos de cada mapa:** al final de cada `js/mapas/*.js` (`zonas`, `rutas`, `secretos`). Pared falsa = `F`.
- **Tiempo meta de la medalla RÁPIDO:** `tiempoMeta` de cada sector en `js/datos/campana.js` (provisorios).
- **Borrar el avance de la campaña:** en la consola (F12) `DM.Progreso.borrar()`.

## Android y publicación

- APK sin terminal: `docs/ANDROID.md` (el proyecto de Android Studio ya viene en `android/`).
- GitHub Pages: `docs/GITHUB-PAGES.md`.

## Depurar (consola del navegador, F12)

```js
DM.juego.ir(1, 12.5, 12.5, 0)    // piso, x, y, ángulo
DM.juego.mundo.aparecerEnemigo('guardian')
DM.raycaster.calidad = 'media'
DM.juego.A.soloCampana('s5')     // ir directo a un sector
DM.Progreso.borrar()             // volver a bloquear la campaña
```

## Límites conocidos

- Por las rejillas del piso se ven el piso y los sprites del otro piso, pero no sus paredes.
- El versus no tiene bots: en solo se juega PRÁCTICA (arena con zombis y drones).
- Sin servidor TURN, algunas redes muy cerradas no logran conectarse.
