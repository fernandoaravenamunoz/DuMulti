# Compilar el APK con Android Studio (sin terminal)

El proyecto de Android **ya viene generado** en la carpeta `android/` (con Capacitor), y la pieza de Capacitor que necesita está en `node_modules/@capacitor/android/`. No hay que instalar Node ni escribir comandos.

## La primera vez

1. Instala **Android Studio** (developer.android.com/studio) con las opciones por defecto.
2. Abre Android Studio → **Open** → elige la carpeta **`android`** que está dentro de `dumulti` (no la carpeta `dumulti` completa).
3. Espera a que termine **Gradle Sync** (barra de abajo). La primera vez descarga varias cosas y puede tardar 5–15 minutos. Si te pregunta por *Trust project*, elige **Trust**.
4. Si aparece un aviso de que falta un SDK o una versión de Gradle, haz clic en el enlace azul del aviso (*Install…* / *Upgrade…*) y acepta.

## Generar el APK

1. Menú **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
2. Cuando termine, aparece un aviso abajo a la derecha: clic en **locate**.
3. El archivo es `app-debug.apk`. Cópialo al celular (cable, Drive o WhatsApp a ti mismo) y ábrelo. Android pedirá permitir "instalar apps de origen desconocido".

Para probar directo en un celular conectado por USB (con *Depuración USB* activada en las opciones de desarrollador): elige el celular arriba y presiona el botón verde ▶ **Run**.

## Cuando cambies el juego

El APK lleva una copia del juego en `android/app/src/main/assets/public/`. Después de editar archivos en `dumulti/`, actualiza esa copia de una de estas formas:

- **Con el explorador de archivos (sin instalar nada):** copia `index.html` y las carpetas `css`, `js` y `assets` desde `dumulti/` hacia `android/app/src/main/assets/public/`, reemplazando lo que haya.
- **Con doble clic (Windows, requiere Node.js):** `ACTUALIZAR-ANDROID.cmd`.
- **Con VS Code:** panel *NPM SCRIPTS* → `android:copiar` → ▶.

Luego, en Android Studio: **Build → Build APK(s)** otra vez.

## Datos útiles

- Nombre de la app: `DuMulti`. Identificador: `cl.orbitamatematica.dumulti` (en `capacitor.config.json` y `android/app/build.gradle`).
- La app se abre siempre en **horizontal** (`android:screenOrientation="sensorLandscape"` en el `AndroidManifest.xml`).
- Ícono: clic derecho en `app/res` → **New → Image Asset** para reemplazar el ícono por defecto.
- Para publicar en Google Play hace falta un APK/AAB **firmado**: Build → Generate Signed App Bundle / APK (Android Studio te guía para crear la llave; guárdala bien).

## Música en el APK

El APK usa la copia que está en `android/app/src/main/assets/public/`. Después de poner los MP3 en `dumulti/assets/musica/`, cópialos también a `android/app/src/main/assets/public/assets/musica/` (o usa `ACTUALIZAR-ANDROID.cmd`) y vuelve a compilar. En Android los nombres distinguen mayúsculas: `monume.mp3` no es lo mismo que `Monume.MP3`.
