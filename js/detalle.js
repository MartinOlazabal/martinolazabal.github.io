/**
 * detalle.js — la vista de detalle de una pieza y la "navegación" por URL.
 *
 * ¿Cómo sabe qué pieza abrir? Por el HASH de la URL (lo que va después de #):
 *
 *     https://tusitio.github.io/#/pieza/porta-credenciales
 *                               └──────── hash ────────┘
 *
 * Ventajas de usar la URL:
 *   - Podés mandarle a un cliente el link directo a una pieza.
 *   - Los botones Atrás/Adelante del navegador funcionan.
 *   - Recargar la página deja la misma pieza abierta.
 *
 * El flujo es siempre el mismo:  cambia la URL  ->  sincronizarConUrl()  ->  se abre o se cierra.
 * Nunca abrimos el detalle "a mano": cambiamos la URL y dejamos que ella mande.
 * (Esto es un "router" mínimo, la misma idea que usan React Router y compañía.)
 */

import { urlFoto, urlVideo, urlPosterVideo, dosDigitos } from "./datos.js";

// --- Referencias a los elementos del <dialog> (se buscan una sola vez) ---
const dialogo = document.querySelector(".detalle");
// Atajo: $("titulo") busca [data-detalle="titulo"] dentro del dialog.
const $ = (nombre) => dialogo.querySelector(`[data-detalle="${nombre}"]`);

const hoja = $("hoja");
const escenario = $("escenario");
const miniaturas = $("miniaturas");
const destacado = $("destacado");
const titulo = $("titulo");
const descripcion = $("descripcion");
const ficha = $("ficha");
const linkAnterior = $("anterior");
const linkSiguiente = $("siguiente");
const flechaAnterior = dialogo.querySelector('[data-accion="foto-anterior"]');
const flechaSiguiente = dialogo.querySelector('[data-accion="foto-siguiente"]');

// Rótulos que se muestran en la ficha técnica para cada campo de `modelo.ficha`.
const ROTULOS_FICHA = {
  material: "Material",
  herramienta: "Herramienta",
  tiempoImpresion: "Tiempo de impresión",
  medidas: "Medidas",
};

// --- Estado: lo que el módulo "recuerda" mientras la página está abierta ---
let modelos = [];            // la lista completa (la recibe iniciarDetalle)
let medios = [];             // fotos + video de la pieza abierta
let indiceMedio = 0;         // cuál de esos medios se está viendo
let abiertoDesdeLaPagina = false; // ¿se abrió con un clic (true) o entrando directo por link (false)?
let elementoPrevio = null;   // para devolver el foco al cerrar (accesibilidad)


// ===========================================================================
// Router: URL -> vista
// ===========================================================================

/** Lee el id de la pieza desde el hash. "#/pieza/codo-esquinero" -> "codo-esquinero" */
function idDesdeUrl() {
  const coincidencia = location.hash.match(/^#\/pieza\/([\w-]+)$/);
  // Una expresión regular: ^ inicio, [\w-]+ letras/números/guiones, $ fin.
  // El paréntesis "captura" el id, que queda en coincidencia[1].
  return coincidencia ? coincidencia[1] : null;
}

/** Abre o cierra el detalle según lo que diga la URL. */
function sincronizarConUrl() {
  const id = idDesdeUrl();
  const modelo = modelos.find((m) => m.id === id);

  if (modelo) {
    abrir(modelo);
  } else if (dialogo.open) {
    cerrarDialogo();
  }
}

/**
 * Cierra el detalle. Si la pieza se abrió con un clic, volvemos atrás en el
 * historial (como apretar "Atrás"): así la URL vuelve a la de antes y el
 * botón Atrás del navegador no reabre la pieza. Si se entró directo por un
 * link, no hay "atrás" dentro del sitio: reemplazamos la URL por la limpia.
 */
function pedirCierre() {
  if (abiertoDesdeLaPagina) {
    history.back();  // dispara 'hashchange' -> sincronizarConUrl -> cerrarDialogo
  } else {
    // replaceState cambia la URL SIN crear una entrada nueva en el historial
    // y SIN disparar 'hashchange', así que cerramos nosotros.
    history.replaceState(null, "", location.pathname + location.search);
    cerrarDialogo();
  }
}


// ===========================================================================
// Abrir y cerrar
// ===========================================================================

function abrir(modelo) {
  const posicion = modelos.indexOf(modelo);

  // Barra superior: "Hoja 03 / 10 — Encargos a medida"
  hoja.textContent = `Hoja ${dosDigitos(posicion + 1)} / ${dosDigitos(modelos.length)} — ${modelo.categoria}`;

  titulo.textContent = modelo.nombre;

  destacado.hidden = !modelo.destacado;
  destacado.textContent = modelo.destacado ?? "";   // ?? = "si es null o undefined, usá esto otro"

  // La descripción puede tener párrafos separados por una línea en blanco ("\n\n").
  descripcion.replaceChildren(
    ...modelo.descripcion.split(/\n\s*\n/).map((texto) => {
      const p = document.createElement("p");
      p.textContent = texto.trim();
      return p;
    })
  );

  llenarFicha(modelo, posicion);
  llenarNavegacion(posicion);

  // Lista de medios: todas las fotos y, al final, el video (si hay).
  medios = modelo.fotos.map((foto) => ({ tipo: "foto", foto }));
  if (modelo.video) medios.push({ tipo: "video" });
  crearMiniaturas(modelo);
  mostrarMedio(modelo, 0);

  if (!dialogo.open) {
    elementoPrevio = document.activeElement;
    dialogo.showModal();   // showModal (y no show) = modal: bloquea el resto y activa ::backdrop
  }
  // Al pasar de una pieza a otra con "siguiente", volvemos arriba de todo.
  // (En escritorio scrollea la columna de texto; en el celular, el cuerpo entero.)
  dialogo.querySelector(".detalle__info").scrollTop = 0;
  dialogo.querySelector(".detalle__cuerpo").scrollTop = 0;
}

function cerrarDialogo() {
  dialogo.close();
  escenario.replaceChildren();   // vaciamos: así un video no sigue reproduciéndose de fondo
  elementoPrevio?.focus();       // ?. = "si existe, llamá a focus()"
}


// ===========================================================================
// Contenido del detalle
// ===========================================================================

/** Ficha técnica: solo muestra los campos que tienen valor. */
function llenarFicha(modelo, posicion) {
  const filas = [
    ["Pieza", `N.º ${dosDigitos(posicion + 1)}`],
    ["Categoría", modelo.categoria],
    ["Fotos", String(modelo.fotos.length)],
    ["Video", modelo.video ? "Sí" : null],
  ];

  // Object.entries({a: 1, b: 2}) -> [["a", 1], ["b", 2]]
  for (const [campo, valor] of Object.entries(modelo.ficha ?? {})) {
    filas.push([ROTULOS_FICHA[campo] ?? campo, valor]);
  }

  const celdas = filas
    .filter(([, valor]) => valor)   // descarta los null y vacíos
    .map(([rotulo, valor]) => {
      const fila = document.createElement("div");
      fila.className = "cajetin__fila";
      const dt = document.createElement("dt");
      dt.textContent = rotulo;
      const dd = document.createElement("dd");
      dd.textContent = valor;
      fila.append(dt, dd);
      return fila;
    });

  // Si queda una cantidad impar de celdas, la última ocupa todo el ancho.
  if (celdas.length % 2 === 1) celdas.at(-1).classList.add("cajetin__fila--ancha");

  ficha.replaceChildren(...celdas);
}

/** Links a la pieza anterior y a la siguiente (dando la vuelta en los extremos). */
function llenarNavegacion(posicion) {
  const total = modelos.length;
  // El % (resto de la división) hace la "vuelta": después de la última viene la primera.
  const anterior = modelos[(posicion - 1 + total) % total];
  const siguiente = modelos[(posicion + 1) % total];

  linkAnterior.href = `#/pieza/${anterior.id}`;
  linkAnterior.querySelector("span").textContent = anterior.nombre;
  linkSiguiente.href = `#/pieza/${siguiente.id}`;
  linkSiguiente.querySelector("span").textContent = siguiente.nombre;
}

/** Tira de miniaturas debajo de la foto grande. */
function crearMiniaturas(modelo) {
  const items = medios.map((medio, i) => {
    const li = document.createElement("li");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "miniatura";
    boton.dataset.indice = i;

    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";

    if (medio.tipo === "foto") {
      img.src = urlFoto(modelo, medio.foto, "chica");
      boton.setAttribute("aria-label", `Foto ${i + 1} de ${modelo.fotos.length}`);
    } else {
      img.src = urlPosterVideo(modelo);
      boton.setAttribute("aria-label", "Video");
      const play = document.createElement("span");
      play.className = "miniatura__play";
      play.textContent = "▶";
      boton.append(play);
    }

    boton.prepend(img);
    li.append(boton);
    return li;
  });

  miniaturas.replaceChildren(...items);
  // Con una sola foto, las flechas no tienen sentido.
  flechaAnterior.hidden = flechaSiguiente.hidden = medios.length < 2;
}

/** Muestra en grande la foto (o el video) número `indice`. */
function mostrarMedio(modelo, indice) {
  indiceMedio = (indice + medios.length) % medios.length;
  const medio = medios[indiceMedio];

  let elemento;
  if (medio.tipo === "foto") {
    elemento = document.createElement("img");
    elemento.src = urlFoto(modelo, medio.foto);
    elemento.alt = `${modelo.nombre}, foto ${indiceMedio + 1} de ${modelo.fotos.length}`;
  } else {
    elemento = document.createElement("video");
    elemento.src = urlVideo(modelo);
    elemento.poster = urlPosterVideo(modelo);
    // muted + playsinline son necesarios para que el celular permita el autoplay.
    Object.assign(elemento, { autoplay: true, muted: true, loop: true, playsInline: true, controls: true });
    elemento.setAttribute("aria-label", `Video de ${modelo.nombre}`);
  }
  escenario.replaceChildren(elemento);

  // Marcamos la miniatura activa y desplazamos la tira para dejarla centrada.
  // (No usamos scrollIntoView porque también movería el resto del dialog.)
  miniaturas.querySelectorAll(".miniatura").forEach((boton, i) => {
    const activa = i === indiceMedio;
    boton.setAttribute("aria-current", String(activa));
    if (activa) {
      const centro = boton.offsetLeft + boton.offsetWidth / 2;
      miniaturas.scrollTo({ left: centro - miniaturas.clientWidth / 2, behavior: "smooth" });
    }
  });

  // Precargamos la foto siguiente para que el cambio sea instantáneo.
  const proximo = medios[(indiceMedio + 1) % medios.length];
  if (proximo.tipo === "foto") new Image().src = urlFoto(modelo, proximo.foto);
}

/** El modelo que está abierto ahora (según la URL). */
function modeloActual() {
  return modelos.find((m) => m.id === idDesdeUrl());
}


// ===========================================================================
// Inicio: conectar todos los eventos
// ===========================================================================

export function iniciarDetalle(listaDeModelos) {
  modelos = listaDeModelos;

  // Cada vez que cambia el hash (clic en una tarjeta, Atrás, Adelante...).
  window.addEventListener("hashchange", () => {
    // Si el dialog estaba cerrado, esta apertura vino de navegar dentro del sitio.
    if (!dialogo.open) abiertoDesdeLaPagina = true;
    sincronizarConUrl();
  });

  // Clics dentro del dialog, también con delegación de eventos.
  dialogo.addEventListener("click", (event) => {
    // Si el clic fue en el fondo (fuera de la caja), el target es el dialog mismo.
    if (event.target === dialogo) return pedirCierre();

    const accion = event.target.closest("[data-accion]")?.dataset.accion;
    if (accion === "cerrar") pedirCierre();
    if (accion === "foto-anterior") mostrarMedio(modeloActual(), indiceMedio - 1);
    if (accion === "foto-siguiente") mostrarMedio(modeloActual(), indiceMedio + 1);

    const miniatura = event.target.closest(".miniatura");
    if (miniatura) mostrarMedio(modeloActual(), Number(miniatura.dataset.indice));
  });

  // Los links anterior/siguiente: location.replace cambia de pieza SIN sumar
  // entradas al historial (si no, "Atrás" recorrería todas las piezas vistas).
  for (const link of [linkAnterior, linkSiguiente]) {
    link.addEventListener("click", (event) => {
      event.preventDefault();          // evitamos la navegación normal del link...
      location.replace(link.href);     // ...y hacemos la nuestra
    });
  }

  // Esc: el dialog dispara 'cancel' y se cerraría solo. Lo frenamos para
  // cerrar a nuestra manera (y que la URL quede en sintonía).
  dialogo.addEventListener("cancel", (event) => {
    event.preventDefault();
    pedirCierre();
  });

  // Flechas del teclado para pasar fotos.
  dialogo.addEventListener("keydown", (event) => {
    // Si el foco está en el video, las flechas adelantan/atrasan el video: no las tocamos.
    if (event.target.tagName === "VIDEO") return;
    if (event.key === "ArrowLeft") mostrarMedio(modeloActual(), indiceMedio - 1);
    if (event.key === "ArrowRight") mostrarMedio(modeloActual(), indiceMedio + 1);
  });

  // Por si la página se abrió directamente con un link a una pieza.
  sincronizarConUrl();
}
