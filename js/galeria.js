/**
 * galeria.js — la grilla de tarjetas y los filtros por categoría.
 *
 * Flujo:
 *   1. mostrarGaleria(modelos) crea una tarjeta por modelo a partir de la
 *      <template id="plantilla-tarjeta"> que está en index.html.
 *   2. iniciarFiltros(modelos) crea un botón por categoría y, al hacer clic,
 *      oculta las tarjetas que no corresponden.
 *
 * Al hacer clic en una tarjeta NO hacemos nada acá: la tarjeta es un link a
 * "#/pieza/<id>" y de abrir el detalle se encarga detalle.js.
 */

import { urlFoto, dosDigitos } from "./datos.js";

// document.querySelector busca el PRIMER elemento que coincide con un selector CSS.
const contenedor = document.querySelector(".galeria");
const plantilla = document.querySelector("#plantilla-tarjeta");
const zonaFiltros = document.querySelector(".filtros");
const contador = document.querySelector(".contador");

const TODAS = "Todas";

/**
 * Crea la tarjeta (un elemento <a>) de UN modelo.
 * @param {object} modelo  un elemento de data/modelos.json
 * @param {number} indice  su posición en la lista (0, 1, 2...)
 * @param {number} total   cantidad de modelos
 */
function crearTarjeta(modelo, indice, total) {
  // content.cloneNode(true) copia la plantilla con todo lo que tiene adentro.
  // firstElementChild es el <a class="tarjeta"> de la copia.
  const tarjeta = plantilla.content.cloneNode(true).firstElementChild;

  tarjeta.href = `#/pieza/${modelo.id}`;
  tarjeta.dataset.categoria = modelo.categoria;   // queda como data-categoria="..."
  tarjeta.style.setProperty("--i", indice);        // para el retraso de la animación (ver CSS)

  // --- Fotos: la portada y, si hay, una segunda que aparece al pasar el mouse ---
  const [imgPortada, imgAlterna] = tarjeta.querySelectorAll(".tarjeta__img");
  const [portada, segunda] = modelo.fotos;         // "desestructuración": toma los dos primeros

  imgPortada.src = urlFoto(modelo, portada, "chica");
  // srcset ofrece dos tamaños; el navegador elige según el ancho de pantalla y su densidad.
  imgPortada.srcset = `${urlFoto(modelo, portada, "chica")} 480w, ${urlFoto(modelo, portada)} 1200w`;
  imgPortada.sizes = "(min-width: 1100px) 400px, (min-width: 640px) 50vw, 100vw";
  imgPortada.alt = modelo.nombre;

  // Las primeras tarjetas se ven sin scrollear: que carguen ya, no "lazy".
  if (indice < 3) imgPortada.loading = "eager";

  if (segunda) {
    imgAlterna.src = urlFoto(modelo, segunda, "chica");
    // alt vacío = decorativa: el lector de pantalla ya leyó el nombre en la primera.
  } else {
    imgAlterna.remove();
  }

  // --- Textos ---
  // textContent (y no innerHTML) inserta el texto tal cual, sin interpretarlo
  // como HTML. Es la forma segura de mostrar datos.
  tarjeta.querySelector(".tarjeta__num").textContent = `${dosDigitos(indice + 1)} / ${dosDigitos(total)}`;
  tarjeta.querySelector(".tarjeta__nombre").textContent = modelo.nombre;
  tarjeta.querySelector(".tarjeta__resumen").textContent = modelo.resumen;
  tarjeta.querySelector(".tarjeta__categoria").textContent = modelo.categoria;

  const cantidadFotos = modelo.fotos.length;
  tarjeta.querySelector(".tarjeta__fotos").textContent =
    `${cantidadFotos} ${cantidadFotos === 1 ? "foto" : "fotos"}`;

  if (modelo.destacado) {
    const etiqueta = tarjeta.querySelector(".etiqueta-destacada");
    etiqueta.textContent = modelo.destacado;
    etiqueta.hidden = false;
  }

  if (modelo.video) {
    tarjeta.querySelector(".tarjeta__video").hidden = false;
  }

  return tarjeta;
}

/** Dibuja todas las tarjetas en la grilla. */
export function mostrarGaleria(modelos) {
  // .map() transforma cada modelo en su tarjeta.
  // replaceChildren(...lista) vacía el contenedor y agrega todas de una vez.
  const tarjetas = modelos.map((modelo, i) => crearTarjeta(modelo, i, modelos.length));
  contenedor.replaceChildren(...tarjetas);
  actualizarContador(modelos.length, modelos.length);
}

/** Crea los botones de filtro y maneja los clics. */
export function iniciarFiltros(modelos) {
  // new Set(...) elimina repetidos: ["A", "B", "A"] -> {"A", "B"}.
  const categorias = [TODAS, ...new Set(modelos.map((m) => m.categoria))];

  const botones = categorias.map((categoria) => {
    const cantidad = categoria === TODAS
      ? modelos.length
      : modelos.filter((m) => m.categoria === categoria).length;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "filtro";
    boton.dataset.categoria = categoria;
    // aria-pressed indica si un botón "interruptor" está activo. El CSS lo usa para pintarlo.
    boton.setAttribute("aria-pressed", String(categoria === TODAS));
    boton.append(categoria);

    const numero = document.createElement("span");
    numero.className = "filtro__cantidad";
    numero.textContent = cantidad;
    boton.append(numero);

    return boton;
  });

  zonaFiltros.replaceChildren(...botones);

  // "Delegación de eventos": en vez de un listener por botón, uno solo en el
  // contenedor. event.target es el elemento exacto donde se hizo clic;
  // closest() sube hasta encontrar el botón (por si el clic fue en el número).
  zonaFiltros.addEventListener("click", (event) => {
    const boton = event.target.closest(".filtro");
    if (!boton) return;
    aplicarFiltro(boton.dataset.categoria, botones);
  });
}

/** Muestra solo las tarjetas de una categoría. */
function aplicarFiltro(categoria, botones) {
  for (const boton of botones) {
    boton.setAttribute("aria-pressed", String(boton.dataset.categoria === categoria));
  }

  const tarjetas = contenedor.querySelectorAll(".tarjeta");
  let visibles = 0;

  tarjetas.forEach((tarjeta) => {
    const coincide = categoria === TODAS || tarjeta.dataset.categoria === categoria;
    tarjeta.hidden = !coincide;
    if (coincide) {
      // Una tarjeta que estaba oculta (display: none) repite la animación de
      // entrada al volver a mostrarse. --i define su lugar en la "cascada".
      tarjeta.style.setProperty("--i", visibles);
      visibles++;
    }
  });

  actualizarContador(visibles, tarjetas.length);
}

function actualizarContador(visibles, total) {
  contador.textContent = visibles === total
    ? `Mostrando las ${total} piezas`
    : `Mostrando ${visibles} de ${total} piezas`;
}
