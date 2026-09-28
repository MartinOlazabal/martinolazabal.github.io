# Cómo funciona el sitio

Esta guía sirve para estudiar el código en orden. Cada archivo tiene además comentarios línea por línea; acá está el panorama general.

## 1. El recorrido de una visita

```
Navegador pide index.html
        │
        ├── carga css/estilos.css          → la página ya "se ve", pero la galería está vacía
        └── carga js/main.js (módulo)
                │
                ├── datos.js: fetch("data/modelos.json")  ┐
                ├── datos.js: fetch("data/sitio.json")    ┘ en paralelo (Promise.all)
                │
                ├── galeria.js: crea una tarjeta por pieza usando <template>
                ├── galeria.js: crea los botones de filtro
                ├── detalle.js: se queda escuchando cambios en la URL (#/pieza/...)
                └── main.js: completa los números de la portada y el contacto
```

Idea clave: **el HTML no tiene ninguna pieza escrita a mano**. Todo sale de `data/modelos.json`. Si agregás una pieza al JSON, aparece en la galería, en los filtros, en los contadores y en la navegación, sin tocar el HTML.

## 2. Por qué un JSON (y qué tiene que ver con el backend)

`data/modelos.json` cumple el papel de una API: el frontend le pide datos y los muestra. Hoy es un archivo fijo; más adelante va a ser una URL de tu propio servidor (FastAPI) que lea de una base de datos.

Lo importante es que **solo `js/datos.js` sabe de dónde vienen los datos**. Cuando llegue la API, se cambia ese archivo y nada más. A esto se le llama *separación de responsabilidades*.

### Formato de cada pieza

```jsonc
{
  "id": "porta-credenciales",        // se usa en la URL y en la carpeta media/
  "carpeta": "porta credenciales",   // nombre de la carpeta de fotos originales
  "nombre": "Porta credenciales",
  "categoria": "Accesorios",         // los filtros se arman solos con esto
  "resumen": "...",                  // una línea, para la tarjeta
  "descripcion": "...",              // texto largo; "\n\n" separa párrafos
  "destacado": "Más de 200 vendidos",// etiqueta roja (o null)
  "ficha": {                         // los campos en null NO se muestran
    "material": null,
    "herramienta": null,
    "tiempoImpresion": null,
    "medidas": null
  },
  "fotos": ["img_0054", "img_0052"], // la PRIMERA es la portada. Reordená para cambiarla.
  "fotosExcluidas": [],              // fotos de la carpeta que no querés publicar
  "ocultar": {                       // zonas a difuminar: { "foto": [[x1, y1, x2, y2]] }
    "img_0093": [[1600, 1930, 1980, 2130]]
  },
  "video": "video.mp4"               // lo completa el script (o null)
}
```

> JSON no admite comentarios: el bloque de arriba es solo para explicar. En el archivo real no puede haber `//`.

Para completar la ficha, poné el valor como texto, por ejemplo `"material": "PLA"` o `"tiempoImpresion": "4 h 30 min"`.

## 3. La vista de detalle y la URL

Cada tarjeta es un link común: `<a href="#/pieza/porta-credenciales">`. Al hacer clic cambia el *hash* de la URL (lo que va después del `#`) y el navegador dispara el evento `hashchange`. `detalle.js` lo escucha, lee el id y abre el `<dialog>` con esa pieza.

Así:

- podés compartir un link directo a una pieza;
- el botón **Atrás** del navegador cierra la pieza;
- recargar la página deja la misma pieza abierta.

Esto es un *router* en miniatura. React Router, Vue Router y compañía hacen lo mismo con más funciones.

## 4. Conceptos de JavaScript que aparecen (para buscar y estudiar)

| Concepto | Dónde verlo |
| --- | --- |
| Módulos (`import` / `export`) | todos los archivos de `js/` |
| `async` / `await` y `fetch` | `datos.js` → `pedirJSON` |
| `Promise.all` | `main.js` → `iniciar` |
| `try` / `catch` | `main.js` → `iniciar` |
| `<template>` y `cloneNode` | `galeria.js` → `crearTarjeta` |
| `textContent` vs `innerHTML` (seguridad) | `galeria.js` |
| Métodos de arrays: `map`, `filter`, `find`, `reduce` | `galeria.js`, `main.js` |
| `Set` para eliminar repetidos | `galeria.js` → `iniciarFiltros` |
| Delegación de eventos y `closest` | `galeria.js`, `detalle.js` |
| Desestructuración `const [a, b] = lista` | `galeria.js`, `main.js` |
| Operadores `??` y `?.` | `detalle.js` |
| Expresiones regulares | `detalle.js` → `idDesdeUrl` |
| `history.back`, `replaceState`, `location.replace` | `detalle.js` |
| `<dialog>` y `showModal` | `index.html`, `detalle.js` |

## 5. Conceptos de CSS

| Concepto | Dónde verlo |
| --- | --- |
| Variables (`--acento`) | sección 2 de `estilos.css` |
| Grid con `auto-fill` y `minmax` | `.galeria` |
| `clamp()` para tamaños fluidos | `.titular`, `--margen` |
| `position: sticky` | `.encabezado` |
| Gradientes como dibujo (grilla, regla) | `body`, `.regla` |
| `background-clip: text` | `.titular__capas` |
| Animaciones con `@keyframes` y `steps()` | sección 11 |
| `prefers-reduced-motion` | sección 11 |
| Media queries (responsive) | sección 12 |
| `:has()` | `html:has(dialog[open])` |
| BEM para nombrar clases | todo el archivo |

## 6. El script de fotos

`scripts/procesar_fotos.py` es el primer pedacito de "backend": corre en tu compu, no en el navegador. Hace tres cosas:

1. **Achica** cada foto a dos tamaños `.webp` (1600 px y 640 px). En total, las fotos pasaron de 170 MB a menos de 9 MB.
2. **Borra los metadatos EXIF**, que en las fotos del celular incluyen la ubicación GPS.
3. **Actualiza `modelos.json`** sin pisar lo que editaste a mano: solo agrega piezas nuevas y actualiza la lista de fotos.

Es *incremental*: si una foto ya fue procesada y no cambió, la saltea.

## 7. Publicar en GitHub Pages

1. Subí los cambios (`git push`).
2. En GitHub, entrá a **Settings → Pages**.
3. En *Build and deployment*, elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. En uno o dos minutos el sitio queda publicado.

La dirección depende del nombre del repositorio:

- Si se llama `MartinOlazabal.github.io` (tu usuario + `.github.io`), el sitio queda en la raíz: `https://martinolazabal.github.io`.
- Con cualquier otro nombre, queda en una subcarpeta: `https://martinolazabal.github.io/nombre-del-repo/`.

El sitio funciona igual en los dos casos porque todas las rutas son **relativas** (`css/estilos.css`, no `/css/estilos.css`).

El archivo vacío `.nojekyll` le avisa a GitHub que no procese el sitio con Jekyll (su generador de sitios), porque no lo usamos: publica los archivos tal cual.
