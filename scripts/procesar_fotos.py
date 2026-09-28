"""
procesar_fotos.py
=================

Convierte las fotos originales (pesadas, directo del celular) en copias
livianas para la web y mantiene actualizado el catálogo `data/modelos.json`.

¿Por qué existe este script?
----------------------------
1. Una foto de iPhone pesa entre 3 y 5 MB. La web necesita ~150 KB.
2. Las fotos del celular guardan metadatos EXIF, que pueden incluir la
   UBICACIÓN GPS donde se sacó la foto (o sea, tu casa). Al re-guardarlas
   con Pillow, esos metadatos se descartan.
3. El navegador no puede "listar" carpetas de un servidor: la página
   necesita que alguien le diga qué fotos existen. Ese alguien es
   `modelos.json`, y este script lo escribe por vos.

Cómo usarlo (desde la carpeta raíz del repo)
-------------------------------------------
    pip install pillow
    python scripts/procesar_fotos.py

Por defecto busca las fotos originales en `../Modelos 3d` (la carpeta que
está AL LADO del repo, fuera de Git). Si están en otro lado:

    python scripts/procesar_fotos.py "C:/ruta/a/mis/fotos"

Estructura esperada de la carpeta de originales:

    Modelos 3d/
    ├── nombre del objeto/
    │   ├── IMG_0001.JPG
    │   ├── IMG_0002.JPG
    │   ├── IMG_0003.MOV      (opcional: un video corto)
    │   └── detalle.txt       (opcional: descripción del objeto)
    └── otro objeto/
        └── ...

Para los videos hace falta tener `ffmpeg` instalado. Si no está, el script
avisa y sigue con las fotos.
"""

# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------
# Todo esto es de la librería estándar de Python, salvo Pillow (PIL).
import json                # leer y escribir el catálogo modelos.json
import shutil              # shutil.which() para saber si ffmpeg está instalado
import subprocess          # para ejecutar ffmpeg como un programa externo
import sys                 # sys.argv: los argumentos de la línea de comandos
import unicodedata         # para sacar tildes al armar nombres de carpeta
from pathlib import Path   # manejo de rutas que funciona en Windows y Linux

from PIL import Image, ImageFilter, ImageOps  # pip install pillow


# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
# `__file__` es la ruta de este script. `.parent` sube un nivel.
# scripts/procesar_fotos.py -> scripts/ -> raíz del repo
RAIZ_REPO = Path(__file__).resolve().parent.parent

CATALOGO = RAIZ_REPO / "data" / "modelos.json"   # el "backend de mentira"
SALIDA_MEDIA = RAIZ_REPO / "media"                # acá van las copias livianas
ORIGEN_POR_DEFECTO = RAIZ_REPO.parent / "Modelos 3d"

# Tamaños de salida (lado más largo, en píxeles).
TAMANIO_GRANDE = 1600   # para la vista de detalle
TAMANIO_CHICO = 640     # para las tarjetas de la galería
CALIDAD_WEBP = 78       # 0-100. Más alto = más calidad y más peso.

EXTENSIONES_FOTO = {".jpg", ".jpeg", ".png"}
EXTENSIONES_VIDEO = {".mov", ".mp4"}


# ---------------------------------------------------------------------------
# Funciones auxiliares
# ---------------------------------------------------------------------------
def a_slug(texto: str) -> str:
    """Convierte 'Tarro con rosca pequeños' en 'tarro-con-rosca-pequenos'.

    Un "slug" es un nombre seguro para usar en URLs: minúsculas, sin
    espacios, sin tildes. Se usa como `id` de cada modelo nuevo.
    """
    # NFKD separa cada letra de su tilde: "ñ" -> "n" + "~"
    sin_tildes = unicodedata.normalize("NFKD", texto)
    # ...y acá descartamos las tildes sueltas (los caracteres "combining").
    sin_tildes = "".join(c for c in sin_tildes if not unicodedata.combining(c))
    # Todo lo que no sea letra o número pasa a ser un guion.
    partes = "".join(c if c.isalnum() else " " for c in sin_tildes.lower()).split()
    return "-".join(partes)


def esta_actualizado(origen: Path, destino: Path) -> bool:
    """True si `destino` ya existe y es más nuevo que `origen`.

    Así no re-procesamos fotos que no cambiaron: correr el script dos veces
    seguidas es casi instantáneo. (Es la misma idea que usa `make`.)
    """
    return destino.exists() and destino.stat().st_mtime >= origen.stat().st_mtime


def modelo_nuevo(carpeta: Path) -> dict:
    """Crea la entrada del catálogo para una carpeta que todavía no estaba."""
    detalle = carpeta / "detalle.txt"
    descripcion = detalle.read_text(encoding="utf-8").strip() if detalle.exists() else ""
    return {
        "id": a_slug(carpeta.name),
        "carpeta": carpeta.name,
        "nombre": carpeta.name.capitalize(),   # después lo podés editar a mano
        "categoria": "Sin categoría",
        "resumen": "",
        "descripcion": descripcion,
        "destacado": None,
        "ficha": {"material": None, "herramienta": None,
                  "tiempoImpresion": None, "medidas": None},
        "fotos": [],
        "fotosExcluidas": [],
        "ocultar": {},
        "video": None,
    }


# ---------------------------------------------------------------------------
# Procesamiento de imágenes
# ---------------------------------------------------------------------------
def procesar_foto(origen: Path, carpeta_salida: Path, zonas_ocultas: list) -> None:
    """Genera dos versiones .webp de una foto: grande y chica.

    `zonas_ocultas` es una lista de rectángulos [x1, y1, x2, y2] (en píxeles
    de la foto original, ya girada) que se difuminan. Sirve para tapar datos
    personales que aparecen de fondo: una factura, una pantalla, etc.
    """
    nombre = origen.stem.lower()                  # "IMG_0046.JPG" -> "img_0046"
    grande = carpeta_salida / f"{nombre}.webp"
    chica = carpeta_salida / f"{nombre}-chica.webp"

    if esta_actualizado(origen, grande) and esta_actualizado(origen, chica):
        return  # nada que hacer

    # `with` cierra el archivo solo al terminar (aunque haya un error).
    with Image.open(origen) as foto:
        # El celular guarda las fotos "acostadas" y anota en el EXIF cómo
        # girarlas. exif_transpose aplica ese giro de verdad a los píxeles.
        foto = ImageOps.exif_transpose(foto).convert("RGB")

        # Difuminar las zonas sensibles, si las hay.
        for x1, y1, x2, y2 in zonas_ocultas:
            recorte = foto.crop((x1, y1, x2, y2))
            recorte = recorte.filter(ImageFilter.GaussianBlur(radius=28))
            foto.paste(recorte, (x1, y1))

        for destino, lado in ((grande, TAMANIO_GRANDE), (chica, TAMANIO_CHICO)):
            copia = foto.copy()
            # thumbnail() achica manteniendo la proporción. Nunca agranda.
            copia.thumbnail((lado, lado), Image.Resampling.LANCZOS)
            # Al no pasarle `exif=...`, el archivo nuevo sale SIN metadatos.
            copia.save(destino, "WEBP", quality=CALIDAD_WEBP, method=6)

    print(f"    foto   {origen.name} -> {grande.name}, {chica.name}")


def procesar_video(origen: Path, carpeta_salida: Path) -> str | None:
    """Convierte un video del celular (.MOV, HEVC) a .mp4 H.264 liviano.

    Devuelve el nombre del archivo generado, o None si no se pudo.
    """
    destino = carpeta_salida / "video.mp4"
    poster = carpeta_salida / "video-poster.webp"   # imagen que se ve antes de darle play

    if esta_actualizado(origen, destino) and poster.exists():
        return destino.name

    if shutil.which("ffmpeg") is None:
        print(f"    ⚠ ffmpeg no está instalado: salteo el video {origen.name}")
        return destino.name if destino.exists() else None

    # Cada elemento de la lista es un argumento, como si lo escribieras en
    # la terminal: ffmpeg -y -i entrada.MOV -vf ... salida.mp4
    comando_video = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(origen),
        "-vf", "scale=-2:960",        # 960 px de alto; -2 = ancho proporcional y par
        "-c:v", "libx264",            # H.264: el formato que reproduce cualquier navegador
        "-crf", "27",                 # calidad (18 = casi perfecta, 30 = liviana)
        "-preset", "slow",            # más lento de comprimir = archivo más chico
        "-pix_fmt", "yuv420p",        # necesario para que Safari lo reproduzca
        "-an",                        # sin audio (en loop y silenciado, no hace falta)
        "-movflags", "+faststart",    # permite empezar a verlo antes de bajarlo entero
        str(destino),
    ]
    comando_poster = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-ss", "1", "-i", str(origen),  # un fotograma del segundo 1
        "-frames:v", "1", "-vf", "scale=-2:960",
        str(poster),
    ]
    subprocess.run(comando_video, check=True)   # check=True: si falla, lanza error
    subprocess.run(comando_poster, check=True)
    print(f"    video  {origen.name} -> {destino.name}")
    return destino.name


# ---------------------------------------------------------------------------
# Programa principal
# ---------------------------------------------------------------------------
def main() -> None:
    # sys.argv[0] es el nombre del script; sys.argv[1], el primer argumento.
    origen = Path(sys.argv[1]) if len(sys.argv) > 1 else ORIGEN_POR_DEFECTO
    if not origen.is_dir():
        sys.exit(f"No encuentro la carpeta de originales: {origen}")

    # 1. Leer el catálogo actual (si existe) para NO pisar lo que editaste a mano.
    if CATALOGO.exists():
        catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    else:
        catalogo = {"modelos": []}

    # Diccionario carpeta -> modelo, para encontrar cada modelo rápido.
    por_carpeta = {m["carpeta"]: m for m in catalogo["modelos"]}

    # 2. Recorrer cada subcarpeta de originales (una por objeto).
    for carpeta in sorted(p for p in origen.iterdir() if p.is_dir()):
        modelo = por_carpeta.get(carpeta.name)
        if modelo is None:
            modelo = modelo_nuevo(carpeta)
            catalogo["modelos"].append(modelo)
            print(f"+ Modelo nuevo: {carpeta.name} (id: {modelo['id']})")
        else:
            print(f"· {modelo['nombre']}")

        carpeta_salida = SALIDA_MEDIA / modelo["id"]
        carpeta_salida.mkdir(parents=True, exist_ok=True)

        excluidas = set(modelo.get("fotosExcluidas", []))
        ocultar = modelo.get("ocultar", {})
        encontradas = []

        for archivo in sorted(carpeta.iterdir()):
            extension = archivo.suffix.lower()
            nombre = archivo.stem.lower()

            if extension in EXTENSIONES_FOTO and nombre not in excluidas:
                procesar_foto(archivo, carpeta_salida, ocultar.get(nombre, []))
                encontradas.append(nombre)

            elif extension in EXTENSIONES_VIDEO and modelo.get("video") in (None, "video.mp4"):
                # Por ahora, un video por modelo (el primero que aparezca).
                modelo["video"] = procesar_video(archivo, carpeta_salida)

        # 3. Actualizar la lista de fotos RESPETANDO el orden que ya tenías
        #    (la primera foto de la lista es la portada), y agregar las nuevas
        #    al final.
        ya_ordenadas = [f for f in modelo["fotos"] if f in encontradas]
        nuevas = [f for f in encontradas if f not in ya_ordenadas]
        modelo["fotos"] = ya_ordenadas + nuevas

    # 4. Guardar el catálogo. ensure_ascii=False para que las tildes se vean
    #    como "á" y no como "\u00e1".
    CATALOGO.write_text(
        json.dumps(catalogo, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    total = sum(len(m["fotos"]) for m in catalogo["modelos"])
    print(f"\nListo: {len(catalogo['modelos'])} modelos, {total} fotos -> {CATALOGO}")


# Este `if` hace que main() se ejecute solo cuando corrés el archivo
# directamente, y no cuando otro script lo importa.
if __name__ == "__main__":
    main()
