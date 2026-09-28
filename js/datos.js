/**
 * datos.js — de dónde salen los datos.
 *
 * Este módulo es la ÚNICA parte del sitio que sabe dónde están los datos.
 * Hoy los lee de archivos JSON estáticos; el día que tengas una API propia
 * (por ejemplo con FastAPI), solo vas a cambiar las URLs de acá:
 *
 *     const URL_MODELOS = "https://mi-api.com/modelos";
 *
 * y el resto del sitio (galería, detalle) no se entera del cambio.
 * Esa separación es la idea central de un "frontend" y un "backend".
 */

const URL_MODELOS = "data/modelos.json";
const URL_SITIO = "data/sitio.json";
const CARPETA_MEDIA = "media";

/**
 * Pide un archivo JSON y lo devuelve como objeto de JavaScript.
 *
 * `async` + `await`: fetch() tarda (va a buscar un archivo por la red), así
 * que devuelve una "promesa". `await` espera a que se cumpla sin congelar
 * la página.
 */
async function pedirJSON(url) {
  const respuesta = await fetch(url);

  // fetch() NO lanza error si el servidor responde 404 o 500: hay que revisarlo a mano.
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${url} (código ${respuesta.status})`);
  }
  return respuesta.json();
}

/** Devuelve la lista de modelos del catálogo. */
export async function cargarModelos() {
  const catalogo = await pedirJSON(URL_MODELOS);
  return catalogo.modelos;
}

/** Devuelve la configuración del sitio (datos de contacto, link al repo). */
export async function cargarSitio() {
  return pedirJSON(URL_SITIO);
}

/**
 * Arma la ruta de una foto.
 *   urlFoto(modelo, "img_0046")          -> "media/banderin-uruguay/img_0046.webp"
 *   urlFoto(modelo, "img_0046", "chica") -> "media/banderin-uruguay/img_0046-chica.webp"
 *
 * Los tamaños los genera scripts/procesar_fotos.py:
 *   grande: 1200 × 1600 px   ·   chica: 480 × 640 px (fotos verticales)
 */
export function urlFoto(modelo, foto, tamanio = "grande") {
  const sufijo = tamanio === "chica" ? "-chica" : "";
  return `${CARPETA_MEDIA}/${modelo.id}/${foto}${sufijo}.webp`;
}

/** Ruta del video de un modelo, o null si no tiene. */
export function urlVideo(modelo) {
  return modelo.video ? `${CARPETA_MEDIA}/${modelo.id}/${modelo.video}` : null;
}

/** Ruta de la imagen que se ve antes de darle play al video. */
export function urlPosterVideo(modelo) {
  return `${CARPETA_MEDIA}/${modelo.id}/video-poster.webp`;
}

/**
 * Número con dos dígitos, estilo plano: 1 -> "01", 12 -> "12".
 * padStart rellena con ceros a la izquierda hasta llegar a 2 caracteres.
 */
export function dosDigitos(numero) {
  return String(numero).padStart(2, "0");
}
