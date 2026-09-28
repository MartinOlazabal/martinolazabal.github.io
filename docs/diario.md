# Diario de aprendizaje

Una entrada por fase o por sesión de trabajo: qué hice, qué aprendí, qué me costó y qué quiero hacer después. Sirve para estudiar y para mostrar el proceso.

---

## Fase 1: sitio estático

**Qué se hizo**

- Estructura del sitio: HTML semántico, CSS separado y JavaScript en módulos.
- Catálogo de piezas en `data/modelos.json` como "backend de mentira".
- Script en Python para optimizar las fotos y generar el catálogo.
- Galería con filtros, vista de detalle con fotos y video, y links directos a cada pieza.
- Publicación en GitHub Pages.

**Para estudiar** (en este orden)

1. `index.html` completo, de arriba abajo.
2. `js/datos.js`: `fetch`, `async`/`await`.
3. `js/galeria.js`: `<template>`, `map`/`filter`, eventos.
4. `js/detalle.js`: el router con el hash de la URL.
5. `css/estilos.css`: las variables, el grid de la galería y las media queries.
6. `scripts/procesar_fotos.py`.

**Ejercicios para practicar**

- [ ] Completar la ficha técnica de una pieza en el JSON y ver cómo aparece sola en el detalle.
- [ ] Cambiar `--acento` en el CSS y ver cómo cambia todo el sitio.
- [ ] Agregar un campo nuevo (por ejemplo `"anio": 2025`) y mostrarlo en la ficha. Pista: `ROTULOS_FICHA` en `detalle.js`.
- [ ] Hacer que el filtro elegido quede en la URL (`#/categoria/Accesorios`).
- [ ] Agregar un buscador por nombre arriba de la galería.

**Lo que aprendí**

_(completar)_

**Lo que me costó**

_(completar)_

---
