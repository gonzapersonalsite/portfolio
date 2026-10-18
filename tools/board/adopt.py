#!/usr/bin/env python3
"""Writes the first record of a repository born from this template: the
decision that adopts the scaffold, confirmed and dated the day it runs.

    python tools/board/adopt.py      GREEN: "RESULT: escrita ..." + exit 0

The template does not ship that decision, because a copy would carry the
history of another repository as its own; only what is knowledge travels, and
it says where it came from (`origin`). For the same reason the verdict and the
derivatives the template ships, sealed on the days the template was built, do
not stay: the verdict is emptied with today's date and the derivatives are
removed, so the first run of verify.py writes this repository's own. It runs
once, on the owner's order to instantiate (instantiate.py runs it on the
copy, and checks the same conditions before it writes anything): it refuses to
write over an adoption that already exists, and inside the template itself,
whose MANIFEST.txt declares `template` rows that a copy's never has; then it
touches nothing. The delivery of the part that installs the scaffold is
written by whoever delivers it, with what the gates said.

Requires Python 3.8+ and nothing else.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# The board is a script, not a package: its directory goes on the path first.
# It loads verify.py by its path, and this file uses that one.
sys.path.insert(0, HERE)
import board as B

V = B.V

DECISION_ID = "this-repository-uses-the-agentic-scaffold"
HEADER = "---\ntitle: Este repositorio usa el andamio agéntico, y su conocimiento vive en registros\nstate: confirmed\ndate: %s\n---\n"
BODY = """**El repositorio se gobierna con el andamio agéntico:** un contrato en la raíz que la
herramienta carga al arrancar, las puertas de `gates.txt` como única verdad, y todo el
conocimiento que no es código en `docs/registry/` como ficheros con cabecera, uno por
decisión, lección y entrega, con índices generados por el tablero.

**Lo que esto fija.** Nada se borra: lo que deja de gobernar cambia de estado o lleva
`retired`. El estado es un campo que una puerta lee, nunca prosa que un validador
adivina. La lectura de arranque tiene tope, el contrato es intemporal y todo markdown
del árbol tiene casa declarada. Las reglas son puertas, no prosa; el resumen del
estado sale del mismo modelo que el validador valida; y el procedimiento es el mismo
en todos los repositorios que nazcan de la plantilla. Los registros que llegaron con
ella dicen su `origin` y conservan la fecha que tenían allí: adoptarla los adopta.

**Lo que se acepta a cambio.** Muchos ficheros pequeños en vez de dos grandes; se
navega por los índices y por `grep`. El andamio impone Python 3 sin dependencias, y
solo al andamio.

**Alternativa refutada.** Un registro monolítico con topes de bytes: el tope no acota
el crecimiento, programa la siguiente cirugía manual
(`#lesson-a-cap-schedules-the-next-crisis`).
"""
USAGE = "uso: python tools/board/adopt.py      escribe la decision de adopcion con la fecha de hoy"


def adoption(day):
    return HEADER % day + BODY


def shipped_derivatives(root, reader):
    """What the board wrote before this repository existed: every derivative
    on disk that carries the board's fingerprint."""
    candidates = [B.SUMMARY_FILE, B.DECISIONS_INDEX_FILE, B.NOTES_INDEX_FILE] + B.index_paths(root)
    return [path for path in candidates if B.STAMP_MARK in reader.text(path)]


def forget_template_history(root, reader, day):
    """The verdict keeps its file, empty and dated today, because documents
    cite it; the derivatives go, and the build writes them again. Both are
    derived, so doing this twice is harmless."""
    B.write_atomically(os.path.join(root, *B.VERDICT_FILE.split("/")), V.render_verdict([], day))
    removed = []
    for path in shipped_derivatives(root, reader):
        os.remove(os.path.join(root, *path.split("/")))
        removed.append(path)
    return removed


def adoption_path(documents):
    """Where the adoption decision goes: under the decisions directory that
    documents.txt declares, or '' when it declares none."""
    dirs = B.dirs_of(documents)
    return "%s/%s%s" % (dirs["decisions"], DECISION_ID, B.RECORD_SUFFIX) if "decisions" in dirs else ""


def adopt(root, day):
    """Writes the adoption decision under the decisions directory that
    documents.txt declares, after emptying what the template dated; never
    over an adoption that exists."""
    reader = B.TreeReader(root)
    data = B.load(root, reader)
    if B.is_template(data["manifest"]):
        return {"code": 1, "said": "esto es la plantilla (su MANIFEST.txt declara %s, que solo tiene ella): la adopcion es de una copia;"
                                   " instancia con python tools/board/instantiate.py <destino>" % ", ".join(data["manifest"]["template"])}
    path = adoption_path(data["documents"])
    if not path:
        return {"code": 1, "said": "documents.txt no declara el directorio de 'decisions': no se sabe donde escribir la decision"}
    target = os.path.join(root, *path.split("/"))
    if os.path.exists(target):
        return {"code": 1, "said": "%s ya existe: la adopcion se escribe una vez y no se reescribe" % path}
    try:
        removed = forget_template_history(root, reader, day)
    except OSError as error:
        return {"code": 1, "said": "no se pudo vaciar lo que la plantilla trae fechado (%s); la decision no se escribio: vuelve a correrlo" % error}
    try:
        B.write_atomically(target, adoption(day))
    except OSError as error:
        return {"code": 1, "said": "no se pudo escribir %s: %s" % (path, error)}
    return {"code": 0, "said": "escrita %s (confirmed, %s); el veredicto de la plantilla queda vacio y sus %d derivados borrados, para que este"
                               " repositorio no herede sus fechas. Sigue: python verify.py hasta verde (la primera corrida dice que el veredicto"
                               " cambio), y la entrega de la parte H0.1 con lo que dijeron las puertas" % (path, day, len(removed))}


def main(argv, root=B.ROOT, day=None):
    B.utf8_console()
    if argv:
        print(USAGE)
        return 2
    result = adopt(root, day or B.today())
    print("RESULT: " + result["said"])
    return result["code"]


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
