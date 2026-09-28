/**
 * main.js — el punto de entrada. index.html carga SOLO este archivo; el
 * resto de los módulos entran por los `import`.
 *
 * Qué hace, en orden:
 *   1. Pide los datos (catálogo de piezas y configuración del sitio).
 *   2. Dibuja la galería y los filtros.
 *   3. Prepara la vista de detalle.
 *   4. Completa los números de la portada y los datos de contacto.
 *
 * Mapa de módulos:
 *   main.js ──> datos.js     (de dónde salen los datos)
 *           ├─> galeria.js   (tarjetas y filtros)
 *           └─> detalle.js   (ventana de detalle + URL)
 */

import { cargarModelos, cargarSitio } from "./datos.js";
import { mostrarGaleria, iniciarFiltros } from "./galeria.js";
import { iniciarDetalle } from "./detalle.js";

async function iniciar() {
  try {
    // Promise.all lanza los dos pedidos EN PARALELO y espera a que terminen ambos.
    // Es más rápido que hacer uno y después el otro.
    const [modelos, sitio] = await Promise.all([cargarModelos(), cargarSitio()]);

    mostrarGaleria(modelos);
    iniciarFiltros(modelos);
    iniciarDetalle(modelos);
    completarDatos(modelos);
    completarContacto(sitio);
  } catch (error) {
    // Si algo falla (por ejemplo, abriste index.html con doble clic en vez de
    // usar un servidor), lo mostramos en la página y en la consola (F12).
    console.error(error);
    document.querySelector(".galeria").textContent =
      "No se pudieron cargar las piezas. Si estás abriendo el archivo directamente, " +
      "levantá un servidor local (ver README).";
  }
}

/** Rellena los elementos con data-dato="..." usando números calculados del catálogo. */
function completarDatos(modelos) {
  // .reduce() recorre la lista acumulando un resultado: acá, la suma de fotos.
  const totalFotos = modelos.reduce((suma, m) => suma + m.fotos.length, 0);
  const totalVideos = modelos.filter((m) => m.video).length;

  const valores = {
    piezas: modelos.length,
    fotos: totalFotos,
    videos: totalVideos,
    anio: new Date().getFullYear(),
  };

  document.querySelectorAll("[data-dato]").forEach((elemento) => {
    const valor = valores[elemento.dataset.dato];
    if (valor !== undefined) elemento.textContent = valor;
  });
}

/** Crea los botones de contacto que estén completos en data/sitio.json. */
function completarContacto(sitio) {
  const { email, instagram, whatsapp } = sitio.contacto ?? {};

  // Cada opción: [texto del botón, URL, ¿se completó?]
  const opciones = [
    ["Escribime un mail", `mailto:${email}`, email],
    ["WhatsApp", `https://wa.me/${String(whatsapp).replace(/\D/g, "")}`, whatsapp],
    ["Instagram", `https://instagram.com/${String(instagram).replace(/^@/, "")}`, instagram],
  ];

  const botones = opciones
    .filter(([, , dato]) => dato)                  // solo las que tienen dato
    .map(([texto, url], i) => {
      const a = document.createElement("a");
      a.className = i === 0 ? "boton" : "boton boton--claro";
      a.href = url;
      a.textContent = texto;
      if (url.startsWith("http")) {
        a.target = "_blank";                       // abre en otra pestaña...
        a.rel = "noopener";                        // ...sin darle acceso a esta página
      }
      return a;
    });

  if (botones.length === 0) {
    console.warn("Completá tus datos de contacto en data/sitio.json");
  }
  document.querySelector(".contacto__enlaces").replaceChildren(...botones);

  // Link al código en GitHub (en "Sobre mí"), si está configurado.
  if (sitio.repositorio) {
    const aviso = document.querySelector("[data-repositorio]");
    aviso.querySelector("a").href = sitio.repositorio;
    aviso.hidden = false;
  }
}

iniciar();
