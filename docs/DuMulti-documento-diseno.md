# DuMulti — Documento de diseño (v0.1)

> Shooter en primera persona multijugador online, inspirado en Doom, Wolfenstein 3D y Worodorox 3073.
> Estado: **versión 1.2 programada (fases 1 a 7, campaña de 5 sectores y mejoras de jugabilidad)**. Última actualización: 21-11-2026.

---

## 1. Resumen

| Aspecto | Definición |
|---|---|
| Género | Shooter en primera persona (raycaster tipo Wolfenstein, con elementos de Doom) |
| Universo | El mismo de Worodorox 3073 (nave cyberpunk) |
| Estética | 32 bits, dirección visual **"D · Alarma neón"** |
| Modos | Campaña de 5 sectores (solo o cooperativo), Supervivencia (oleadas) y Versus (todos contra todos o por equipos) |
| Jugadores | Hasta **8** por partida online |
| Plataformas | PC (navegador, GitHub Pages) y Android (APK con Capacitor) |
| Tecnología | JavaScript puro, sin imágenes externas (todo dibujado con código), PeerJS para la red |
| Versión 1.2 | 4 mapas de campaña + 2 arenas versus: chica (2–4 jugadores) y reactor (5–8, también sector 4) |

---

## 2. Historia y contexto

- Ocurre en la nave de **Worodorox 3073**: un criadero de humanos en criogenia (la fuente energética del futuro) que estalló.
- Tras la explosión, **los demás criogenizados despiertan enfermos**, como zombis: piel helada, sin habla, caminan hacia el calor.
- Los **robots de vigilancia** siguen activos con orden de neutralizar todo movimiento en los sectores afectados, tripulación incluida. Atacan a zombis y a humanos por igual.
- Los sobrevivientes buscan llegar a la nave salvavidas rumbo a **Temukeitor**, el último reducto donde los humanos viven en paz.
  - **Cooperativo:** se unen para limpiar sectores.
  - **Versus:** pelean entre ellos por los pocos recursos.
- La historia se cuenta mediante **registros de la nave** (ver sección 11).
- Idea pendiente: que los personajes de DuMulti sean *otro grupo* de sobrevivientes y que los de Worodorox (Chispa, Tuerca, etc.) aparezcan mencionados en algún registro.

---

## 3. Estética — "D · Alarma neón"

Toma la **escena de "Óxido y alarma"** (nave dañada, alarmas, compuertas de peligro, fugas en el piso, inspirada en Doom) con la **paleta exacta de Worodorox 3073**.

- Resolución interna **480×270** (16:9), escalada a la pantalla.
- Texturas de **64×64**, sprites con más detalle que Worodorox.
- Escenarios inspirados en Doom (zonas dañadas, fugas, barriles, luces que parpadean) y en Wolfenstein (pasillos rectos, salas cuadradas, puertas corredizas, paneles ordenados).
- Niebla de distancia y luces de neón que brillan en la oscuridad.
- Referencia visual: canvas "DuMulti — Propuestas estéticas" → https://claude.ai/artifact/6aAwTi4gSLs38vvHiKzr8S

### Paleta y código de color (igual que Worodorox)

| Color | Hex | Significado |
|---|---|---|
| Fondo | `#07060D` | Oscuridad de la nave |
| Metal 1 / 2 / 3 | `#16151F` / `#2A2A3C` / `#3A3A52` | Estructura |
| Remache | `#7A828D` | Detalles metálicos |
| Cian | `#22E4FF` (osc. `#0F5A6B`, claro `#C8FBFF`) | Información, ayuda, pantallas |
| Magenta | `#FF2BD6` (osc. `#7A1466`, claro `#FFD0F5`) | Peligro: siempre hace daño |
| Rojo | `#FF3B3B` (osc. `#6B1010`) | Enemigos (ojos rojos) y alarmas |
| Amarillo | `#E8B923` / `#FFD34A` | Objetos, munición |
| Verde | `#4DFF8A` | Éxito, salida |
| Blanco / gris | `#E6E3FF` / `#8D93AD` / `#4A4F63` | Textos y neutros |

En el **modo por equipos**, los equipos son **Cian** y **Amarillo**. No se usan el rojo ni el magenta, para no confundirlos con enemigos y peligro.

### HUD
- Barra inferior tipo Doom con marco metálico y borde magenta, con el retrato del personaje al centro.
- Vida en rojo, escudo en cian, munición en amarillo, bajas en blanco.
- Arriba: oleada actual (cooperativo) o marcador (versus). Registro de bajas arriba a la derecha.
- Aviso "[E] LEER" en cian junto a los registros.

---

## 4. Plataformas y controles

- **PC:** WASD + mouse (Pointer Lock), teclas 1–4 para armas, botón aparte para lanzables, E para usar/leer, M para silenciar.
- **Android:** joystick a la izquierda, deslizar para apuntar, botones de disparo, cambio de arma, lanzable, usar y pausa.
- Se reutiliza el sistema de entrada de Worodorox (`input.js`).
- **Control USB o Bluetooth (v1.2):** stick izquierdo mueve, derecho mira, RT dispara, LT lanza, A usa, X recarga, LB/RB cambian arma, Y elige lanzable, cruceta arriba ping, abajo mapa, View marcador, Start pausa. En menús: cruceta o stick, A acepta, B vuelve. Usa la ayuda de puntería del celular. Sensibilidad y zona muerta en OPCIONES; botones y velocidades en `js/datos/mando.js`. Un control por computador (no hay pantalla dividida).
- **Compilación del APK desde Android Studio, sin usar la terminal.**

---

## 5. Modos de juego

### 5.1 Cooperativo
- Un mapa con **oleadas** cada vez más difíciles (p. ej., 8). La oleada final trae al **robot guardián**.
- Se puede **revivir** a un compañero caído.
- Las oleadas convergen hacia una sala central.
- El equipo gana si sobrevive a todas las oleadas.
- **Fuego amigo:** opción seleccionable, desactivado por defecto.

### 5.2 Versus — configuración de partida
La configura el anfitrión en la sala de espera; los demás ven los cambios en vivo.

**Modo**
- Todos contra todos.
- Por equipos: 2 equipos (Cian y Amarillo), asignación automática balanceada o elegida por cada jugador.

**Fuego amigo** (seleccionable, en versus por equipos y en cooperativo)
- *Desactivado* (por defecto): no daña a compañeros.
- *Activado:* daña a compañeros; matar a uno resta 1 baja.
- *Solo explosivos:* las balas no dañan a compañeros; granadas y minas sí.

**Condición de victoria**
- Bajas para ganar: 5, 10, 15, 20, 30, 50 o sin límite (en equipos se suman).
- Duración: 3, 5, 10, 15, 20 minutos o sin límite.
- Gana quien llegue primero a la meta o vaya arriba al acabarse el tiempo. Si hay empate, **muerte súbita**: la siguiente baja decide.

**Puntaje**

| Situación | Puntos |
|---|---|
| Matar a un rival | +1 |
| Matarse a uno mismo (granada o mina propia, caída, trampa que nadie activó) | **−1** |
| Matar a un compañero con fuego amigo | −1 |
| Morir por zombi o robot | 0 (opción: −1) |
| Rival muerto en trampa activada por ti con interruptor | +1 para quien la activó |

**Disponibilidad** (cada elemento se activa o desactiva por separado)
- Armas del mapa: cuáles aparecen.
- Opción **"Solo armas de personaje"** (sin armas del mapa).
- Objetos: elixires, escudos, granadas, minas, bengalas, EMP, torretas, y cada premio mayor por separado. Rapidez de reaparición: rápida, normal o lenta.
- Enemigos: cada tipo por separado (lento, corredor, hinchado, dron, guardián) y cantidad (pocos, normal, muchos).
- Trampas: encendidas o apagadas; interruptores permitidos o no.
- Asistencia de puntería: activada o desactivada.

**Reaparición**
- Espera de 0, 3 o 5 segundos.
- 2 segundos de protección al reaparecer.

**Configuraciones rápidas**
- *Clásico:* todos contra todos, 15 bajas, 10 min, sin enemigos.
- *Duelo limpio:* solo armas de personaje, sin premios mayores ni trampas.
- *Caos total:* todo activado, muchos zombis.
- *Equipos:* 2 equipos, 30 bajas por equipo, fuego amigo desactivado.
- El anfitrión puede guardar una configuración propia.

---

## 6. Personajes

8 personajes jugables. **Nombres propuestos, pendientes de confirmar** (nombres inventados, "cualquier lesera").

### Lo que tienen todos
- **Puños:** golpe rápido de poco daño que empuja un poco. Siempre disponibles.
- **Arma de contacto propia** con un efecto especial.
- **Arma a distancia básica propia:** munición infinita con recarga; más débil que las armas del mapa.
- Vida base 100 (equivalente a la vida 10 de Worodorox, escalada).

| Personaje (nombre anterior) | Contacto | Distancia | Ventaja |
|---|---|---|---|
| **Pirulo Zas** (Chispa) | Manopla de chispas (aturde 0,5 s) | Resortera | Activa interruptores de trampas a distancia |
| **Gargolfo** (Tuerca) | Fierro (golpe fuerte) | Honda de tuercas (lenta y pesada) | Derriba rejillas y hace más daño a los robots |
| **Tía Chucrut** (Doña Lata) | Sartén (bloquea disparos de frente) | Tapas de lata (rebotan una vez) | Más vida (+20 %) |
| **Fideo Turbo** (Flaco Neón) | Espátula afilada (rápida) | Tenedores (ráfaga de 3) | Corre más rápido |
| **Ñoquimbo** (Varilla) | Palo (mayor alcance) | Cerbatana de dardos (precisa, largo alcance) | Ve las trampas cercanas a través de las paredes |
| **Pantuflina** *(nueva)* | Llave criogénica (ralentiza) | Ampollas de refrigerante (salpicadura en área pequeña) | Técnica de criogenia que despertó sana: resiste el gas y revive más rápido |
| **Cachureo** *(nueva)* | Destornillador eléctrico (doble daño a robots) | Lanzador de pernos (cadencia alta) | Mecánica de drones: los robots tardan más en detectarla |
| **Mostachón** *(nuevo)* | Porra de seguridad (aturde 1 s) | Aturdidor de dardos (paraliza 1 s, poco daño) | Exguardia de seguridad: empieza con 25 de escudo |

Nombres de repuesto: Calcetín Furioso, Tortilla Láser, Wiripipi, Grumo, Pantuflo, Zapallito, Bombín, Mermelada.

---

## 7. Armas del mapa y lanzables

Las armas pesadas **aparecen como objetos** en el mapa, con munición limitada. Cuando se acaba la munición, el jugador vuelve a su arma propia. Si recoges otra arma pesada, reemplaza a la que tenías y la anterior queda en el suelo.

### Armas pesadas
| Arma | Tipo | Efecto |
|---|---|---|
| Pistola de clavos | Instantáneo | Cadencia alta, dispersión pequeña |
| Ballesta de varillas | Proyectil | La varilla atraviesa hasta 2 enemigos en línea |
| Escopeta de remaches | Instantáneo | 7 perdigones, devastadora de cerca |
| Soplete de plasma | Cono corto continuo | Quema, pero **atrae a los zombis** por el calor |
| Rociador criogénico | Cono corto | Congela y ralentiza a rivales y robots; **no afecta a zombis** |
| Láser de dron | Instantáneo con carga | 1 s de carga con rayo de aviso; disparo largo que rebota una vez en metal |
| Cañón de plasma | Proyectil rápido | Daño en área pequeña; escaso |

### Arma suprema (una por mapa)
- **Desintegrador del reactor:** se carga 2 s y destruye todo lo que está en el campo de visión. Trae un solo disparo, aparece en el lugar más peligroso del mapa y su aparición se anuncia a todos.

### Lanzables (botón aparte)
| Lanzable | Efecto |
|---|---|
| Granada | Arco, rebota, explota a los 2 s, radio de 2 casillas |
| Mina antipersonal | Explota al pisarla, radio de 1,5 casillas; en versus también hiere a quien la puso |
| Bengala térmica | Sin daño; atrae a los zombis hacia donde cae durante 8 s |
| Disruptor EMP | Apaga robots y trampas 5 s; en versus apaga 3 s el HUD de quienes alcanza |
| Torreta portátil | Dispara sola 20 s; se puede destruir |

### Teclas / botones de arma
1. Puños
2. Arma de contacto propia
3. Arma a distancia propia
4. Arma pesada recogida

El botón de lanzables va aparte.

### Propuesta para la primera versión
Armas propias de los 8 personajes, más: pistola de clavos, escopeta de remaches, ballesta, soplete, granada, mina y bengala. El resto se agrega después.

---

## 8. Sistema de ataque y aciertos

Un ataque acierta solo si cumple **tres condiciones**:
1. **Línea de visión:** un rayo desde el jugador. Las paredes y puertas cerradas lo detienen; las **rejillas y ventanas lo dejan pasar** (permiten disparar entre pisos).
2. **Alcance:** cada arma tiene una distancia máxima; algunas pierden daño con la distancia.
3. **Puntería:** el rayo debe pasar por la **caja de impacto** del objetivo, un cilindro alrededor del cuerpo. La altura cuenta, porque se puede mirar arriba y abajo.

| Tipo | Funcionamiento |
|---|---|
| Cuerpo a cuerpo | Cono corto al frente |
| Instantáneo | El rayo llega al instante |
| Proyectil | La bala viaja y se puede esquivar |
| Lanzado | Arco, rebote, explosión en área |

### Valores iniciales (1 casilla = 1 bloque del mapa)
| Arma | Alcance | Dispersión / detalle |
|---|---|---|
| Puños y armas de contacto | 1–2 casillas | Cono de ±25° |
| Pistola de clavos | 20 | Pequeña; pierde daño desde las 8 casillas |
| Escopeta de remaches | 6 | Ancha, 7 perdigones |
| Ballesta | 15 | Ninguna |
| Cañón de plasma | 25 | Área pequeña |
| Granada | ~8 de lanzamiento | Radio 2 |

- **Explosiones:** el daño baja con la distancia al centro, y una pared en medio protege.
- **Asistencia de puntería:** ayuda leve en altura, como Doom. Más fuerte en el celular que en PC. En versus se puede desactivar.
- **Compensación de retraso:** el anfitrión decide los aciertos y "retrocede" las posiciones ~100–150 ms para evaluar cada disparo como lo vio quien disparó.
- Todos los valores quedan en un archivo de configuración para ajustarlos al probar.

---

## 9. Enemigos

| Enemigo | Tipo | Comportamiento |
|---|---|---|
| Criogenizado lento | Zombi | Llega en grupo y golpea de cerca (< 1 casilla) |
| Criogenizado corredor | Zombi | Rápido y frágil, ataca por los flancos |
| Criogenizado hinchado | Zombi | Explota con gas tóxico al morir |
| Dron centinela | Robot | Vuela; apunta con un rayo de aviso y luego dispara láser |
| Robot guardián | Robot | Lento y blindado; lanza proyectiles lentos que se pueden esquivar |

- Los zombis **son atraídos por el calor** (soplete, bengala) y son inmunes al frío (rociador criogénico).
- Los robots atacan a todos, zombis incluidos.

---

## 10. Objetos

### Normales
| Objeto | Efecto |
|---|---|
| Elixir de salud pequeño / grande | +25 / +50 de vida |
| Chaleco / blindaje | Escudo que absorbe parte del daño |

### Premios mayores (escasos, con brillo y sonido propios)
| Premio | Efecto |
|---|---|
| **Núcleo criogénico** (modo dios) | Invulnerable 15 s; pantalla teñida de celeste y aviso al acabarse |
| **Elixir total** | Vida al máximo y elimina el veneno del gas |
| **Blindaje total** | Escudo al máximo |

**Reglas:**
- Cooperativo: aparecen en momentos clave. Solo un jugador puede tener el núcleo a la vez.
- Versus: aparecen en el centro o en zonas con trampas. Al tomarlos se anuncia a todos ("¡X TIENE EL NÚCLEO!"); quien está en modo dios brilla y se ve a través de las paredes cercanas. Reaparecen cada 60–90 s con aviso previo. Se pueden desactivar.
- El modo dios **no protege** de caídas al vacío ni del aplastamiento.

---

## 11. Registros de la nave (historia)

Notas y mensajes repartidos por el escenario que explican lo ocurrido.

| Formato | Dónde aparece | Estilo |
|---|---|---|
| Comunicados generales | Pantallas de pared | Terminal cian |
| Cartas de la tripulación | Hojas sueltas en el piso | Papel claro, texto oscuro |
| Reportes de seguridad | Terminales | Encabezado rojo, "confidencial" en magenta |

- Se leen con **[E]** o el botón USAR. **No pausan** la partida en multijugador.
- Quedan guardados en el **ARCHIVO** del menú de pausa (como la libreta de Worodorox).
- En cooperativo, lo que lee uno se agrega al archivo de todos.
- Algunos dan **pistas**: códigos de puertas en secuencia, horarios de trampas, ubicación de premios mayores.
- En orden cuentan: falla → despertar → contención → caída de la nave → fuga a Temukeitor.
- Textos de ejemplo en el canvas (comunicado del bloque 4, carta de Teo a Mara, reporte de seguridad 0417). Los nombres y cifras son provisorios.
- Más adelante podrían agregarse grabaciones de voz.

---

## 12. Trampas

Todas **avisan antes de activarse**. Funcionan con el reloj de la partida, así que se ven sincronizadas en todas las pantallas sin gastar red.

### Heredadas de Worodorox 3073
| Trampa | Ciclo / efecto |
|---|---|
| Rayos láser | Apagado → rayos tenues de aviso → activo |
| Piso electrificado | Chispas de aviso → descarga |
| Aplastador | Franjas rojas → la casilla se cierra de golpe |
| Gas tóxico | Burbujas y siseo → nube intermitente |
| Descompresión | Ventilas que empujan en una dirección |
| Baldosas con símbolo | Solo es seguro el símbolo indicado por una pista |

### Nuevas
- **Focos de radiación:** luces que barren la sala y quitan vida mientras estés en el haz; parpadean antes de encenderse.
- **Puertas en secuencia:** se abren y cierran en orden (1→2→3…); hay que avanzar al ritmo.
- **Interruptores de sala:** encienden o apagan las trampas de una zona. En cooperativo, uno mantiene el panel mientras los demás cruzan; en versus, se activan contra rivales.

### Reglas
- Afectan a jugadores, zombis y robots (los drones flotan, así que el piso eléctrico no los afecta).
- Las bajas por trampa activada con interruptor cuentan para quien la activó.

---

## 13. Mapas

- **Pequeños**, para favorecer los encuentros entre jugadores.
  - Arena versus: ~24×24 casillas, nadie camina más de 15–20 s sin cruzarse con alguien.
  - Mapa cooperativo: algo mayor; las oleadas convergen a una sala central.
- **Dos o más pisos** mediante **pisos conectados**: cada piso es un plano propio, unidos por escaleras, ascensores o ductos, con rejillas y ventanas para ver y disparar al piso de abajo. (El motor tipo Wolfenstein no dibuja un piso sobre otro en la misma vista.)
- Zonas temáticas posibles: cápsulas criogénicas (origen de los zombis), pasillos de neón y sala del reactor (combate final / arena).
- Diseño pensado para las trampas y los premios mayores (lugares de riesgo).

### Campaña (v1.1)

Cinco sectores que siguen la historia, de la criogenia al hangar. Se juegan solo o en cooperativo; cada uno se desbloquea al superar el anterior y el avance se guarda en el dispositivo (en red cuenta el avance del anfitrión, y al ganar todos guardan el sector).

| Sector | Mapa | Fases |
|---|---|---|
| 1 Bloque criogénico | sector4 | 4 oleadas → salida (escotilla del reactor) |
| 2 Pasarelas industriales | pasarelas | activar 3 consolas → salida (montacargas del este) |
| 3 Laboratorios de seguridad | laboratorios | 5 oleadas con drones → salida (esclusa) |
| 4 Núcleo del reactor | reactor | jefe: robot guardián |
| 5 Hangar | hangar | encender la nave (consola de la torre) → resistir 60 s → subir a la nave en 45 s |

- **Fases** (en `js/datos/campana.js`): oleadas, activar consolas (O, mantener USAR), jefe, resistir y salida (todos sobre las casillas !).
- **Goteo:** durante las fases que no son de oleadas siguen llegando enemigos, con un máximo según la cantidad de jugadores.
- Reglas de caídos, revivir y 3 reimpresiones iguales que en el cooperativo.
- El sector 5 se pierde si se acaba el tiempo para subir a la nave.

---

## 14. Red (multijugador)

- **PeerJS (WebRTC)** con código de invitación, reutilizando el sistema de Worodorox (`transporte.js`, `config_red.js`).
- **Anfitrión autoritativo:** los clientes envían sus controles (compactos, idea tomada de Doom); el anfitrión simula y envía el estado a ~15–20 Hz.
- Hasta **8 jugadores**. El anfitrión debería jugar desde un PC con buena conexión.
- Modo de prueba local entre pestañas (BroadcastChannel).
- Servidores STUN incluidos; espacio para agregar un servidor TURN si alguien no logra conectarse.
- Se descartó el modelo de Doom (todos simulan lo mismo en sincronía) porque con 8 jugadores por internet el más lento frena a todos.

---

## 15. Sonido y música

### Efectos (generados con código, sin archivos)
Pasos (metal y charcos), cambio de arma, disparo de cada arma, recarga, recoger objeto, puerta corrediza, gemido de zombi, zumbido de dron, explosión, jugador herido o caído, bip de mina armada, avisos de trampas y de premios mayores.

### Música (Pixabay)
| Pista (autor) | Duración | Uso propuesto |
|---|---|---|
| monume | 1:17 | Menú y sala de espera |
| kulakovka | 2:16 | Cooperativo, oleadas normales |
| atlasaudio | 2:12 | Cooperativo, oleada final |
| alex-morgan | 2:50 | Versus |

- Se convertirán a 128 kbps (~8 MB en total).
- Pendiente: escucharlas y confirmar cuál va en la oleada final y cuál en versus.

### Volumen
- Menú de pausa con control de **música** y **efectos** por separado.
- Botón de **silencio** en pantalla (tecla M en PC, ícono en Android).
- Las preferencias quedan guardadas.

---

## 16. Créditos y licencias

- **Música:** las cuatro pistas son de Pixabay (Pixabay Content License). Se pueden usar en el juego sin atribución obligatoria, pero se dará crédito en la pantalla de créditos:
  > Música: monume · kulakovka · atlasaudio · alex-morgan (vía Pixabay)
  - No se permite distribuir las pistas como archivos de música sueltos (nada de "descarga el soundtrack").
  - Pendiente: nombres artísticos y títulos exactos de cada pista.
- **PeerJS:** licencia MIT (se incluye en `LICENCIAS-TERCEROS.md`).
- **Código fuente de Doom (GPL 2.0):** **solo como referencia de ideas**. No se copia código, porque obligaría a publicar todo el juego bajo GPL. Los gráficos y sonidos de Doom no se usan. Los archivos de red IPX revisados no aplican (DOS / IPX); para referencia futura sirven más `p_enemy.c` y `p_pspr.c`.

---

## 17. Fases de desarrollo

1. **Motor 32 bits:** raycaster mejorado (480×270), texturas y mapa de prueba.
2. **Combate y peligros:** puños y armas de personaje, armas del mapa, objetos, enemigos y trampas (un jugador).
3. **Mapa cooperativo** de 2 pisos con oleadas y registros de la nave.
4. **Red** para hasta 8 jugadores (cooperativo en línea).
5. **Versus:** arena, configuración completa de partida y equipos.
6. **Sonido:** efectos, música y control de volumen.
7. **Android y publicación:** controles táctiles, APK y GitHub Pages.

---

## 18. Decisiones tomadas al programar (v1.0, para revisar)

- **Rejillas entre pisos:** en los huecos se dibuja el piso de abajo (o el techo de arriba) con su luz, niebla y sprites; no se dibujan las paredes del otro piso. Las balas, granadas y proyectiles pasan por las rejillas al otro piso.
- **Revivir:** caído 20 s; un compañero mantiene USAR 3 s (Pantuflina revive al doble de rápido). Si nadie lo revive, reaparece en la estación de respaldo más cercana.
- **Derrota en cooperativo:** si caen todos a la vez, el equipo gasta una de sus **3 reimpresiones**; sin reimpresiones se pierde. (En solo, esto equivale a 3 vidas.)
- **Premios del cooperativo:** elixir total en la oleada 3, blindaje total en la 5, núcleo en la 7 y desintegrador en la 8.
- **Interruptores:** en cooperativo, mientras alguien mantiene USAR en el panel las trampas de su zona se apagan; en versus están apagadas y el panel las enciende 6 s (espera de 10 s), con la baja para quien lo activó.
- **Trampas en magenta** (láser, piso eléctrico, radiación) para respetar "todo lo magenta hace daño"; el gas sigue verde y el aplastador con franjas rojas, como en Worodorox.
- **Escudo:** absorbe 2/3 del daño. Sartén de Tía Chucrut: bloquea el 75 % de los golpes y balas de frente con el arma 2 en la mano.
- **Ventajas:** Gargolfo hace +50 % a robots y rompe rejillas a golpes; Pirulo usa interruptores desde 4 veces más lejos; Ñoquimbo ve las trampas a 7 casillas a través de las paredes; Cachureo tarda 1,5 s en ser detectada (en vez de 0,4 s).
- **Muerte en versus por una trampa o enemigo** después de que un rival te dañara (en los últimos 4 s): la baja es para ese rival.
- **Solo:** cooperativo completo o PRÁCTICA en la arena del versus con zombis y drones (no hay bots rivales).
- **Registros:** un registro menciona a Chispa, Tuerca y una señora con una lata, como otro grupo que huye (continuidad con Worodorox; se puede quitar en `js/datos/registros.js`).
- **Música faltante:** si un MP3 no está en `assets/musica/`, suena una pista synthwave generada.
- **Campaña (v1.1):** el JUGAR SOLO ofrece CAMPAÑA, SUPERVIVENCIA (las 8 oleadas de siempre) y PRÁCTICA. Los modos de la sala son CAMPAÑA, SUPERVIVENCIA y VERSUS.
- **Avance de la campaña:** se guarda por dispositivo; en red el anfitrión solo puede elegir sectores que ya desbloqueó.
- **Guía al objetivo:** flecha y distancia arriba de la pantalla; si el objetivo está en otro piso, se avisa. El mapa marca consolas y salida aunque no se hayan visto.
- **Jefe del sector 4:** su vida sube 50 % por cada jugador extra; el desintegrador aparece a los 20 s de pelea.
- **Música de la campaña:** pista de oleadas; la del final suena con el jefe, la última oleada de un sector y las dos últimas fases del hangar.

## 18b. Decisiones v1.2 (jugabilidad y versus)

**Versus**
- Dos arenas: **Cámara de pruebas** (20×20, 1 piso, 220 casillas libres, núcleo de reactor al centro y tuberías como cobertura) y **Sala del reactor**. ARENA: AUTO (chica con 4 jugadores o menos) / CHICA / GRANDE. PRÁCTICA usa AUTO.
- Reaparición a **distancia media**: un punto que ningún rival vivo vea y a 8–14 casillas de camino del rival más cercano. Al comenzar, cada uno aparece lo más lejos posible de los ya ubicados.
- Reactor: 16 rejillas nuevas (rompibles) en las salas de las esquinas, con vista de lado a lado en las filas 5 y 18. El núcleo del centro no se tocó (es la identidad de la arena y el lugar del jefe).
- Aviso de premios mayores y desintegrador: 10 s antes.
- **Disparar te delata** (SÍ por defecto): 2 s como punto rojo en el mapa de los rivales; los golpes y los conos de corto alcance (soplete, rociador) no delatan. Usa el evento de disparo que ya viaja por la red.

| Medición (`npm run medir`, 2 caminantes al azar) | Antes | v1.2 |
|---|---|---|
| Reaparición en el reactor: distancia media al rival | 38,8 casillas | 13 casillas (nunca a la vista) |
| Reactor: se ve del piso 1 | 12,8 % | 14,3 % |
| Reactor: primer contacto (mediana) | 5,6 s | 5–6 s (sin diferencia clara) |
| Arena chica: primer contacto (mediana / media) | — | 4,0 s / 6,8 s |

**Combate y ritmo**
- Marca de acierto en la mira (blanca; roja si es baja), destello del sprite golpeado y retroceso del enemigo según el daño (menos en robots y pesados). El indicador de dirección del daño ya existía.
- El zombi anticipa su golpe 0,3 s (pose de ataque y gruñido); si te alejas a tiempo, falla.
- Al morir, los enemigos sueltan elixir pequeño (15 % zombis, 30 % drones) y munición del arma pesada de quien los mató (20 %); el guardián siempre. Duran 20 s y parpadean los últimos 5. En versus, un rival que muere suelta además un elixir pequeño.
- Las trampas hacen el 40 % del daño a los enemigos. Sector 3 con un jugador quieto (suma de 4 partidas): antes eliminaban entre 14 % y 32 % de cada oleada; ahora entre 0 % y 9 %.

**Cooperativo y orientación**
- **Ping:** F, clic de la rueda o botón "!". Marca enemigo, objeto o lugar por 4 s (a través de las paredes, con distancia y en el mapa). Un ping por jugador, cada 1 s. En versus solo lo ve el propio equipo.
- **Rutas por personaje:** en cada mapa de campaña, una rejilla que solo Gargolfo rompe (con un premio detrás) y un panel lejano que solo Pirulo alcanza sin pisar láseres (en laboratorios, detrás de una compuerta de secuencia; apaga las baldosas).
- **Sector 2:** con 2 o más jugadores, las consolas de la sala NO y de la bodega SE avanzan solo si se mantienen a la vez.
- **Zonas** con nombre y color de luz en todos los mapas; el nombre aparece al entrar y queda en el mapa al visitarla.

**Rejugar y datos**
- Medallas por sector: SIN REIMPRESIONES, RÁPIDO (tiempos meta provisorios: 4:00, 3:30, 5:00, 3:00 y 4:00) y ARCHIVISTA (leer todos los registros del mapa). Se guardan sin borrar el avance anterior.
- 3 secretos por mapa de campaña (paredes falsas `F` que se abren con USAR y nichos tras la rejilla de Gargolfo), con un premio de una sola vez. Contador en los resultados.
- Registro de las últimas 30 partidas (modo, mapa, jugadores, tiempo por fase, caídas con posición y causa). OPCIONES → ESTADÍSTICAS: mapa de calor, causas, tiempo medio por fase, COPIAR (JSON) y BORRAR.

## 19. Pendientes por decidir

- [ ] Confirmar los nombres de los 8 personajes.
- [ ] Decidir si son un grupo distinto al de Worodorox (por ahora sí; ver registro t03).
- [ ] Nombre definitivo del juego (por ahora "DuMulti").
- [ ] Textos definitivos de los registros de la nave.
- [ ] Asignación final de pistas musicales y créditos exactos.
- [ ] Ajuste fino de daño, vida y cantidad de enemigos tras jugar en grupo.
- [ ] ¿Bots para el versus en solo?
- [ ] Ajustar la dificultad de cada sector de la campaña tras jugarla (cantidades en `js/datos/campana.js`).
- [ ] Confirmar los tiempos meta de la medalla RÁPIDO con partidas reales (usar ESTADÍSTICAS → COPIAR).
- [ ] Ver si el reactor necesita más cambios para pocos jugadores o si basta con la arena chica.
- [ ] El sector 4 (reactor) no tiene secretos para no romper la simetría del versus.
- [ ] Probar el control con un mando real y ajustar velocidad del stick y zona muerta (`js/datos/mando.js`).
