# Publicar DuMulti en GitHub Pages (sin terminal)

Con el juego publicado, cualquiera lo abre con un enlace (en PC o celular) y el **multijugador por internet** funciona, porque la página se sirve con `https`.

## Pasos

1. Entra a **github.com** e inicia sesión (o crea una cuenta gratis).
2. Botón **+** (arriba a la derecha) → **New repository**.
   - Nombre: `dumulti` · **Public** · *Create repository*.
3. En el repositorio vacío: enlace **uploading an existing file**.
4. Arrastra desde tu computador **el contenido** de la carpeta `dumulti` (no la carpeta misma): `index.html`, `css/`, `js/`, `assets/`, `docs/`, `README.md`, `LICENCIAS-TERCEROS.md`.
   - No hace falta subir `android/` ni `node_modules/` para la página (si los subes no pasa nada).
   - GitHub permite hasta 100 archivos por vez: si reclama, sube primero `js/` y luego el resto.
5. Abajo: **Commit changes**.
6. Ve a **Settings → Pages**. En *Build and deployment* → *Source*: **Deploy from a branch**; *Branch*: **main** y carpeta **/ (root)** → **Save**.
7. Espera 1–2 minutos y recarga: aparece el enlace, por ejemplo `https://TU-USUARIO.github.io/dumulti/`.

## Actualizar

Vuelve a **Add file → Upload files**, arrastra los archivos cambiados (reemplazan a los anteriores) y **Commit changes**. La página se actualiza sola en uno o dos minutos. Si ves la versión vieja, recarga con Ctrl+F5.

## Música

Si subes los MP3 a `assets/musica/`, quedan dentro del sitio (el juego no ofrece descargarlos). Revisa que cada archivo pese menos de 25 MB (límite de la subida web de GitHub).
