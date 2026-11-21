# DuMulti v1.0

Shooter en primera persona multijugador (hasta 8 jugadores) en el universo de **Worodorox 3073**, con estética 32 bits "Alarma neón". Corre en el navegador (PC y celular) y como APK de Android.

## Cómo jugar (sin terminal)

1. Descomprime el `.zip`.
2. **Doble clic en `index.html`** (Chrome o Edge recomendados).
3. JUGAR SOLO → COOPERATIVO o PRÁCTICA, o MULTIJUGADOR → CREAR SALA / UNIRSE.

> Para el **multijugador por internet** el juego debe estar publicado (GitHub Pages, ver `docs/GITHUB-PAGES.md`) o servido con un servidor local (VS Code → extensión *Live Server* → clic derecho en `index.html` → *Open with Live Server*). Con doble clic funciona todo el juego solo; la red puede no conectar desde un archivo local.

### Probar la red en un solo computador
Abre dos pestañas con `index.html?red=local` (con Live Server: `http://127.0.0.1:5500/index.html?red=local`). En una: CREAR SALA. En la otra: UNIRSE con el código de 4 cifras.

### Jugar por internet
El anfitrión (idealmente en un PC con buena conexión) crea la sala y comparte el código. Los demás entran con UNIRSE. La configuración la elige el anfitrión y todos la ven en vivo. Si alguien no logra conectarse (datos móviles, redes de colegios), hay que agregar un servidor TURN en `js/red/config_red.js`.

## Controles

| Acción | PC | Táctil |
|---|---|---|
| Moverse | WASD (Shift corre) | Joystick izquierdo (al borde corre) |
| Mirar | Mouse | Deslizar en la mitad derecha |
| Disparar / golpear | Clic izquierdo | DISPARO |
| Armas | 1–4 y rueda | ARMA |
| Lanzable / elegir lanzable | G o clic derecho / Q | LANZAR / ↻ |
| Recargar | R (también automática) | automática |
| Usar, leer, revivir | E (mantener para revivir o sostener un interruptor) | USAR |
| Marcador | Tab | TAB |
| Pausa / silencio | Esc / M | II / ♫ |
| FPS / calidad | P / C | — |

## Qué incluye

- **Cooperativo** "Sector criogénico 4" (24×24, 2 pisos): 8 oleadas desde las cápsulas hacia la sala central, robot guardián al final, caer y revivir, estaciones de respaldo, 3 reimpresiones del equipo, premios en momentos clave y el desintegrador en la oleada final.
- **Versus** "Sala del reactor" (24×24, 2 pisos, simétrica): todos contra todos o por equipos Cian/Amarillo, fuego amigo (no / sí / solo explosivos), bajas y tiempo, muerte súbita, puntaje completo, disponibilidad de cada arma, objeto, premio, enemigo y trampa, configuraciones rápidas y una propia guardada.
- **8 personajes** con puños, arma de contacto, arma a distancia y ventaja propias.
- **7 armas pesadas + desintegrador**, **5 lanzables**, **5 enemigos**, **9 tipos de trampas** e interruptores de sala.
- **Registros de la nave** (comunicados, cartas, reportes) con ARCHIVO en la pausa; en cooperativo se comparten.
- **Sonido**: efectos posicionales generados con código, música desde `assets/musica/` (si falta un MP3, suena una pista generada), volumen de música y efectos por separado, silencio.

## Música

Copia los 4 MP3 (128 kbps) en `assets/musica/` con estos nombres: `monume.mp3`, `kulakovka.mp3`, `atlasaudio.mp3`, `alex-morgan.mp3`.

## Arquitectura

```
js/
├── config.js            constantes, paleta, códigos de casillas
├── datos/               personajes, armas, enemigos y objetos, registros, configuración de partida
├── mapas/               sector4.js (cooperativo), reactor.js (versus)
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
- **Oleadas y configuraciones rápidas:** `js/datos/partida.js`.
- **Textos de los registros:** `js/datos/registros.js`.
- **Mapas:** `js/mapas/*.js` (la leyenda está al inicio de `sector4.js`). Después de cambiarlos, valida con `npm run validar` (o desde el panel NPM SCRIPTS de VS Code).

## Android y publicación

- APK sin terminal: `docs/ANDROID.md` (el proyecto de Android Studio ya viene en `android/`).
- GitHub Pages: `docs/GITHUB-PAGES.md`.

## Depurar (consola del navegador, F12)

```js
DM.juego.ir(1, 12.5, 12.5, 0)    // piso, x, y, ángulo
DM.juego.mundo.aparecerEnemigo('guardian')
DM.raycaster.calidad = 'media'
```

## Límites conocidos

- Por las rejillas del piso se ven el piso y los sprites del otro piso, pero no sus paredes.
- El versus no tiene bots: en solo se juega PRÁCTICA (arena con zombis y drones).
- Sin servidor TURN, algunas redes muy cerradas no logran conectarse.
