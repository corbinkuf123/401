#!/usr/bin/env python3
"""
Regenera el respaldo de las direcciones que llevan grabadas los QR.

Si algún día se pierde la base y el sitio, las etiquetas de la pared siguen
siendo legibles, pero nadie sabría qué dirección debe responder a cada una.
Esta lista es lo que permite reconstruirlo. Por eso se regenera sola: un
respaldo que hay que acordarse de actualizar a mano queda viejo el primer día
que alguien se olvida.

Escribe solo si los datos cambiaron de verdad. La fecha de generación no
cuenta como cambio, o commitearía cada vez que corre.
"""
import io, os, re, csv, json, sys, datetime, subprocess

BASE_QR = "https://pabellon414.com/p/"
RAIZ    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV     = os.path.join(RAIZ, "qr-direcciones.csv")
DOC     = os.path.join(RAIZ, "QR-DIRECCIONES.md")

def credenciales():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("ANON_KEY")
    if url and key:
        return url, key
    # en local, salen del mismo config.js que usa la web
    cfg = io.open(os.path.join(RAIZ, "config.js"), encoding="utf-8").read()
    url = re.search(r'SUPABASE_URL\s*=\s*"([^"]+)"', cfg).group(1)
    key = re.search(r'SUPABASE_ANON_KEY\s*=\s*"([^"]+)"', cfg).group(1)
    return url, key

def piezas():
    # Con curl y no desde Python: algunas instalaciones de macOS no traen el
    # almacén de certificados y fallan al validar el TLS de Supabase.
    url, key = credenciales()
    campos = "codigo,id,nombre_comun,nombre_cientifico,pais,anio,sala,imagenes(id)"
    salida = subprocess.run(
        ["curl", "-sS", "--fail", "--max-time", "30",
         f"{url}/rest/v1/piezas?select={campos}&order=orden_display",
         "-H", f"apikey: {key}", "-H", f"Authorization: Bearer {key}"],
        capture_output=True, text=True)
    if salida.returncode != 0:
        raise SystemExit(f"No se pudo leer la base: {salida.stderr.strip()}")
    return json.loads(salida.stdout)

def texto_csv(d):
    salida = io.StringIO()
    w = csv.writer(salida, delimiter=";", lineterminator="\n")
    w.writerow(["codigo","identificador","direccion_del_qr","nombre_comun",
                "nombre_cientifico","pais","anio","sala","fotos"])
    for p in d:
        w.writerow([p.get("codigo") or "", p["id"], BASE_QR + p["id"],
                    p.get("nombre_comun") or "", p.get("nombre_cientifico") or "",
                    p.get("pais") or "", p.get("anio") or "", p.get("sala") or "",
                    len(p.get("imagenes") or [])])
    return salida.getvalue()

def texto_doc(d, hoy):
    filas = "\n".join(
        f"| {p.get('codigo') or '—'} | `{p['id']}` | {p.get('nombre_comun') or '—'} | {p.get('pais') or '—'} |"
        for p in d)
    return f"""# Direcciones de los códigos QR · Pabellón 414

Actualizado el {hoy}. **{len(d)} piezas.** Este documento se regenera solo.

## Qué es esto y para qué sirve

Cada código QR pegado en el pabellón lleva grabada una única línea de texto:
una dirección de internet. Nada más. Este documento es la lista completa de
esas direcciones.

Si algún día se pierde todo —la base de datos, el sitio, los archivos— las
etiquetas de la pared **siguen siendo perfectamente legibles**: van a pedir
estas direcciones. Con esta lista se puede reconstruir un archivo nuevo, con
la tecnología que sea, y hacer que cada dirección lleve otra vez a la ficha
que le corresponde. Sin esta lista, esos papeles son códigos indescifrables.

## Las dos condiciones para que el papel siga sirviendo

1. **Que el dominio `pabellon414.com` siga siendo nuestro.** Se renueva en
   Cloudflare. El chequeo automático avisa 60 días antes del vencimiento e
   insiste todos los días desde los 30.
2. **Que cada pieza conserve su identificador** — la última parte de la
   dirección (`alce`, `marco-polo-craneo`). Editar una ficha nunca lo cambia;
   lo único que lo cambiaría es borrar la pieza y volver a crearla.

## Cómo se reconstruye si se pierde todo

1. Apuntar el dominio `pabellon414.com` al sistema nuevo, sea cual sea.
2. Hacer que la ruta `/p/<identificador>` muestre la ficha de esa pieza,
   usando la columna «identificador» de esta lista.
3. Los QR de la pared vuelven a funcionar sin tocar una sola etiqueta.

El contenido de las fichas (historias, fotos, datos de caza) se recupera del
respaldo de la base y de la carpeta de fotografías originales. Esta lista
resuelve lo otro: **qué dirección corresponde a qué animal.**

## La lista

Dirección completa de cada pieza: `https://pabellon414.com/p/` + identificador

| Código | Identificador | Pieza | País |
|---|---|---|---|
{filas}

---

La misma tabla está en `qr-direcciones.csv`, que se abre con cualquier hoja de
cálculo. Los dos archivos los regenera `herramientas/generar-direcciones.py`,
que corre solo con el chequeo automático: si se agrega una pieza, su dirección
aparece aquí sin que nadie tenga que acordarse.
"""

def main():
    d = piezas()
    if not d:
        print("La base no devolvió piezas; no se toca nada.", file=sys.stderr)
        return 1

    nuevo = texto_csv(d)
    try:
        viejo = io.open(CSV, encoding="utf-8-sig").read()
    except FileNotFoundError:
        viejo = None

    if viejo == nuevo:
        print(f"Sin cambios: {len(d)} piezas, la lista ya estaba al día.")
        return 0

    io.open(CSV, "w", encoding="utf-8-sig", newline="").write(nuevo)
    io.open(DOC, "w", encoding="utf-8").write(
        texto_doc(d, datetime.date.today().isoformat()))
    print(f"Lista regenerada: {len(d)} piezas.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
