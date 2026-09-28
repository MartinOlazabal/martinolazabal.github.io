# Portfolio 3D — HmobProds

Hola, soy Hugo. Diseño e imprimo objetos en 3D desde Montevideo, y en este repositorio armo la web que los reúne.

La idea es simple: una página donde se vean las piezas que modelé e imprimí, con fotos reales y los datos de cada una. Algunas son encargos a medida, otras son productos que vendo.

También es mi proyecto para aprender desarrollo web. Por eso está hecha con HTML, CSS y JavaScript puros, sin frameworks, y todo el código está comentado.

## Estado

**Fase 1: sitio estático.** Galería con filtros, vista de detalle de cada pieza con fotos y video, y links directos a cada pieza.

Lo que viene, de a poco:

- [ ] Completar las fichas técnicas (material, tiempo de impresión, medidas)
- [ ] Visor 3D interactivo con Three.js para girar los modelos
- [ ] Modo oscuro
- [ ] Una API propia con FastAPI que sirva el catálogo en lugar del JSON
- [ ] Base de datos (SQLite y después PostgreSQL)
- [ ] Panel para subir piezas sin tocar el código
- [ ] Cotizador: subís un STL y calcula volumen, peso y costo aproximado

## Cómo verla en tu compu

El navegador no deja que una página abierta con doble clic lea otros archivos (`fetch` bloqueado por seguridad), así que hace falta un servidor local. Python ya trae uno:

```bash
cd MartinOlazabal.github.io    # la carpeta del repo
python -m http.server 8000
```

Y después abrís <http://localhost:8000> en el navegador. Para cortarlo: `Ctrl + C` en la terminal.

Otra opción, si usás VS Code, es la extensión **Live Server**: clic derecho sobre `index.html` y elegís *Open with Live Server*. Recarga sola cada vez que guardás.

## Cómo agregar una pieza nueva

1. Creá una carpeta dentro de `Modelos 3d/`, la que está **al lado** del repo, no adentro. Poné ahí las fotos y, si querés, un `detalle.txt` con la descripción.
2. Desde la carpeta del repo, corré:
   ```bash
   pip install pillow          # solo la primera vez
   python scripts/procesar_fotos.py
   ```
   El script achica las fotos, les borra los metadatos (incluida la ubicación GPS) y agrega la pieza a `data/modelos.json`.
3. Abrí `data/modelos.json` y completá el nombre, la categoría y el resumen de la pieza nueva.
4. Revisá cómo queda con el servidor local y subí los cambios:
   ```bash
   git add .
   git commit -m "Agrego pieza: nombre de la pieza"
   git push
   ```

## Estructura

```
├── index.html              La única página: estructura y plantillas
├── css/estilos.css         Toda la apariencia
├── js/
│   ├── main.js             Punto de entrada: arranca todo
│   ├── datos.js            De dónde salen los datos (el día de mañana, la API)
│   ├── galeria.js          Tarjetas y filtros
│   └── detalle.js          Ventana de detalle y navegación por URL
├── data/
│   ├── modelos.json        El catálogo de piezas
│   └── sitio.json          Datos de contacto y link al repo
├── media/                  Fotos y videos ya optimizados (los genera el script)
├── fonts/                  Tipografías (licencia libre SIL OFL)
├── scripts/
│   └── procesar_fotos.py   Convierte las fotos originales para la web
└── docs/
    ├── como-funciona.md    Explicación del código, parte por parte
    └── diario.md           Lo que voy aprendiendo en cada fase
```

## Sobre mí

Estudio Ingeniería en Computación en la Facultad de Ingeniería (Udelar) y desde 2024 tengo HmobProds, mi emprendimiento de diseño 3D e impresión FDM. Modelo en Fusion 360 y Blender.
