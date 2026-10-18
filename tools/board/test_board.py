#!/usr/bin/env python3
"""Tests of the board itself: every check is exercised on a DEFECTIVE fixture,
because a checker that has never been seen failing is not a gate.
Verdict: "0 fallos" + exit 0.

Three guards, by their canonical names (the board checks every runner carries
them): `guard finished` (every test function reached its end), `guard
registered` (every test_* function declared was run) and `guard silent` (no
test function ran without a single check).
"""
import contextlib
import importlib.util
import io
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import _thread

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import board as B
# verify.py is loaded by its path, through the board: a product package named
# `verify` at the root must not stand in for it.
V = B.V

# A backtick built at run time: a fixture whose comment cites a missing record
# must not make this file cite it too.
TICK = chr(96)
PY = '"%s"' % sys.executable
# A gate that starts a grandchild, leaves its pid in a file and hangs; and one
# that exits 0 at once leaving a child alive with its output still open.
HUNG = PY + ' -c "import subprocess,sys,time; c=subprocess.Popen([sys.executable,\'-c\',\'import time; time.sleep(60)\']); open(\'grandchild.pid\',\'w\').write(str(c.pid)); print(\'nieto\', c.pid, flush=True); time.sleep(60)"'
ORPHAN = PY + ' -c "import subprocess,sys; c=subprocess.Popen([sys.executable,\'-c\',\'import time; time.sleep(30)\']); print(\'huerfano\', c.pid, flush=True)"'
# A hung gate whose grandchild lost its parent: the middle process starts it and
# exits, so no parent link leads from the gate to it (a daemon, a .bat launcher).
BRANCH_GATE = ("import subprocess, sys, time\nsubprocess.Popen([sys.executable, 'branch_middle.py']).wait()\n"
               "print('el proceso de en medio salio', flush=True)\ntime.sleep(60)\n")
BRANCH_MIDDLE = ("import subprocess, sys\nc = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])\n"
                 "open('grandchild.pid', 'w').write(str(c.pid))\n")
# A runner that buffers 60 progress lines on stdout and writes its error on stderr.
LOUD_FAILURE = PY + ' -c "import sys; [print(\'progreso\', n) for n in range(60)]; sys.stderr.write(\'Error: el fallo de verdad\\n\'); sys.exit(1)"'
EXTENSIONS = [".md", ".txt", ".py"]
GUARDS = ["guard finished", "guard registered", "guard silent"]
PLAN = """## Como leer
- orden:
  **F0 ✔ · F1 ✔ → F2 (IN PROGRESS) → F3**

## F0 — Base (DONE)

- **Cuerpo archivado** en `docs/archive/ROADMAP.md`.

## F1 — Crafting (DONE)

- **Cuerpo archivado** en `docs/archive/ROADMAP.md`.

## F2 — Liquidos (IN PROGRESS)

- **Partes, en este orden:**
  1. **El seam — DONE y verificada.** lo que trajo
  2. **La lava — IN PROGRESS.** lo que falta
     y una linea de continuacion de la parte 2
  3. **El cubo:** recoger y soltar liquido.
  4. **Sin gancho.** Que entrega y con que criterio se cierra.
- **Que NO entra aqui:** nada

## F3 — Biomas (PENDING)

## F9 — Fuera de la linea (PENDING)
"""
TOOLING = """## Como leer

  **H1 → H2**

## H1 — Las puertas cierran (PENDING)

## H2 — El registro se lee (PENDING)
"""
CONTRACT = """# Contrato

## 4. Dónde vive cada cosa (autoridad única)

| Para saber | Fichero | Manda sobre |
|---|---|---|
| Que fase toca | `docs/ROADMAP.md` | numeracion de fases |
| Contratos de arquitectura | `docs/adr/ADR-001..005` | forma del codigo |
| Que comprueba el tablero | `tools/board/README.md` | genera `STATUS.txt`, derivado |

## 5. Protocolo
"""
CHECKLIST = """# Tablero

## Qué comprueba

1. **Una cosa.** con su explicacion
   que sigue aqui, y hasta con un 2. dentro de la frase
   9. y una linea indentada que parece un item y no lo es
2. **Otra.** corta
3. **La tercera.** cierra

## Otra seccion

4. **Esta vive fuera de la seccion leida.**
"""

total = failures = started = completed = 0
running, mark, mute = "", 0, []


def check(condition, name):
    global total, failures
    total += 1
    print("[PASS] " + name if condition else "[FAIL] " + name)
    if not condition:
        failures += 1


def begin(name):
    global started, running, mark
    started += 1
    running, mark = name, total


def end():
    global completed
    completed += 1
    if total == mark:
        mute.append(running)


def one_says(findings, fragment):
    return any(fragment in (f["message"] if isinstance(f, dict) else f) for f in findings)


def quietly(function, *args):
    """Runs a function that prints, and returns its result and what it printed,
    on either stream."""
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        result = function(*args)
    return result, out.getvalue()


def remove_tree(root):
    """Windows refuses to delete a read-only file (git writes some), and, for a
    moment, a directory that a killed gate still has as its working directory
    while the system tears it down: both are retried, a bounded number of
    times, because deleting is idempotent."""
    def writable_again(function, path, _):
        os.chmod(path, 0o700)
        for pause in (0.05, 0.1, 0.2, 0.4, 0.8, 1.6):
            try:
                function(path)
                return
            except PermissionError:
                time.sleep(pause)
        function(path)
    if sys.version_info >= (3, 12):
        shutil.rmtree(root, onexc=writable_again)
    else:
        shutil.rmtree(root, onerror=writable_again)


@contextlib.contextmanager
def scratch_tree():
    root = tempfile.mkdtemp(prefix="andamio-test-")
    try:
        yield root
    finally:
        remove_tree(root)


def write(root, rel, content):
    path = os.path.join(root, *rel.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as handle:
        handle.write(content if isinstance(content, bytes) else content.encode("utf-8"))


def read_bytes(root, rel):
    with open(os.path.join(root, *rel.split("/")), "rb") as handle:
        return handle.read()


def legend(keys):
    return "# Datos de un arbol de prueba.\n#\n# --- KEYS ---\n" + "".join("# %s : clave\n" % k for k in keys) + "#\n\n"


DOCUMENT_KEYS = ["live", "closed", "axis", "decisions", "lessons", "deliveries", "startup", "timeless",
                 "code", "generated", "extension", "skills", "adapter"]
EXCEPTION_KEYS = ["citation", "marker", "order", "shape", "slug", B.KIND_ENCODING, B.KIND_ENGINE]
MANIFEST_KEYS = ["version", "engine", "template"]
LIMIT_KEYS = ["startup", "line", "identity", "index"]
PROSE_KEYS = ["authority", "checklist", "fields", "state-word", "skills", "standards", B.PENDING_KEY]
# The headings a Spanish-speaking team gives the sections the board reads.
AUTHORITY, CHECKLIST_TITLE, FIELDS = "4. Dónde vive cada cosa", "Qué comprueba", "Campos"
PENDING = "Por fusionar: el contrato de antes"
SPANISH_STATE_WORDS = ["CONFIRMADA", "ABIERTA", "RESUELTA"]


def prose_data(authority=AUTHORITY, checklist=CHECKLIST_TITLE, fields=FIELDS, words=SPANISH_STATE_WORDS):
    rows = ["authority " + authority, "checklist " + checklist, "fields " + fields, "%s %s" % (B.PENDING_KEY, PENDING)] + ["state-word " + w for w in words]
    return legend(PROSE_KEYS) + "".join(row + "\n" for row in rows)


def limits_data(identity=80, index=30000, startup=60000):
    return (legend(LIMIT_KEYS) + "# Un tope.\nstartup %d\n\n# Otro tope.\nline 240\n\n# El de la identidad.\nidentity %d\n\n"
            "# El de los indices.\nindex %d\n" % (startup, identity, index))


def minimal_tree(root, authority=AUTHORITY):
    """The smallest tree on which every check of the board runs and passes, with
    its derivatives built. Its data files are its own, not the template's."""
    write(root, "AGENTS.md", "# Contrato\n\n## %s (autoridad)\n\n| Para saber | Fichero | Manda sobre |\n|---|---|---|\n"
          "| Uso | `README.md` | el uso |\n" % authority)
    write(root, "README.md", "# Producto\n\nQue es, en un parrafo.\n")
    write(root, "CLAUDE.md", "@AGENTS.md\n")
    write(root, "docs/ROADMAP.md", "# Plan\n\n**F0 (IN PROGRESS)**\n\n## F0 — Base (IN PROGRESS)\n\n- **Partes:**\n  1. **Primera.** algo\n")
    fields = "".join("| `%s` | x |\n" % f for f in B.all_fields() if f != "state")
    states = " · ".join("`%s`" % s for s in B.STATES)
    write(root, B.REGISTRY_README, "# Registro\n\n## %s\n\n| Campo | Valor |\n|---|---|\n%s| `state` | %s |\n" % (FIELDS, fields, states))
    write(root, "docs/registry/decisions/la-base.md", "---\ntitle: La base\nstate: confirmed\ndate: 2026-01-01\n---\n**La base.** Cita `README.md`.\n")
    write(root, "docs/registry/lessons/lesson-something.md", "---\ntitle: Algo\ndate: 2026-01-01\n---\n**Algo.** Se aprendio algo.\n")
    write(root, "docs/registry/deliveries/2026-01-01-la-base.md", "---\ntitle: La base entra\ndate: 2026-01-01\nphase: F0\n---\n**La base entra.** Por `#la-base`.\n")
    write(root, "tools/board/documents.txt", legend(DOCUMENT_KEYS) + "".join(line + "\n" for line in [
        "live AGENTS.md", "live README.md", "live " + B.REGISTRY_README, "live " + B.BOARD_README, "axis F docs/ROADMAP.md",
        "decisions docs/registry/decisions", "lessons docs/registry/lessons", "deliveries docs/registry/deliveries",
        "startup AGENTS.md", "timeless AGENTS.md", "adapter CLAUDE.md", "code .py #", "extension .md", "extension .txt", "extension .py"]))
    write(root, "tools/board/exceptions.txt", legend(EXCEPTION_KEYS))
    write(root, "tools/board/limits.txt", limits_data())
    write(root, "tools/board/prose.txt", prose_data(authority=authority))
    write(root, "gates.txt", "# Puertas de prueba.\nuno | - | {python} -c \"print(1)\"\n")
    write(root, "tools/board/MANIFEST.txt", legend(MANIFEST_KEYS) + "version 0.0.1\n")
    # The README numbers exactly the checks the board runs: count them first.
    write(root, B.BOARD_README, "# Tablero\n\n## %s\n\n1. **Una.**\n" % CHECKLIST_TITLE)
    rows = B.inspect(root)["rows"]
    write(root, B.BOARD_README, "# Tablero\n\n## %s\n\n%s" % (CHECKLIST_TITLE, "".join("%d. **Comprobacion.**\n" % n for n in range(1, rows + 1))))
    quietly(B.build, root)


def append(root, rel, text):
    write(root, rel, read_bytes(root, rel) + text.encode("utf-8"))


def findings_of(root):
    return B.inspect(root)["findings"]


def derived_on_disk(root):
    """The derivatives a built tree holds: the summary, the main indexes and the index directory."""
    folder = os.path.join(root, *B.INDEX_DIR.split("/"))
    return [B.SUMMARY_FILE, B.DECISIONS_INDEX_FILE, B.NOTES_INDEX_FILE] + [B.INDEX_DIR + "/" + n for n in sorted(os.listdir(folder))]


def sanitized_env():
    return V.without_git_location(os.environ)


def git(root, *args):
    try:
        done = subprocess.run(["git", "-c", "init.defaultBranch=main", "-c", "core.autocrlf=false"] + list(args), cwd=root,
                              env=sanitized_env(), stdin=subprocess.DEVNULL, capture_output=True, timeout=30)
    except OSError:
        # No git on this machine: the caller checks that this is the reason.
        return False
    return done.returncode == 0


def init_repository(root, *flags):
    """git init in `root`, with core.longpaths in the repository's own
    configuration, as instantiate.py and overlays/accept.py set it: every git
    that runs there reads it, the engine's and a push's receiving end
    included. The suite works under the system's temporary folder, and under
    a deep one a path of the template's snapshot, or an object a push writes
    into a bare remote, goes past the 260 characters that git on Windows
    refuses without it ("Filename too long"): a green gate would read red."""
    return git(root, "init", "-q", *flags) and git(root, "config", "core.longpaths", "true")


def process_alive(pid):
    if os.name == "nt":
        import ctypes
        kernel = ctypes.windll.kernel32
        handle = kernel.OpenProcess(0x00100000 | 0x1000, False, pid)  # SYNCHRONIZE | QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        try:
            return kernel.WaitForSingleObject(handle, 0) == 0x102  # WAIT_TIMEOUT: still running
        finally:
            kernel.CloseHandle(handle)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    try:
        with open("/proc/%d/stat" % pid, encoding="utf-8", errors="replace") as handle:
            fields = V.stat_fields(handle.read())
    except OSError:
        # No /proc (macOS): kill(0) is all there is to ask.
        return True
    # A zombie is dead; in a container whose init does not reap, it stays.
    return not fields or fields["state"] != "Z"


def dead_within(pid, seconds):
    """A killed process can take a moment to be reaped (a POSIX zombie)."""
    deadline = time.monotonic() + seconds
    while process_alive(pid):
        if time.monotonic() > deadline:
            return False
        time.sleep(0.05)
    return True


def stop(pid):
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        # Already gone: what this cleanup wanted.
        pass


def pid_after(lines, word):
    for line in lines:
        parts = line.split()
        if len(parts) == 2 and parts[0] == word and parts[1].isdigit():
            return int(parts[1])
    return 0


def pid_in_file(root):
    path = os.path.join(root, "grandchild.pid")
    if not os.path.exists(path):
        return 0
    with open(path, encoding="utf-8") as handle:
        text = handle.read().strip()
    return int(text) if text.isdigit() else 0


@contextlib.contextmanager
def interrupt_when(ready, deliver=_thread.interrupt_main, limit=20):
    """Delivers a Ctrl+C (or what `deliver` sends) to this process once
    `ready()` holds, or after `limit` seconds: a loaded machine may take long
    to set a scenario up, and an interrupt that arrives before it tests nothing."""
    finished = threading.Event()

    def watch():
        deadline = time.monotonic() + limit
        while not finished.is_set() and not ready() and time.monotonic() < deadline:
            time.sleep(0.05)
        if not finished.is_set():
            deliver()

    watcher = threading.Thread(target=watch, daemon=True)
    watcher.start()
    try:
        yield
    finally:
        finished.set()
        watcher.join()


def branch_timeout(root, make_tree=V.open_tree):
    """Runs the branch gate until its budget, with a longer budget only when
    the machine was too loaded to start the grandchild within the first."""
    for budget in (1.5, 4, 10):
        result = V.run_gate(PY + " branch.py", budget, root, make_tree)
        if pid_in_file(root):
            return result
    return result


def send_sigterm():
    signal.raise_signal(signal.SIGTERM)


@contextlib.contextmanager
def stdin_that_never_ends():
    """fd 0 becomes a pipe whose writer stays open, whatever stdin this suite
    got: a gate that inherited it would wait for its end forever."""
    read_end, write_end = os.pipe()
    try:
        saved = os.dup(0)
    except OSError:
        # This suite runs without a stdin at all.
        saved = None
    os.dup2(read_end, 0)
    try:
        yield
    finally:
        if saved is None:
            os.close(0)
        else:
            os.dup2(saved, 0)
            os.close(saved)
        os.close(read_end)
        os.close(write_end)


@contextlib.contextmanager
def patched(module, **values):
    """Sets module constants for one block and puts the old ones back."""
    old = {name: getattr(module, name) for name in values}
    for name, value in values.items():
        setattr(module, name, value)
    try:
        yield
    finally:
        for name, value in old.items():
            setattr(module, name, value)


@contextlib.contextmanager
def environment(**values):
    """Sets environment variables for one block, for this process and what it
    starts, and puts the old ones back."""
    old = {name: os.environ.get(name) for name in values}
    os.environ.update(values)
    try:
        yield
    finally:
        for name, value in old.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


class FakeGate:
    """A process stand-in for kill_tree: it dies only when told to."""

    def __init__(self, dies_on_kill, exited=False):
        self.pid, self.dies_on_kill, self.code = 4242, dies_on_kill, (0 if exited else None)

    def poll(self):
        return self.code

    def kill(self):
        if self.dies_on_kill:
            self.code = -9

    def wait(self, timeout=None):
        if self.code is None:
            raise subprocess.TimeoutExpired("gate", timeout)
        return self.code


class FakeTree:
    """A tree stand-in for kill_tree: whether its kill works and what it says it saw."""

    scope = "arbol de prueba"

    def __init__(self, kills, says_empty):
        self.kills, self.says_empty = kills, says_empty

    def terminate(self, process):
        if self.kills:
            process.code = -9
        return "terminado de prueba"

    def emptied(self, deadline):
        return self.says_empty


class RefusingJob(V.JobTree if os.name == "nt" else object):
    """A Windows job that refuses the gate, as an old Windows would."""

    def join(self, pid):
        return "rechazo simulado"


def record(file, fields, body="cuerpo"):
    text = "---\n" + "".join("%s: %s\n" % (k, v) for k, v in fields.items()) + "---\n" + body + "\n"
    return B.parse_record(text, file)


def decision(rid, state, date, extra=None, body="cuerpo"):
    fields = {"title": rid.replace("-", " ").capitalize(), "state": state, "date": date}
    fields.update(extra or {})
    return record("docs/registry/decisions/%s.md" % rid, fields, body)


def lesson(rid, date):
    return record("docs/registry/lessons/%s.md" % rid, {"title": rid, "date": date})


def delivery(rid, date):
    return record("docs/registry/deliveries/%s.md" % rid, {"title": rid, "date": date})


def groups_of(decisions, lessons=(), deliveries=()):
    return {
        "decisions": {"kind": "decision", "dir": "docs/registry/decisions", "records": list(decisions), "problems": []},
        "lessons": {"kind": "lesson", "dir": "docs/registry/lessons", "records": list(lessons), "problems": []},
        "deliveries": {"kind": "delivery", "dir": "docs/registry/deliveries", "records": list(deliveries), "problems": []},
    }


def sample_records():
    return groups_of([
        decision("sonido", "open", "2026-09-12", {"phase": "none"}),
        decision("cofres", "open", "2026-09-11", {"phase": "F3"}),
        decision("ya-alcanzada", "open", "2026-09-11", {"phase": "F0"}),
        decision("luz", "resolved", "2026-09-12"),
        decision("arneses", "open", "2026-09-13", {"phase": "H1"}),
        decision("liquidos-vivos", "open", "2026-09-13", {"phase": "F2"}),
        decision("borde", "confirmed", "2026-09-11"),
        decision("hud-monolitico", "open", "2026-09-11", {"type": "debt", "phase": "F3", "criterion": "Dividir en capas"}),
        decision("vieja", "resolved", "2026-09-11", {"type": "debt", "criterion": "Se retiro la linea"}),
    ], [lesson("lesson-one-thing", "2026-09-12")], [delivery("2026-09-12-el-seam", "2026-09-12")])


def plans():
    return [{"axis": "F", "file": "docs/ROADMAP.md", "text": PLAN}, {"axis": "H", "file": "docs/TOOLING.md", "text": TOOLING}]


def test_data_files():
    begin("test_data_files")
    legend = "# El motivo se escribe una sola\n# vez: habla del grupo.\n#\n# --- KEYS ---\n# live      : documento VIVO.\n# closed    : archivo CERRADO.\n#\n"
    check(B.legend_keys(legend) == ["live", "closed"], "datos: las claves salen de la leyenda, y 'vez:' queda fuera por la marca (visto fallar)")
    check(B.legend_keys("# sin marca\n# live : algo\n") == [], "datos: sin la marca de apertura no hay claves")
    problems = []
    entries = B.parse_data(legend + "# motivo\nlive AGENTS.md\n\nlive docs/ROADMAP.md\n", "d.txt", problems)
    check(not problems and len(entries) == 2, "datos: dos entradas y ningun problema")
    check(entries[0]["motive"].endswith("motivo") and entries[1]["motive"] == "", "datos: el comentario cubre su grupo y la linea en blanco lo cierra (visto fallar)")
    check(B.values_of(entries, "live") == ["AGENTS.md", "docs/ROADMAP.md"], "datos: values_of devuelve los valores de una palabra")
    p2 = []
    B.parse_data(legend + "inventado AGENTS.md\n", "d.txt", p2)
    check(len(p2) == 1 and "desconocida" in p2[0], "datos: palabra desconocida -> problema")
    p3 = []
    B.parse_data(legend + "live\n", "d.txt", p3)
    check(len(p3) == 1 and "palabra valor" in p3[0], "datos: linea sin valor -> problema")
    p4 = []
    B.parse_data("live AGENTS.md\n", "sin-leyenda.txt", p4)
    check(len(p4) == 1 and "leyenda" in p4[0], "datos: un fichero sin leyenda es UN problema de datos (visto fallar)")
    p5 = []
    B.parse_data(legend + "record #una\n", "exceptions.txt", p5)
    check(len(p5) == 1 and "desconocida" in p5[0], "datos: 'record' no es clave de excepcion (visto fallar)")
    end()


def test_docs():
    begin("test_docs")
    spans = B.inline_code("cita `a.md` y `b.py`\n```\nbloque con `trampa.md` dentro\n```\nfuera `c.md`\n")
    check([s["value"] for s in spans] == ["a.md", "b.py", "c.md"] and spans[2]["line"] == 5, "citas: comillas en linea con su numero de linea, y el bloque cercado se salta (visto fallar)")
    check(B.inline_code("una comilla sin cerrar `rota.md\n") == [], "citas: una comilla sin pareja no inventa un fragmento")
    fenced = B.inline_code("~~~\n`dentro.md`\n```\n`sigue-dentro.md`\n~~~\n````\n`a.md`\n```\n`b.md`\n````\n`fuera.md`\n")
    check([s["value"] for s in fenced] == ["fuera.md"] and fenced[0]["line"] == 11,
          "citas: un bloque ~~~ tambien es codigo, y solo lo cierra su propia cerca, igual o mas larga (visto fallar)")
    headers = B.phase_headers("## F0 — Base (DONE)\ntexto\n## F5 — Liquidos (IN PROGRESS)\n## F6 — Biomas\n## Como leer\n", ["F"])
    check(len(headers) == 3 and headers[0]["marker"] == B.DONE and headers[1]["marker"] == B.IN_PROGRESS and headers[2]["marker"] == "", "cabeceras: id y marcador; sin marcador canonico queda vacio (visto fallar)")
    check(B.phase_headers("## F4 — Bloques (DONE 2026-09-12)\n", ["F"])[0]["marker"] == "", "cabeceras: un marcador con fecha no es canonico")
    check(len(B.phase_ids("ADR-005 y PDF4 no son fases, F12 si", ["F"])) == 1, "fases: 'F' pegada a una palabra no es una fase")
    check(B.is_phase_id("H3", ["H"]) and not B.is_phase_id("H3 y F1", ["H"]) and not B.is_phase_id("H3", ["F"]), "fases: un id es exactamente una letra de su eje y digitos")
    lines = B.order_lines("- orden:\n  **F0 ✔ · F4 ✔ → F5 (IN PROGRESS: la 4 a medias) → F6 →\n  construccion → F7 → [jefes] → F7 →\n  F8**\n", ["F"])
    check(len(lines) == 1, "linea de orden: se pliega el negrita partido en varias lineas")
    order = B.read_order(lines[0]["value"], ["F"])
    phases = order["steps"]
    check([p["id"] for p in phases] == ["F0", "F4", "F5", "F6", "F7", "F8"] and order["strays"] == ["construccion", "[jefes]"],
          "linea de orden: F7 nombrada dos veces cuenta una, y lo que no es una fase queda aparte (visto fallar)")
    check(phases[0]["marker"] == B.DONE and phases[2]["marker"] == B.IN_PROGRESS and phases[3]["marker"] == B.PENDING, "linea de orden: el estado sale del texto que sigue a cada fase")
    alone = B.order_lines("**H0 (IN PROGRESS)**\n", ["H"])
    check(len(alone) == 1 and B.read_order(alone[0]["value"], ["H"])["steps"][0]["marker"] == B.IN_PROGRESS, "linea de orden: un plan con un solo tramo tiene linea de orden sin flecha (visto fallar)")
    check(B.order_lines("**H0 es lo primero que se hace**\n", ["H"]) == [] and B.order_lines("**H0 (la base):** algo\n", ["H"]) == [], "linea de orden: una frase en negrita que empieza por un tramo no es la linea")
    bl = B.bullets(B.section("## A\n\n- **Sonido (X):** hace falta\n  y sigue\n- Cofres/hornos (F6) — con gancho\n\n## Otra\n\n- no cuenta\n", "A"))
    check(len(bl) == 2 and bl[0]["name"] == "Sonido" and bl[1]["name"] == "Cofres/hornos", "vinetas: nombre sin markdown ni explicacion, y la seccion acaba en la siguiente cabecera")
    check("y sigue" in bl[0]["value"] and "y sigue" not in bl[0]["head"], "vinetas: una vineta partida se juzga entera y su linea propia no crece (visto fallar)")
    rows = B.table_rows(B.section("## D\n\n| Deuda | Hoy | Fase |\n|---|---|---|\n| HUD | 400 | **F9** |\n", "D"))
    check(len(rows) == 1 and rows[0]["cells"][2] == "**F9**", "tabla: fuera la cabecera y el separador, celdas recortadas")
    dates = B.dates_in("sin fecha\ndesde el 2026-09-13 y el 2026-09-14\nADR-005 no es fecha\n")
    check(len(dates) == 2 and dates[0]["value"] == "2026-09-13" and dates[0]["line"] == 2, "fechas: se leen todas con su linea (visto fallar)")
    check(B.dates_in("F6 y 2026-9-13 mal escrita") == [], "fechas: solo AAAA-MM-DD cuenta")
    check(B.has_section("## Campos\n", "Campos") and not B.has_section("## Campo\n", "Campos"), "seccion: la cabecera se reconoce por su principio")
    end()


def test_citations():
    begin("test_citations")
    check(B.is_path_citation("core/blocks.py", EXTENSIONS) and B.is_path_citation("docs/", EXTENSIONS), "ruta: extension conocida o barra final")
    check(not B.is_path_citation("floor(-owed/every)+1", EXTENSIONS) and not B.is_path_citation("tests/test_*.py", EXTENSIONS), "ruta: una formula o un glob no son ruta (visto fallar)")
    check(not B.is_path_citation(".md", EXTENSIONS) and not B.is_path_citation("Items.color_of", EXTENSIONS), "ruta: una extension suelta o desconocida no es ruta")
    known = {"AGENTS.md", "src/core/blocks.py", "core/blocks.py", "blocks.py", "docs/ROADMAP.md", "ROADMAP.md"}
    check(B.resolves("core/blocks.py", "docs", known) and B.resolves("blocks.py", "docs", known), "resuelve: por sufijo y por nombre suelto")
    check(B.resolves("../AGENTS.md", "docs", known), "resuelve: cita relativa contra el documento que la escribe")
    check(not B.resolves("core/geology.py", "docs", known), "resuelve: lo que no esta en el arbol NO resuelve (visto fallar)")
    check(B.resolves("build/out.txt", "tools", known, ["tools/build"]) and not B.resolves("build/out.txt", "docs", known, ["tools/build"]), "resuelve: una ruta dentro de un arbol generado resuelve solo desde donde ese arbol le queda debajo (visto fallar)")
    cites = [{"value": "core/geology.py", "line": 10, "doc": "a.md", "dir": ""}, {"value": "core/geology.py", "line": 20, "doc": "b.md", "dir": ""},
             {"value": "core/blocks.py", "line": 30, "doc": "a.md", "dir": ""}]
    found = B.cited_files_exist(cites, EXTENSIONS, known)
    check(len(found) == 1 and found[0]["kind"] == B.KIND_CITE and "b.md:20" in found[0]["message"], "cita: una entrada por fragmento roto, con todos los sitios (visto fallar)")
    check(B.is_slug_citation("#luz-y-oscuridad") and not B.is_slug_citation("#FF0000") and not B.is_slug_citation("core/blocks.py"), "cita de identidad: '#' y minusculas es una cita; un color o una ruta no")
    ids = [{"value": "#luz", "line": 3, "doc": "a.md", "dir": ""}, {"value": "#nadie", "line": 5, "doc": "a.md", "dir": ""}, {"value": "#nadie", "line": 6, "doc": "b.md", "dir": ""}]
    broken = B.slug_citations_resolve(ids, ["luz"])
    check(len(broken) == 1 and broken[0]["key"] == "#nadie" and "b.md:6" in broken[0]["message"], "cita de identidad: la que ningun registro declara sale, una vez por identidad (visto fallar)")
    end()


def test_order_and_titles():
    begin("test_order_and_titles")
    headers = B.phase_headers("## F0 — Base (DONE)\n## F5 — Liquidos (IN PROGRESS)\n## F6 — Biomas (PENDING)\n", ["F"])
    line = B.order_lines("**F0 ✔ → F5 (IN PROGRESS) → F6**\n", ["F"])
    check(B.order_and_headers_agree(headers, line, "p.md", ["F"]) == [], "orden: linea y cabeceras de acuerdo -> sin hallazgos")
    f1 = B.order_and_headers_agree(headers, B.order_lines("**F0 ✔ → F5 (IN PROGRESS) → F6 → F13**\n", ["F"]), "p.md", ["F"])
    check(len(f1) == 1 and f1[0]["key"] == "F13", "orden: fase en la linea sin seccion (visto fallar)")
    f2 = B.order_and_headers_agree(headers, B.order_lines("**F0 ✔ → F5 (IN PROGRESS)**\n", ["F"]), "p.md", ["F"])
    check(len(f2) == 1 and f2[0]["key"] == "F6", "orden: seccion que no aparece en la linea (visto fallar)")
    f3 = B.order_and_headers_agree(headers, B.order_lines("**F0 ✔ → F5 ✔ → F6**\n", ["F"]), "p.md", ["F"])
    check(len(f3) == 1 and B.DONE in f3[0]["message"], "orden: la linea da por hecha una fase EN CURSO (visto fallar)")
    unmarked = B.phase_headers("## F0 — Base (DONE)\n## F5 — Liquidos\n## F6 — Biomas (PENDING)\n", ["F"])
    f4 = B.order_and_headers_agree(unmarked, line, "p.md", ["F"])
    check(len(f4) == 1 and f4[0]["kind"] == B.KIND_MARKER and f4[0]["key"] == "F5", "marcador: cabecera sin marcador canonico (visto fallar)")
    check(B.document_opens_with_its_title("# Titulo\n\n## A\n", "d.md") == [], "titulo: el documento que abre con su H1 no sale")
    late = B.document_opens_with_its_title("| fila | perdida |\n# Titulo tarde\n", "d.md")
    check(len(late) == 1 and late[0]["kind"] == B.KIND_SHAPE and "fila" in late[0]["message"], "titulo: un documento que no abre con su H1 sale, citando lo que hay (visto fallar)")
    check(len(B.document_opens_with_its_title("", "v.md")) == 1, "titulo: un documento vacio tampoco tiene titulo")
    archives = ["docs/archive/ROADMAP.md"]
    tomb = B.bullets([{"value": "- **Cuerpo archivado** en `docs/archive/ROADMAP.md`.", "line": 9}])
    check(B.closed_sections_are_tombstones([{"id": "F0", "line": 7, "bullets": tomb}], archives, "p.md") == [], "lapida: la que cita su archivo declarado no sale")
    body = B.bullets([{"value": "- **Por que:** algo", "line": 9}, {"value": "- **Depende de:** nada", "line": 10}])
    kept = B.closed_sections_are_tombstones([{"id": "F1", "line": 7, "bullets": body}], archives, "p.md")
    check(len(kept) == 1 and "2 vinetas" in kept[0]["message"] and "(DONE)" in kept[0]["message"], "lapida: un cuerpo que no salio del plan sale en rojo, con el marcador que lleva su cabecera (visto fallar)")
    orphan = B.bullets([{"value": "- **Cuerpo archivado** en algun sitio", "line": 9}])
    check(len(B.closed_sections_are_tombstones([{"id": "F1", "line": 7, "bullets": orphan}], archives, "p.md")) == 1, "lapida: una vineta que no cita archivo tampoco vale (visto fallar)")
    end()


def test_records():
    begin("test_records")
    text = "---\ntitle: Borde\nstate: confirmed\ndate: 2026-09-11\n---\n**Borde.** pared\n"
    rec = B.parse_record(text, "docs/registry/decisions/borde.md")
    check(not rec["problems"] and rec["id"] == "borde" and rec["fields"]["date"] == "2026-09-11" and rec["body_line"] == 6, "registro: identidad del fichero, campos de la cabecera, cuerpo numerado")
    check(B.validate_record(rec, "decision", ["F1"]) == [], "registro: un registro completo no tiene hallazgos")
    check(len(B.parse_record("**Sin cabecera.**\n", "x.md")["problems"]) == 1, "registro: sin cabecera es un problema (visto fallar)")
    check(len(B.parse_record("---\ntitle: a\n", "x.md")["problems"]) == 1, "registro: cabecera sin cierre (visto fallar)")
    check(len(B.parse_record("---\nsin dos puntos\n---\n", "x.md")["problems"]) == 1, "registro: linea sin 'clave: valor' (visto fallar)")
    check(len(B.parse_record("---\ndate: 2026-09-11\ndate: 2026-09-12\n---\n", "x.md")["problems"]) == 1, "registro: clave repetida (visto fallar)")
    check(one_says(B.validate_record(record("una.md", {"title": "a", "state": "confirmed"}), "decision", []), "falta el campo obligatorio 'date'"), "registro: campo obligatorio ausente (visto fallar)")
    check(one_says(B.validate_record(record("una.md", {"title": "a", "state": "confirmed", "date": "2026-09-11", "color": "rojo"}), "decision", []), "el campo 'color' no existe"), "registro: campo desconocido (visto fallar)")
    check(one_says(B.validate_record(record("una.md", {"title": "a", "state": "confirmed", "date": "11 sept"}), "decision", []), "no es una fecha"), "registro: fecha con prosa (visto fallar)")
    check(one_says(B.validate_record(record("una.md", {"title": "a", "state": "confirmed", "date": "2026-13-01"}), "decision", []), "no es una fecha"), "registro: un mes que no existe no es una fecha (visto fallar)")
    check(one_says(B.validate_record(record("una.md", {"title": "a", "state": "CONFIRMED", "date": "2026-09-11"}), "decision", []), "no es uno de"), "registro: estado fuera del esquema (visto fallar)")
    check(one_says(B.validate_record(record("una.md", {"title": "a", "state": "open", "date": "2026-09-11"}), "decision", []), "tiene que decir su 'phase'"), "registro: abierta sin fase (visto fallar)")
    placed = record("una.md", {"title": "a", "state": "open", "date": "2026-09-11", "phase": "F6 H1"})
    check(B.validate_record(placed, "decision", ["F6", "H1"]) == [] and B.phases_of(placed) == ["F6", "H1"], "registro: abierta con sus fases pasa")
    check(one_says(B.validate_record(placed, "decision", ["F6"]), "la fase 'H1' no existe"), "registro: fase que ningun plan tiene (visto fallar)")
    check(B.validate_record(record("una.md", {"title": "a", "state": "postponed", "date": "2026-09-11", "phase": "none"}), "decision", []) == [], "registro: 'ninguna' es una fase valida")
    check(one_says(B.validate_record(record("una.md", {"title": "a", "state": "open", "date": "2026-09-11", "phase": "F9", "type": "debt"}), "decision", ["F9"]), "'criterion'"), "registro: deuda sin criterio (visto fallar)")
    paid = record("una.md", {"title": "a", "state": "resolved", "date": "2026-09-11", "type": "debt", "criterion": "c"})
    check(B.validate_record(paid, "decision", []) == [] and not B.needs_phase(paid), "registro: deuda pagada no pide fase")
    check(one_says(B.validate_record(record("lesson-one.md", {"title": "a", "date": "2026-09-11", "state": "confirmed"}), "lesson", []), "no existe para un registro de clase 'lesson'"), "registro: cada clase tiene su esquema (visto fallar)")
    check(one_says(B.validate_record(rec, "inventada", []), "no es una clase"), "registro: clase desconocida es hallazgo (visto fallar)")
    check(one_says(B.validate_record(B.parse_record(text, "Borde Del Mundo.md"), "decision", []), "no es una identidad valida"), "registro: el nombre del fichero es una identidad (visto fallar)")
    retired_open = record("una.md", {"title": "a", "state": "open", "date": "2026-09-11", "retired": "2026-09-13"})
    check(B.validate_record(retired_open, "decision", []) == [] and not B.is_open(retired_open) and not B.governs(retired_open), "registro: una abierta retirada ni pide fase ni es un frente ni gobierna")
    walked = B.read_dir("docs/registry/decisions", ["dos.md", "una.md", "notas.txt"], lambda f: text if f.endswith(".md") else "")
    check(len(walked["records"]) == 2 and walked["records"][0]["id"] == "dos" and len(walked["problems"]) == 1, "registro: el directorio se lee en orden y un fichero que no es .md es un problema (visto fallar)")
    longest = B.longest_line(B.parse_record("---\ntitle: a\ndate: 2026-09-11\n---\ncorta\n" + "x" * 300 + "\n| " + "y" * 400 + " |\n", "una.md"))
    check(longest["length"] == 300 and longest["line"] == 6, "registro: la linea mas larga del cuerpo, sin contar filas de tabla (visto fallar)")
    check(B.opening_bold("**Titulo (ABIERTA):** resto") == "Titulo (ABIERTA):" and B.state_word_in_opening("**Titulo (ABIERTA):** x", B.state_words(["ABIERTA"])) == "ABIERTA", "cuerpo: el estado se lee del nombre en negrita con el que abre")
    check(B.state_word_in_opening("**Entrada en CONFIRMADAS.** x", B.state_words(["CONFIRMADA"])) == "" and B.state_word_in_opening("Sin negrita ABIERTA", B.state_words(["ABIERTA"])) == "", "cuerpo: CONFIRMADAS nombra una seccion y un cuerpo sin negrita no declara")
    check("title" in B.all_fields() and "origin" in B.all_fields() and "criterion" in B.all_fields(), "esquema: la lista de campos reune las tres clases")
    end()


def test_record_checks():
    begin("test_record_checks")
    groups = sample_records()
    known = ["F0", "F2", "F3", "H1"]
    check(B.records_are_well_formed(list(groups.values()), known) == [], "registros: un juego bien formado no tiene hallazgos")
    broken = sample_records()
    broken["decisions"]["records"].append(decision("rota", "open", "2026-09-11"))
    found = B.records_are_well_formed(list(broken.values()), known)
    check(len(found) == 1 and found[0]["kind"] == B.KIND_RECORD and found[0]["key"] == "#rota" and "'phase'" in found[0]["message"], "registros: un registro mal formado sale con su identidad y su campo (visto fallar)")
    dirless = sample_records()
    dirless["lessons"]["problems"].append("el directorio no existe")
    check(len(B.records_are_well_formed(list(dirless.values()), known)) == 1, "registros: un problema del directorio es un hallazgo (visto fallar)")
    check(B.record_ids_are_unique(list(groups.values())) == [], "identidad: sin repeticiones no hay hallazgo")
    twice = sample_records()
    twice["lessons"]["records"].append(lesson("sonido", "2026-09-12"))
    clash = B.record_ids_are_unique(list(twice.values()))
    check(len(clash) == 1 and clash[0]["key"] == "#sonido", "identidad: una leccion con la identidad de una decision sale (visto fallar)")
    check(B.record_lines_within(list(groups.values()), 100, "line") == [], "lineas: cuerpos cortos no salen")
    wide = sample_records()
    wide["deliveries"]["records"].append(record("docs/registry/deliveries/2026-09-12-ancha.md", {"title": "Ancha", "date": "2026-09-12"}, "corta\n" + "y" * 101))
    over = B.record_lines_within(list(wide.values()), 100, "line")
    check(len(over) == 1 and over[0]["where"].endswith("ancha.md:6") and "101 caracteres" in over[0]["message"], "lineas: una linea por encima del tope sale con su numero (visto fallar)")
    check(B.record_bodies_declare_no_state(list(groups.values()), B.state_words(["ABIERTA"])) == [], "cuerpo: un cuerpo que abre con su titulo no sale")
    prose = sample_records()
    prose["decisions"]["records"].append(decision("vieja-forma", "open", "2026-09-11", {"phase": "F3"}, "**Vieja forma (ABIERTA — hueco):** lo que sea"))
    repeated = B.record_bodies_declare_no_state(list(prose.values()), B.state_words(["ABIERTA"]))
    check(len(repeated) == 1 and repeated[0]["key"] == "#vieja-forma" and "'ABIERTA'" in repeated[0]["message"], "cuerpo: un cuerpo que repite el estado en su nombre sale (visto fallar)")
    lesson_word = sample_records()
    lesson_word["lessons"]["records"].append(record("docs/registry/lessons/lesson-x.md", {"title": "X", "date": "2026-09-11"}, "**Una ABIERTA que nadie lee.** x"))
    check(B.record_bodies_declare_no_state(list(lesson_word.values()), B.state_words(["ABIERTA"])) == [], "cuerpo: solo se mira el cuerpo de las decisiones")
    fields, states = ["title", "state", "date"], ["open", "confirmed"]
    table = "## Campos\n\n| Campo | Valor |\n|---|---|\n| `title` | una frase |\n| `state` | `open` · `confirmed` |\n| `date` | AAAA-MM-DD |\n"
    def rows(text):
        return B.table_rows(B.section(text, "Campos"))
    check(B.schema_is_documented(rows(table), fields, states, "r.md") == [], "esquema: una tabla que nombra exactamente campos y estados no sale")
    check(one_says(B.schema_is_documented(rows(table.replace("| `date` | AAAA-MM-DD |\n", "")), fields, states, "r.md"), "no lo documenta"), "esquema: campo del esquema sin documentar (visto fallar)")
    check(one_says(B.schema_is_documented(rows(table + "| `color` | rojo |\n"), fields, states, "r.md"), "no lo conoce"), "esquema: campo documentado que el esquema no conoce (visto fallar)")
    check(len(B.schema_is_documented(rows(table.replace(" · `confirmed`", "")), fields, states, "r.md")) == 1, "esquema: estado sin nombrar (visto fallar)")
    check(len(B.schema_is_documented(rows(table.replace("`confirmed`", "`confirmed` · `invented`")), fields, states, "r.md")) == 1, "esquema: estado nombrado que no existe (visto fallar)")
    allowed = ["AGENTS.md", "docs/registry/decisions/una.md", "docs/registry/NOTES.md", "CLAUDE.md"]
    check(B.markdown_files_are_declared(["AGENTS.md", "CLAUDE.md", "docs/registry/decisions/una.md"], allowed) == [], "casa: declarado, registro y adaptador no salen")
    stray = B.markdown_files_are_declared(["docs/NOTAS-SUELTAS.md", "AGENTS.md"], allowed)
    check(len(stray) == 1 and stray[0]["key"] == "docs/NOTAS-SUELTAS.md", "casa: un markdown que nadie declaro sale (visto fallar)")
    end()


def test_sections_and_lists():
    begin("test_sections_and_lists")
    moved = CONTRACT.replace("## 4. Dónde vive cada cosa (autoridad única)", "## 4. Autoridad")
    check(B.read_sections_exist(CONTRACT, [AUTHORITY], "AGENTS.md") == [], "seccion: el contrato con su §4 no sale")
    check(len(B.read_sections_exist(moved, [AUTHORITY], "AGENTS.md")) == 1, "seccion: renombrar la cabecera leida sale (visto fallar)")
    rows = B.table_rows(B.section(CONTRACT, AUTHORITY))
    check(len(rows) == 3 and B.authority_rows_are_declared(rows, ["docs/ROADMAP.md", "tools/board/README.md"], EXTENSIONS, "AGENTS.md") == [], "autoridad: con las rutas de §4 declaradas no hay hallazgo")
    found = B.authority_rows_are_declared(rows, ["tools/board/README.md"], EXTENSIONS, "AGENTS.md")
    check(len(found) == 1 and found[0]["key"] == "docs/ROADMAP.md" and found[0]["kind"] == B.KIND_DATA, "autoridad: una fila de §4 sin declarar sale (visto fallar)")
    check(len(B.authority_rows_are_declared(rows, [], EXTENSIONS, "AGENTS.md")) == 2, "autoridad: ni el rango de las ADR ni el derivado de la tercera columna cuentan")
    merged = CONTRACT + "\nLa seccion %s ya no esta: su prosa la nombra sin abrirla.\n" % PENDING
    check(B.contract_is_merged(merged, PENDING, "AGENTS.md") == [], "fusion: un contrato sin la seccion por fusionar no sale, aunque su prosa la nombre")
    left = B.contract_is_merged(merged + "\n## %s\n\n# Reglas viejas\n" % PENDING, PENDING, "AGENTS.md")
    check(len(left) == 1 and left[0]["kind"] == B.KIND_SHAPE and left[0]["key"] == PENDING and left[0]["where"] == "AGENTS.md:%d" % (merged.count("\n") + 2),
          "fusion: un contrato que conserva la seccion por fusionar sale, con su linea (visto fallar)")
    lines = B.section(CHECKLIST, "Qué comprueba")
    check(len(B.ordered_items(lines)) == 3 and B.numbered_list_matches(lines, 3, "R.md") == [], "numerada: se leen los items de primera columna y tres contra tres no sale")
    check(len(B.numbered_list_matches(lines, 4, "R.md")) == 1, "numerada: una fila mas en el codigo que en el README sale (visto fallar)")
    shifted = B.numbered_list_matches(B.section(CHECKLIST.replace("\n2. ", "\n7. ").replace("\n3. ", "\n8. "), "Qué comprueba"), 3, "R.md")
    check(len(shifted) == 1 and shifted[0]["key"] == "7", "numerada: un numero saltado sale una vez")
    findings = [B.finding(B.KIND_ORDER, "F3", "p.md:1", "x"), B.finding(B.KIND_CITE, "core/geology.py", "p.md:2", "y")]
    check(len(B.apply_exceptions(findings, [{"keyword": "order", "value": "F3", "line": 7, "motive": "m"}])) == 1, "excepciones: excusa la suya y solo la suya")
    orphan = B.apply_exceptions(findings, [{"keyword": "order", "value": "F9", "line": 7, "motive": "m"}])
    check(len(orphan) == 3 and "huerfana" in orphan[2]["message"], "excepciones: una que ya no excusa nada es un hallazgo (visto fallar)")
    end()


def test_startup_and_timeless():
    begin("test_startup_and_timeless")
    sizes = {"a.md": 40, "b.md": 30}
    check(B.startup_reading_within(sizes, 70, "limits.txt") == [], "arranque: justo en el tope no sale — es un maximo")
    over = B.startup_reading_within(sizes, 69, "limits.txt")
    check(len(over) == 1 and "70 B y el tope son 69" in over[0]["message"] and "a.md 40" in over[0]["message"], "arranque: pasarse sale con las cifras por documento (visto fallar)")
    declared = ["STATUS.txt", "AGENTS.md", "docs/ROADMAP.md"]
    claude = B.adapter_reads("CLAUDE.md", "Lee esto:\n@STATUS.txt\n  @AGENTS.md\n@docs/ROADMAP.md\n")
    check(claude == {"listed": ["STATUS.txt", "AGENTS.md", "docs/ROADMAP.md"], "problem": ""}, "adaptador: un markdown carga sus lineas '@', en orden (visto fallar)")
    check(B.adapter_reaches_startup("CLAUDE.md", claude["listed"], [], declared) == [], "adaptador: importa exactamente la lista")
    short = B.adapter_reaches_startup("CLAUDE.md", ["AGENTS.md", "docs/ROADMAP.md"], [], declared)
    check(len(short) == 1 and short[0]["key"] == "STATUS.txt" and short[0]["kind"] == B.KIND_DATA, "adaptador: documento de arranque sin importar (visto fallar)")
    extra = B.adapter_reaches_startup("CLAUDE.md", declared + ["docs/TOOLING.md"], [], declared)
    check(len(extra) == 1 and extra[0]["key"] == "docs/TOOLING.md", "adaptador: import que documents.txt no declara (visto fallar)")
    swapped = B.adapter_reaches_startup("CLAUDE.md", ["AGENTS.md", "STATUS.txt", "docs/ROADMAP.md"], [], declared)
    check(len(swapped) == 1 and "orden" in swapped[0]["message"], "adaptador: la lectura de arranque se carga en el orden declarado (visto fallar)")
    opencode = B.adapter_reads("opencode.json", '{"$schema": "x", "instructions": ["STATUS.txt", "docs/ROADMAP.md"]}')
    check(opencode["listed"] == ["STATUS.txt", "docs/ROADMAP.md"] and B.adapter_reaches_startup("opencode.json", opencode["listed"], ["AGENTS.md"], declared) == [],
          "adaptador: uno JSON carga sus 'instructions', y lo que la herramienta ya lee por si misma completa la lista (visto fallar)")
    twice = B.adapter_reaches_startup("opencode.json", declared, ["AGENTS.md"], declared)
    check(len(twice) == 1 and "dos veces" in twice[0]["message"], "adaptador: un documento que la herramienta lee por si misma y que ademas se lista se cargaria dos veces (visto fallar)")
    for name, text, says in [("o.json", "{rota", "JSON"), ("o.json", '{"instructions": "STATUS.txt"}', "instructions"), ("o.json", "[]", "instructions"),
                             ("a.toml", "x", ".toml")]:
        check(says in B.adapter_reads(name, text)["problem"], "adaptador: '%s' que no se sabe leer es un problema que se dice (visto fallar)" % text)
    check(B.adapter_reading_within("CLAUDE.md", {"CLAUDE.md": 10, "AGENTS.md": 60}, 70) == [] and len(B.adapter_reading_within("CLAUDE.md", {"CLAUDE.md": 11, "AGENTS.md": 60}, 70)) == 1,
          "adaptador: lo que una herramienta carga por su adaptador, el propio adaptador incluido, no pasa del tope de arranque (visto fallar)")
    check(B.documents_are_timeless({"AGENTS.md": "# Contrato\n\nreglas con F6 y ADR-005\n"}) == [], "intemporal: sin fechas no sale")
    dated = B.documents_are_timeless({"AGENTS.md": "# Contrato\n\nregla del 2026-09-13\ny otra del 2026-09-14\n"})
    check(len(dated) == 1 and dated[0]["where"] == "AGENTS.md:3" and "2 fecha(s)" in dated[0]["message"], "intemporal: una fecha sale con su linea y su cuenta (visto fallar)")
    end()


def test_settled_citations_and_verify():
    begin("test_settled_citations_and_verify")
    records = {"luz": {"kind": "decision", "fields": {"state": "confirmed"}},
               "vieja": {"kind": "decision", "fields": {"state": "confirmed", "retired": "2026-09-13"}},
               "idea": {"kind": "decision", "fields": {"state": "provisional"}},
               "cerrada": {"kind": "decision", "fields": {"state": "resolved", "retired": "2026-09-12"}},
               "lesson-x": {"kind": "lesson", "fields": {}}}
    cites = [{"value": v, "line": i + 1, "doc": "AGENTS.md"} for i, v in enumerate(["#luz", "#lesson-x", "#idea", "#vieja", "#cerrada", "#nadie", "core/blocks.py"])]
    found = B.timeless_cites_only_settled(cites, records)
    check([f["key"] for f in found] == ["#idea", "#vieja"], "asentado: confirmada, resuelta (aun retirada) y leccion valen; la provisional y la confirmada retirada salen; lo que no resuelve es de otra comprobacion (visto fallar)")
    check("provisional" in found[0]["message"] and "retired" in found[1]["message"] and found[1]["where"] == "AGENTS.md:4", "asentado: el hallazgo dice por que y donde")
    files = {"tools/board/t.py", "gradlew", "a b.py", "docs/x.md"}
    check(B.named_files('{python} tools/board/t.py --x "a b.py" {local:gradlew} docs .\\tools\\board\\t.py -c "print(1)"', files) == ["tools/board/t.py", "a b.py", "gradlew"],
          "arneses: los ficheros del arbol que nombra un comando, una vez cada uno, con {local:...} y barras de Windows (visto fallar)")
    full = "".join("%s: x\n" % g for g in GUARDS)
    rows = [{"label": "t", "harness": True, "named": {"t.py": full}}, {"label": "c", "harness": False, "named": {"c.py": "guard finished"}}]
    check(B.harnesses_carry_every_guard(rows, GUARDS) == [], "arneses: la fila [harness] cuyo fichero lleva las tres guardas no sale, ni la que no es arnes y no las lleva")
    lame = B.harnesses_carry_every_guard([{"label": "t", "harness": True, "named": {"t.py": full.replace("guard silent", "otra"), "u.py": "nada"}}], GUARDS)
    check(len(lame) == 1 and "guard silent" in lame[0]["message"] and "t.py" in lame[0]["message"], "arneses: a la fila [harness] le falta una guarda en todo lo que nombra, y se dice cual (visto fallar)")
    blind = B.harnesses_carry_every_guard([{"label": "t", "harness": True, "named": {}}], GUARDS)
    check(len(blind) == 1 and "ningun fichero" in blind[0]["message"], "arneses: una fila [harness] que no nombra ningun fichero del arbol no deja ver sus guardas (visto fallar)")
    unmarked = B.harnesses_carry_every_guard([{"label": "t", "harness": False, "named": {"t.py": full}}], GUARDS)
    check(len(unmarked) == 1 and "[harness]" in unmarked[0]["message"] and unmarked[0]["kind"] == B.KIND_DATA,
          "arneses: una fila que corre un fichero con las guardas y no lleva la marca sale: verify no exigiria verlas impresas (visto fallar)")
    lines = ["[PASS] guard finished: 9/9", "[PASS] guard silent: ninguna", "RESULT: 1 checks, 0 fallos"]
    check(V.missing_guards(lines, GUARDS) == ["guard registered"] and V.missing_guards(lines + ["[FAIL] guard registered: 8/9"], GUARDS) == [], "verify: la guarda que el arnes no imprimio se nombra (visto fallar)")
    stored = B.parse_verdict(V.render_verdict([("uno", V.GREEN), ("dos", V.RED)], "2026-01-01"))
    check([r["verdict"] == B.GREEN for r in stored["rows"]] == [True, False] and stored["date"] == "2026-01-01",
          "veredicto: el tablero lee como verde lo que verify.py escribe como verde (las dos copias se cruzan)")
    end()


def test_model_and_render():
    begin("test_model_and_render")
    model = B.build_model(plans(), sample_records(), {"date": "2026-09-12", "rows": [{"label": "tests", "verdict": B.GREEN}]})
    f_axis = model["axes"][0]
    check(len(f_axis["phases"]) == 5 and f_axis["phases"]["F2"]["marker"] == B.IN_PROGRESS and f_axis["phases"]["F2"]["title"] == "Liquidos", "modelo: fases con marcador y titulo limpio")
    check([s["kind"] for s in f_axis["steps"]] == ["phase", "phase", "phase", "phase", "outside"], "modelo: la linea da sus fases en orden, y F9 queda FUERA (visto fallar)")
    parts = f_axis["current"]["parts"]
    check(f_axis["current"]["id"] == "F2" and len(parts) == 4 and parts[0]["state"] == B.DONE and parts[2]["state"] == B.PENDING, "modelo: la fase EN CURSO y sus partes, con estado leido de la prosa o PENDING (visto fallar)")
    check([p["title"] for p in parts] == ["El seam", "La lava", "El cubo", "Sin gancho"], "modelo: el nombre de una parte es su negrita, sin la prosa que sigue (visto fallar)")
    check(model["axes"][1]["phases"]["H1"]["marker"] == B.PENDING and model["axes"][1]["next"]["id"] == "H1", "modelo: el segundo eje se lee con la misma gramatica y tiene su siguiente")
    unnamed = [f["name"] for f in model["fronts"] if not f["named_by"]]
    named = [f["name"] for f in model["fronts"] if f["named_by"]]
    check(len(model["fronts"]) == 5 and model["resolved"] == 1, "modelo: cinco frentes abiertos; la resuelta es rastro y la deuda va aparte (visto fallar)")
    check(unnamed == ["Sonido", "Ya alcanzada"] and named == ["Cofres", "Arneses", "Liquidos vivos"], "modelo: sin fase pendiente queda 'ninguna' y la fase ya HECHA; el resto declara la suya")
    check(model["fronts"][4]["named_by"]["open"] and not model["fronts"][1]["named_by"]["open"], "modelo: el frente que nombra la fase EN CURSO lo sabe")
    check(len(model["debts"]) == 2 and model["debts"][0]["phases"] == ["F3"] and model["debts"][0]["criterion"] == "Dividir en capas" and model["debts"][1]["paid"], "modelo: deudas con fase, criterio y pagada")
    check(B.next_step([{"kind": "phase", "id": "F0", "marker": B.DONE}, {"kind": "outside", "id": "F3", "marker": B.PENDING}, {"kind": "phase", "id": "F6", "marker": B.PENDING}])["id"] == "F6", "modelo: la siguiente salta lo hecho y lo de fuera (visto fallar)")
    text = B.render_summary(model)
    check(text.startswith("ESTADO DEL PROYECTO") and B.PRINT_TOKEN in text and B.DATE_TOKEN in text, "resumen: sale como plantilla con huella y fecha por sellar")
    check("1 de 1 en verde" in text and "ORDEN F      F0 ✔ > F1 ✔ > F2 (en curso)" in text and "ORDEN H      H1 > H2" in text, "resumen: veredicto y una linea de orden por eje")
    check("EN CURSO — F2: Liquidos" in text and "NO DERIVABLE" in text, "resumen: la fase en curso y lo que no sabe derivar")
    check("FRENTES ABIERTOS  5 vivos (1 resueltos" in text and "DE LA FASE EN CURSO (1)" in text and "Liquidos vivos" in text and "DEL RESTO, POR FASE (2): F3 1 · H1 1" in text, "resumen: lista los frentes de la fase en curso y cuenta el resto (visto fallar)")
    check("· F3             Cofres" not in text and "SIN FASE PENDIENTE (2)" in text and "DEUDAS       1 vivas, 1 pagadas" in text, "resumen: acotado, y las deudas de sus registros")
    idle = B.render_summary(B.build_model([{"axis": "F", "file": "p.md", "text": PLAN.replace("F2 (IN PROGRESS)", "F2").replace("(IN PROGRESS)", "(PENDING)")}], sample_records(), {"date": "", "rows": []}))
    check("POR FASE (2)" in idle and "Cofres" in idle and "SIN FASE PENDIENTE (3)" in idle and "NO DERIVABLE: no hay veredicto" in idle, "resumen: sin fase en curso se listan todos; sin el eje H, 'Arneses' queda sin fase; y sin veredicto lo dice (visto fallar)")
    dirs = {"decisions": "docs/registry/decisions", "lessons": "docs/registry/lessons", "deliveries": "docs/registry/deliveries"}
    index = B.render_decisions_index(model, dirs)
    check(index.startswith("# ") and "## ABIERTAS (5)" in index and "## DEUDAS VIVAS (1)" in index and "CONFIRMADAS 1" in index and "RESUELTAS 2" in index, "indice: lo que pide trabajo en su seccion, con su cuenta, y las deudas aparte; lo demas, contado")
    check("## EL RESTO (3), SOLO CONTADAS" in index, "indice: la cabecera de lo contado suma lo que cuenta (visto fallar)")
    both = sample_records()
    both["decisions"]["records"].append(decision("two-phases", "confirmed", "2026-09-10", {"phase": "F3 H1"}))
    both_files = {e["file"]: e["template"] for e in B.derived_of(B.build_model(plans(), both, {"date": "", "rows": []}), dirs)}
    check(all("`#two-phases`" in both_files[B.decisions_index_file(key)] for key in ("F3", "H1")) and "`#two-phases`" not in both_files[B.decisions_index_file(B.NO_PHASE)],
          "indice: una decision que nombra dos fases esta en el indice de cada una, y no en el de las que no nombran ninguna (visto fallar)")
    check("- `#cofres` — Cofres (OPEN 2026-09-11) · F3" in index and index.find("`#arneses`") < index.find("`#cofres`"), "indice: cada linea con identidad, titulo, estado, fecha y fases; la mas reciente primero (visto fallar)")
    covered = {s for sec in B.DECISION_SECTIONS for s in sec["states"]}
    check(all(s in covered for s in B.STATES), "indice: todo estado del esquema tiene seccion")
    retired = sample_records()
    retired["decisions"]["records"].append(decision("vieja-regla", "confirmed", "2026-09-10", {"retired": "2026-09-13"}))
    retired_model = B.build_model(plans(), retired, {"date": "", "rows": []})
    by_file = {e["file"]: e["template"] for e in B.derived_of(retired_model, dirs)}
    with_retired = by_file[B.INDEX_DIR + "/decisions-" + B.NO_PHASE + ".md"]
    check("## RETIRADAS (1)" in with_retired and "· retired 2026-09-13" in with_retired and "## CONFIRMADAS (1)" in with_retired and "RETIRADAS 1" in by_file[B.DECISIONS_INDEX_FILE],
          "indice: una retirada sale de su estado y va a RETIRADAS (visto fallar)")
    notes = B.render_notes_index(model, dirs)
    check("## Entregas (1" in notes and "- 2026-09-12 `#2026-09-12-el-seam`" in notes and "- `#lesson-one-thing`" in notes, "indice de notas: entregas con fecha e identidad, lecciones con la suya")
    files = B.derived_of(model, dirs)
    paths = [f["file"] for f in files]
    check(paths[:3] == [B.SUMMARY_FILE, B.DECISIONS_INDEX_FILE, B.NOTES_INDEX_FILE] and len(set(paths)) == len(paths) and all(B.is_index_file(f) for f in paths[3:]),
          "derivados: el resumen, los dos indices principales y, en su directorio, los de fase y mes, cada uno una vez")
    fresh = [{"file": f["file"], "template": f["template"], "stored": B.stamp(f["template"], "2026-09-12")} for f in files]
    check(B.derived_files_are_current(fresh, "2026-09-12") == [], "derivados: el que dice lo mismo no sale")
    today = "hoy " + B.STAMP_MARK + B.PRINT_TOKEN
    stale = B.derived_files_are_current([{"file": "STATUS.txt", "template": today, "stored": B.stamp("ayer " + B.STAMP_MARK + B.PRINT_TOKEN, "2026-09-12")}], "2026-09-12")
    check(len(stale) == 1 and "viejo" in stale[0]["message"], "derivados: el que se quedo viejo sale (visto fallar)")
    stampless = B.derived_files_are_current([{"file": "STATUS.txt", "template": today, "stored": "editado a mano"}], "2026-09-12")
    check(len(stampless) == 1 and "no lleva su huella" in stampless[0]["message"] and "a mano" in stampless[0]["message"], "derivados: el que perdio la huella lo edito una mano (visto fallar)")
    missing = B.derived_files_are_current([{"file": "STATUS.txt", "template": today, "stored": ""}], "2026-09-12")
    check(len(missing) == 1 and "no existe" in missing[0]["message"], "derivados: el que no existe no esta al dia, y no se toma por una edicion (visto fallar)")
    stamped = B.stamp("hola " + B.DATE_TOKEN + " " + B.STAMP_MARK + B.PRINT_TOKEN, "2026-09-12")
    check("hola 2026-09-12" in stamped and B.is_current(stamped, "hola " + B.DATE_TOKEN + " " + B.STAMP_MARK + B.PRINT_TOKEN), "huella: sellar y comprobar al dia")
    verdict = B.parse_verdict("# c\ndate\t2026-09-12\ngate\treglas puras\tGREEN\ngate\tautotest\tRED\n")
    check(verdict["date"] == "2026-09-12" and len(verdict["rows"]) == 2 and verdict["rows"][1]["verdict"] == "RED", "veredicto: se lee lo que escribe verify.py")
    end()


def test_encoding():
    begin("test_encoding")
    decoded = B.decode_text(b"\xef\xbb\xbfhola\r\nmundo\r")
    check(decoded["text"] == "hola\nmundo\n" and decoded["bom"] and decoded["bad_byte"] == -1, "codificacion: el BOM se quita y los finales de linea se pliegan a LF")
    legacy = B.decode_text("café y más".encode("cp1252"))
    check(legacy["bad_byte"] == 3 and "�" in legacy["text"] and not legacy["bom"], "codificacion: un byte que no es UTF-8 se nombra por su posicion y se sustituye, sin traceback (visto fallar)")
    check(B.decode_text(B.UTF8_BOM + "café".encode("cp1252"))["bad_byte"] == 6, "codificacion: la posicion del byte malo cuenta el BOM, como la veria un editor hexadecimal (visto fallar)")
    check(B.document_encoding("a.md", B.decode_text(b"# Titulo\n")) == [], "codificacion: un documento UTF-8 sin BOM no sale")
    bom = B.document_encoding("a.md", decoded)
    check(len(bom) == 1 and bom[0]["kind"] == B.KIND_DATA and "BOM" in bom[0]["message"], "codificacion: un documento con BOM es UN hallazgo de datos que lo dice (visto fallar)")
    bad = B.document_encoding("a.md", legacy)
    check(len(bad) == 1 and bad[0]["kind"] == B.KIND_DATA and "no es UTF-8 (byte 3)" in bad[0]["message"], "codificacion: un documento que no es UTF-8 es un hallazgo de datos con el byte")
    code_bom = B.source_encoding("a.ts", decoded)
    check(code_bom["findings"] == [] and len(code_bom["warnings"]) == 1, "codificacion: en un fuente de codigo el BOM es un aviso, no un rojo (visto fallar)")
    code_bad = B.source_encoding("a.py", legacy)
    check(len(code_bad["findings"]) == 1 and code_bad["findings"][0]["kind"] == B.KIND_ENCODING, "codificacion: un fuente que no es UTF-8 es un hallazgo que se puede excusar")
    agree = []
    for raw in (b"limpio \xe2\x9c\x94\n", B.UTF8_BOM + b"con bom\n", "café\n".encode("cp1252"), B.UTF8_BOM + b"bom y \xe9\n", b""):
        text, problem = V.decode_text(raw)
        board = B.decode_text(raw)
        agree.append(text == board["text"] and (problem == "") == (not board["bom"] and board["bad_byte"] < 0))
    check(all(agree), "codificacion: verify.py y el tablero juzgan igual que bytes son UTF-8 sin BOM (las dos copias se cruzan)")
    end()


def test_links_and_comments():
    begin("test_links_and_comments")
    text = ("ver [guia](docs/guia.md) y ![img](img/a.png \"titulo\")\n[ref]: ../otro.md\n" + TICK + "[no](codigo.md)" + TICK + "\n"
            "```\n[no](bloque.md)\n```\n[web](https://x.y/z) [ancla](#seccion) [mail](mailto:a@b.c) [ang](<con espacio.md>)\n"
            "[^1]: una nota al pie\n[par](a_(b).md)\n[roto](sin-cerrar.md\n")
    found = B.markdown_links(text)
    check([link["value"] for link in found] == ["docs/guia.md", "img/a.png", "../otro.md", "https://x.y/z", "#seccion", "mailto:a@b.c", "con espacio.md", "a_(b).md"],
          "enlaces: en linea, imagen, referencia, angulos y parentesis; ni codigo, ni bloque, ni nota al pie, ni uno sin cerrar (visto fallar)")
    check(found[2]["line"] == 2 and found[3]["line"] == 7, "enlaces: cada uno con su linea")
    tricky = ("[nota]: esto es prosa\n[def]: buena.md \"titulo\"\n\\[x\\](escapado.md) y \\[y](medio.md) y [a [b] c](anidado.md)\n"
              "~~~\n[no](tilde.md)\n~~~\nsin abrir](suelto.md) [raiz](/) [x\\](cierre-escapado.md)\n")
    check([link["value"] for link in B.markdown_links(tricky)] == ["buena.md", "anidado.md", "/"],
          "enlaces: una definicion es destino y como mucho un titulo; corchetes escapados o sin abrir no son enlace; ~~~ es una cerca (visto fallar)")
    check(B.link_path("docs/a.md#seccion") == "docs/a.md" and B.link_path("a%20b.md") == "a b.md" and B.link_path("https://x.y") == ""
          and B.link_path("#solo") == "" and B.link_path("//cdn/x.js") == "", "enlaces: fuera el ancla y la consulta; una URL o un ancla no son rutas")
    paths = {"docs", "docs/guia.md", "README.md", "tools", "tools/board", "tools/board/README.md"}
    check(B.link_resolves("guia.md", "docs", paths) and B.link_resolves("../README.md", "docs", paths) and B.link_resolves("/docs/guia.md", "tools/board", paths),
          "enlaces: resuelven desde el documento que los escribe, y '/' es la raiz")
    check(not B.link_resolves("docs/guia.md", "tools/board", paths), "enlaces: un enlace no resuelve por sufijo, como lo haria un visor (visto fallar)")
    check(not B.link_resolves("../../../fuera.md", "docs", paths) and B.link_resolves("salida/x.md", "", paths, ["salida"]) and B.link_resolves("docs/", "", paths),
          "enlaces: salir del repositorio no resuelve; un arbol generado y un directorio si")
    check(B.link_resolves("/", "docs", paths) and B.link_resolves("./", "", paths) and B.link_resolves("..", "docs", paths),
          "enlaces: la raiz del repositorio existe, se llegue a ella como se llegue (visto fallar)")
    links = [{"value": "nada.md", "line": 3, "doc": "a.md", "dir": ""}, {"value": "nada.md", "line": 9, "doc": "b.md", "dir": ""},
             {"value": "README.md", "line": 4, "doc": "a.md", "dir": ""}, {"value": "https://x.y", "line": 5, "doc": "a.md", "dir": ""}]
    broken = B.linked_files_exist(links, paths)
    check(len(broken) == 1 and broken[0]["kind"] == B.KIND_CITE and broken[0]["key"] == "nada.md" and "b.md:9" in broken[0]["message"], "enlaces: uno roto sale como cita, una vez con todos sus sitios (visto fallar)")
    source = "X = 1  # ver " + TICK + "#nadie" + TICK + "\n    # entera\ny = 'a#b'\nz = \"## no\"\n"
    kept = B.comments_only(source, "#").split("\n")
    check(kept[0] == "# ver " + TICK + "#nadie" + TICK and kept[1] == "# entera", "comentarios: el de final de linea cuenta como el de linea entera (visto fallar)")
    check(kept[2] == "" and kept[3] == "", "comentarios: un prefijo pegado a otro texto esta dentro de una cadena, no es comentario")
    check([s["value"] for s in B.inline_code(B.comments_only(source, "#"))] == ["#nadie"], "comentarios: la cita del comentario final se lee con su linea")
    js = "const u = \"http://x\"; // ver " + TICK + "#id" + TICK + "\n"
    check(B.comments_only(js, "//").startswith("// ver"), "comentarios: '//' dentro de una URL no abre el comentario")
    end()


def test_derived_strict():
    begin("test_derived_strict")
    template = "titulo\n" + B.STAMP_MARK + B.PRINT_TOKEN + " — cambio el " + B.DATE_TOKEN + ".\nlinea verdadera\n"
    sealed = B.stamp(template, "2026-01-02")
    check(B.is_current(sealed, template) and B.stored_date(sealed, template) == "2026-01-02", "derivados: lo sellado esta al dia y su fecha se lee donde la pone la plantilla")
    edited = sealed.replace("linea verdadera", "linea inventada")
    check(B.stored_stamp(edited) == B.fingerprint(template) and not B.is_current(edited, template), "derivados: una edicion a mano que conserva la huella NO esta al dia (visto fallar)")
    judged = B.derived_state(edited, template, "2026-03-01")
    check(judged["state"] == B.DERIVED_EDITED and judged["date"] == "2026-01-02" and B.derived_state(sealed, template, "2026-03-01")["state"] == B.DERIVED_CURRENT,
          "derivados: misma huella y otro texto es una edicion a mano, y se restaura con la fecha que guardaba")
    check(B.derived_state("a mano, sin huella\n", template, "2026-03-01") == {"state": B.DERIVED_EDITED, "date": "2026-03-01", "why": "no lleva su huella"},
          "derivados: un texto sin huella es una edicion a mano y se restaura con la fecha del dia (visto fallar)")
    future = B.derived_state(B.stamp(template, "2030-12-31"), template, "2026-03-01")
    check(future["state"] == B.DERIVED_EDITED and future["date"] == "2026-03-01" and "2030-12-31" in future["why"],
          "derivados: una fecha posterior a hoy la escribio una mano, aunque el resto sea verdad (visto fallar)")
    check(B.derived_state(B.stamp(template, "2026-03-02"), template, "2026-03-01")["state"] == B.DERIVED_CURRENT
          and B.derived_state(B.stamp(template, "2026-03-03"), template, "2026-03-01")["state"] == B.DERIVED_EDITED,
          "derivados: mañana todavia vale (un colaborador al este ya esta en mañana); pasado mañana no (visto fallar)")
    check(B.derived_state("  \n", template, "2026-03-01")["state"] == B.DERIVED_MISSING, "derivados: uno vacio falta, no es una edicion")
    found = B.derived_files_are_current([{"file": "STATUS.txt", "template": template, "stored": edited}], "2026-03-01")
    check(len(found) == 1 and found[0]["kind"] == B.KIND_DERIVED and "a mano" in found[0]["message"], "derivados: la edicion a mano sale como derivado, diciendolo (visto fallar)")
    stale = B.derived_files_are_current([{"file": "STATUS.txt", "template": template.replace("titulo", "otro"), "stored": sealed}], "2026-03-01")
    check(len(stale) == 1 and "viejo" in stale[0]["message"], "derivados: con otras fuentes sigue siendo viejo")
    check(B.is_current(B.stamp("sin fecha " + B.STAMP_MARK + B.PRINT_TOKEN, ""), "sin fecha " + B.STAMP_MARK + B.PRINT_TOKEN), "derivados: una plantilla sin fecha se compara entera")
    end()


def test_gates_file():
    begin("test_gates_file")
    row = V.parse_gate_row("tests | 12.5 | {python} t.py", 3, "py")
    check(row["reference"] == 12.5 and row["budget"] == 60 and row["command"] == '"py" t.py' and not row["legacy"], "gates: tres columnas; el tope es el suelo de 60 s cuando 4 veces la referencia no llega")
    check(V.parse_gate_row("lenta | 40 | x", 1, "py")["budget"] == 160, "gates: el tope es 4 veces la referencia (visto fallar)")
    blank = V.parse_gate_row("x | - | cmd", 1, "py")
    check(blank["reference"] is None and blank["budget"] == V.DEFAULT_BUDGET_SECONDS, "gates: '-' es sin referencia medida y toma el tope por defecto")
    legacy = V.parse_gate_row("x | cmd con espacios | otra", 1, "py")
    check(legacy["legacy"] and legacy["command"] == "cmd con espacios | otra" and legacy["budget"] == V.DEFAULT_BUDGET_SECONDS, "gates: una fila antigua de dos columnas se sigue leyendo, con su '|' en el comando")
    check(V.parse_gate_row("x | {python} t.py", 1, "py")["legacy"], "gates: 'etiqueta | comando' es la forma antigua")
    for bad, says in [("x | abc | cmd", "'abc'"), ("x | 0 | cmd", "'0'"), ("x | nan | cmd", "'nan'"), ("x |  | cmd", "vacia"), ("sin barra", "se esperaba"),
                      ("tests | 5 s | pytest", "'5 s'"), ("x | 1e9 | cmd", "maximo de %d" % V.MAX_REFERENCE_SECONDS)]:
        try:
            V.parse_gate_row(bad, 7, "py")
            check(False, "gates: '%s' tenia que rechazarse" % bad)
        except V.GatesFileError as error:
            check("gates.txt:7" in str(error) and says in str(error), "gates: '%s' se rechaza con su numero de linea (visto fallar)" % bad)
    listing = V.parse_gates("# comentario\n\nuno | 1 | a\ndos | b\n", "py")
    check([g["label"] for g in listing["gates"]] == ["uno", "dos"] and len(listing["warnings"]) == 1 and "gates.txt:4" in listing["warnings"][0], "gates: la fila antigua avisa con su linea")
    try:
        V.parse_gates("uno | 1 | a\nuno | 2 | b\n", "py")
        check(False, "gates: una etiqueta repetida tenia que rechazarse")
    except V.GatesFileError as error:
        check("gates.txt:2" in str(error) and "fila 1" in str(error), "gates: una etiqueta repetida se rechaza (visto fallar)")
    with scratch_tree() as root:
        for content, says in [(b"\xef\xbb\xbfuno | 1 | a\n", "BOM"), ("uno | 1 | café\n".encode("cp1252"), "no es UTF-8")]:
            write(root, "gates.txt", content)
            try:
                V.read_gates(root)
                check(False, "gates: '%s' tenia que rechazarse" % says)
            except V.GatesFileError as error:
                check(says in str(error), "gates: un gates.txt con %s se rechaza diciendolo, sin traceback" % says)
    tagged = V.parse_gate_row("board: tests [harness] | 8.9 | {python} t.py", 1, "py")
    check(tagged["label"] == "board: tests" and tagged["harness"] and tagged["raw"] == "{python} t.py" and not V.parse_gate_row("x | 1 | c", 1, "py")["harness"],
          "gates: la marca [harness] va tras la etiqueta, que queda sin ella, y la fila guarda su comando sin expandir (visto fallar)")
    marked = V.parse_gates("# g\nguard finished\nguard silent\nt [harness] | 1 | c\nu | 1 | d\n", "py")
    check(marked["guards"] == ["guard finished", "guard silent"] and [g["harness"] for g in marked["gates"]] == [True, False],
          "gates: las guardas se declaran en gates.txt, una por fila, con su nombre canonico entero (visto fallar)")
    for bad, says in [("t [otra] | 1 | c\n", "[otra]"), ("guard finished\nguard finished\n", "ya se declara"), ("guard\n", "se esperaba"),
                      ("t [harness] | 1 | c\n", "ninguna 'guard'"), ("suelta sin barra\n", "se esperaba")]:
        try:
            V.parse_gates(bad, "py")
            check(False, "gates: '%s' tenia que rechazarse" % bad.strip())
        except V.GatesFileError as error:
            check(says in str(error) and "gates.txt:" in str(error), "gates: '%s' se rechaza diciendo por que (visto fallar)" % bad.strip().replace("\n", " / "))
    local = V.parse_gate_row("b | 1 | {local:gradlew} build && {local:tools/run} x", 1, "py")["command"]
    check(local == (".\\gradlew build && .\\tools\\run x" if os.name == "nt" else "./gradlew build && ./tools/run x"),
          "gates: {local:NOMBRE} corre un script de la raiz como lo pide el sistema: .\\ en Windows, ./ en el resto (visto fallar)")
    check(V.budget_seconds(None) == 120 and V.budget_seconds(0.1) == 60 and V.budget_seconds(30) == 120, "gates: tope por defecto, suelo y multiplo")
    with open(os.path.join(V.ROOT, V.GATES_FILE), encoding="utf-8") as handle:
        header = " ".join(line.lstrip("#").strip() for line in handle.read().split("\n") if line.startswith("#"))
    stated = ["is %d times its reference" % V.REFERENCE_FACTOR, "never under %d s" % V.BUDGET_FLOOR_SECONDS,
              "its budget is %d s" % V.DEFAULT_BUDGET_SECONDS, "no reference goes over %d s" % V.MAX_REFERENCE_SECONDS]
    check([phrase for phrase in stated if phrase not in header] == [],
          "gates: la cabecera de gates.txt dice las mismas cifras del tope que verify.py usa (las dos copias se cruzan)")
    check(V.parse_args([])["labels"] == [] and not V.parse_args([])["error"] and V.parse_args(["--", "a", "b"])["labels"] == ["a", "b"], "verify: sin argumentos, todas; tras '--', las nombradas")
    check(all(V.parse_args(argv)["error"] for argv in (["board: tests"], ["--"], ["-x"], ["a", "--", "b"])), "verify: cualquier otro argumento se rechaza, no corre todo (visto fallar)")
    check(V.parse_args(["--help"])["help"] and not V.parse_args(["--help"])["error"], "verify: --help es ayuda")
    end()


def test_run_gate():
    begin("test_run_gate")
    with scratch_tree() as root:
        done = V.run_gate(PY + ' -c "print(1); print(2)"', 10, root)
        check(not done["timed_out"] and done["code"] == 0 and done["lines"] == ["1", "2"] and V.verdict_of(done) == V.GREEN, "run_gate: una puerta normal da su codigo y su salida")
        red = V.run_gate(PY + ' -c "import sys; print(\'mal\'); sys.exit(3)"', 10, root)
        check(red["code"] == 3 and V.verdict_of(red) == V.RED and V.last_line(red) == "mal", "run_gate: una puerta roja da su codigo y su ultima linea")
        loud = V.run_gate(LOUD_FAILURE, 10, root)
        check(loud["code"] == 1 and V.last_line(loud) == "Error: el fallo de verdad" and len(loud["lines"]) == 61,
              "run_gate: el error de stderr va detras de la salida de stdout, aunque esta llegue con buffer al salir (visto fallar)")
        with stdin_that_never_ends():
            eof = V.run_gate(PY + ' -c "import sys; print(len(sys.stdin.read()))"', 5, root)
        check(not eof["timed_out"] and eof["lines"] == ["0"], "run_gate: una puerta que lee la entrada recibe su final, no espera a la entrada de verify (visto fallar)")
        write(root, "hola", "#!/bin/sh\necho hola posix \"$1\"\n")
        os.chmod(os.path.join(root, "hola"), 0o755)
        write(root, "hola.bat", "@echo hola windows %1\r\n")
        script = V.run_gate(V.parse_gate_row("h | 1 | {local:hola} uno", 1, "py")["command"], 10, root)
        check(script["code"] == 0 and script["lines"] == ["hola %s uno" % ("windows" if os.name == "nt" else "posix")],
              "run_gate: un script de la raiz por {local:...} corre en este sistema, aunque cmd no busque en el directorio actual (visto fallar)")
        unborn = V.run_gate(PY + ' -c "print(1)"', 5, os.path.join(root, "no-existe"))
        check(unborn["code"] == -1 and V.verdict_of(unborn) == V.RED and "no se pudo lanzar la puerta" in V.last_line(unborn),
              "run_gate: una puerta que no se puede lanzar sale roja con su motivo, sin traceback (visto fallar)")
        write(root, "branch.py", BRANCH_GATE)
        write(root, "branch_middle.py", BRANCH_MIDDLE)
        hung = branch_timeout(root)
        grandchild = pid_in_file(root)
        check(hung["timed_out"] and V.verdict_of(hung) == V.TIMEOUT and hung["seconds"] < 15, "run_gate: una puerta colgada sale TIMEOUT poco despues de su tope, no cuando acaba (visto fallar)")
        check(grandchild > 0 and dead_within(grandchild, 5), "run_gate: muere tambien el nieto que perdio a su padre, al que ningun enlace de padre lleva (visto fallar)")
        check(hung["kill"]["tree"] and "matada, y no queda vivo nada" in V.last_line(hung) and "el proceso de en medio salio" in hung["lines"],
              "run_gate: el informe dice que no queda nada vivo porque lo comprobo, y conserva la salida parcial")
        stop(grandchild)
        if os.name == "nt":
            os.remove(os.path.join(root, "grandchild.pid"))
            blind = branch_timeout(root, lambda: V.TaskkillTree("prueba sin job"))
            grandchild = pid_in_file(root)
            check(grandchild > 0 and process_alive(grandchild), "run_gate: sin job, taskkill no alcanza al nieto huerfano, asi que la prueba es real")
            check(blind["timed_out"] and not blind["kill"]["tree"] and blind["kill"]["gone"] and "no se pudo comprobar que muriera todo lo que lanzo" in V.last_line(blind),
                  "run_gate: sin job, el informe no afirma la muerte de un arbol que no puede ver (visto fallar)")
            stop(grandchild)
            once = V.run_gate(PY + ' -c "print(1)"', 10, root, RefusingJob)
            check(once["code"] == 0 and once["lines"] == ["1"], "run_gate: si el job rechaza la puerta, la creada suspendida no llego a correr y la puerta corre una vez sin job")
            job = V.open_tree()
            check(isinstance(job, V.JobTree), "run_gate: en Windows el arbol de una puerta es un job")
            job.close()
            sleeper = PY + ' -c "import time; time.sleep(30)"'
            with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
                job = V.JobTree()
                process = job.launch(sleeper, root, out, err)
                alive, not_yet = job.active(), job.emptied(time.monotonic())
                job.terminate(process)
                process.wait(timeout=10)
                emptied = job.emptied(time.monotonic() + 5)
                job.close(process)
                check(alive >= 1 and not not_yet and emptied,
                      "job: cuenta lo que vive, no se da por vacio mientras algo vive y si cuando todo murio (visto fallar)")
                job = V.JobTree()
                refused = job.join(0)
                job.close()
                check(refused.startswith("OpenProcess fallo: [WinError"), "job: un proceso que no puede entrar en el job dice por que, con el error de Windows")
                job = V.JobTree()
                process = job.launch(sleeper, root, out, err)
                job.close()
                try:
                    died = process.wait(timeout=10) is not None
                except subprocess.TimeoutExpired:
                    died = False
                    process.kill()
                check(died, "job: si verify muere de golpe (su job se cierra sin matar), la puerta muere con el (visto fallar)")
                if os.path.exists(os.path.join(root, "grandchild.pid")):
                    os.remove(os.path.join(root, "grandchild.pid"))
                job = V.JobTree()
                process = job.launch(HUNG, root, out, err)
                deadline = time.monotonic() + 5
                while not pid_in_file(root) and time.monotonic() < deadline:
                    time.sleep(0.02)
                with patched(job, active=lambda: 0), patched(job.api.kernel, TerminateJobObject=lambda j, c: True):
                    job.terminate(process)
                    premature = job.emptied(time.monotonic() + 0.05)
                job.terminate(process)
                process.wait(timeout=10)
                confirmed = job.emptied(time.monotonic() + 5)
                job.close(process)
                check(not premature and confirmed,
                      "job: emptied espera a los handles de los miembros listados aunque ActiveProcesses ya cuente 0 (visto fallar)")
        orphan = V.run_gate(ORPHAN, 20, root)
        child = pid_after(orphan["lines"], "huerfano")
        check(not orphan["timed_out"] and orphan["code"] == 0 and orphan["seconds"] < 10, "run_gate: una puerta que sale con 0 y deja un hijo con la salida abierta sale VERDE al salir, no TIMEOUT (visto fallar)")
        check(child > 0 and not dead_within(child, 0.5), "run_gate: el hijo de esa puerta sigue vivo: lo que una puerta deja al salir sola es asunto suyo (visto fallar)")
        stop(child)
        if os.path.exists(os.path.join(root, "grandchild.pid")):
            os.remove(os.path.join(root, "grandchild.pid"))
        outcome, kill, started = "volvio", None, time.monotonic()
        try:
            with interrupt_when(lambda: pid_in_file(root) > 0):
                V.run_gate(HUNG, 30, root)
        except KeyboardInterrupt as interrupted:
            outcome, kill = "interrumpida", getattr(interrupted, "kill", None)
        waited = time.monotonic() - started
        grandchild = pid_in_file(root)
        check(outcome == "interrumpida" and waited < 15, "run_gate: un Ctrl+C corta la espera enseguida, no al acabar el tope (visto fallar)")
        check(grandchild > 0 and dead_within(grandchild, 5), "run_gate: un Ctrl+C mata la puerta y su arbol antes de propagarse (visto fallar)")
        check(kill is not None and kill["tree"] and kill["gone"], "run_gate: el Ctrl+C lleva consigo lo que comprobo la muerte del arbol, para no afirmarla a ciegas")
        stop(grandchild)
    end()


def test_gate_environment():
    begin("test_gate_environment")
    with scratch_tree() as own, scratch_tree() as decoy:
        if init_repository(own) and init_repository(decoy):
            config = read_bytes(decoy, ".git/config")
            with environment(GIT_DIR=os.path.join(decoy, ".git")):
                done = V.run_gate("git config core.bare true", 30, own)
            bare = git_run(own, "config", "--get", "core.bare").stdout.decode("utf-8", "replace").strip()
            check(done["code"] == 0 and bare == "true" and read_bytes(decoy, ".git/config") == config,
                  "entorno: una puerta que corre git en su repositorio no escribe en el que apunta el GIT_DIR heredado de un hook (visto fallar)")
        else:
            check(shutil.which("git") is None, "entorno: git init solo puede fallar si git no esta instalado")
    inherited = {"GIT_DIR": "otro/.git", "GIT_WORK_TREE": "otro", "GIT_INDEX_FILE": "otro/.git/index", "PATH": "bin", "GIT_CONFIG_COUNT": "0"}
    check(V.without_git_location(inherited) == {"PATH": "bin", "GIT_CONFIG_COUNT": "0"},
          "entorno: una puerta no hereda las variables que apuntan git a otro repositorio, y si todas las demas (visto fallar)")
    end()


def test_kill_report():
    begin("test_kill_report")
    alive = V.kill_tree(FakeGate(dies_on_kill=False), FakeTree(kills=False, says_empty=True))
    check(not alive["gone"] and not alive["tree"] and "NO se pudo matar la puerta (pid 4242" in V.kill_said(alive) and "sigue viva" in V.kill_said(alive),
          "matar: si la puerta sigue viva, no se afirma ningun arbol aunque la herramienta diga que esta vacio (visto fallar)")
    direct = V.kill_tree(FakeGate(dies_on_kill=True), FakeTree(kills=False, says_empty=False))
    check(direct["gone"] and not direct["tree"] and V.kill_said(direct).startswith("la puerta murio, pero no se pudo comprobar"),
          "matar: si la herramienta del arbol falla, la puerta muere por kill directo y el informe no afirma su arbol (visto fallar)")
    whole = V.kill_tree(FakeGate(dies_on_kill=False), FakeTree(kills=True, says_empty=True))
    check(whole["tree"] and not whole["exited"] and V.kill_said(whole) == "matada, y no queda vivo nada de su arbol de prueba", "matar: el arbol entero, comprobado, se dice")
    before = V.kill_tree(FakeGate(dies_on_kill=False, exited=True), FakeTree(kills=False, says_empty=True))
    check(before["exited"] and V.kill_said(before).startswith("la puerta ya habia salido, y no queda vivo nada"),
          "matar: si la puerta ya habia salido (un Ctrl+C de consola tambien la alcanza), se dice eso y no que fallo la herramienta")
    timed = {"timed_out": True, "budget": 1.5, "lines": [], "seconds": 1.6, "code": -1, "kill": whole}
    check(V.last_line(timed).startswith("sin veredicto tras su tope de 1.5s:") and V.verdict_of(timed) == V.TIMEOUT, "matar: la linea de TIMEOUT dice el tope de la puerta (visto fallar)")
    check(V.growth_of(10.0, 5.0) == "x2.00" and V.growth_of(3.0, None) == "-", "informe: el crecimiento es lo tardado entre la referencia (visto fallar)")
    stat = "4321 (py (raro) x) S 1 4321 4321 0 -1 4194560 100 0 0 0 0"
    check(V.stat_fields(stat) == {"state": "S", "pgrp": 4321} and V.stat_fields("basura") is None, "posix: el estado y el grupo se leen tras el ultimo ')' del nombre")
    stats = [stat, "4322 (hijo) Z 4321 4321 4321 0", "4323 (nieto) R 4322 4321 4321 0", "99 (otro) R 1 99 99 0"]
    check(V.live_members(4321, stats) == 2 and V.live_members(4321, stats[1:2]) == 0 and V.live_members(4321, None) is None,
          "posix: un zombi del grupo cuenta como muerto, y sin /proc no se sabe (visto fallar)")
    with scratch_tree() as root:
        write(root, "proc/12/stat", stat)
        write(root, "proc/self/stat", "no cuenta")
        os.makedirs(os.path.join(root, "proc", "13"))
        check(V.proc_stats(os.path.join(root, "proc")) == [stat] and V.proc_stats(os.path.join(root, "no-existe")) is None,
              "posix: /proc se lee por pid, un proceso que ya salio no cuenta, y sin /proc no hay respuesta")
    previous = signal.getsignal(signal.SIGTERM)
    with V.stop_signals():
        during = signal.getsignal(signal.SIGTERM)
    check(during == V.stop_on and signal.getsignal(signal.SIGTERM) == previous, "señales: SIGTERM toma el camino del Ctrl+C mientras corren las puertas, y despues vuelve lo que habia")
    end()


def test_verify_main():
    begin("test_verify_main")
    with scratch_tree() as root:
        write(root, "gates.txt", "# puertas\nuno | - | {python} -c \"print('uno listo')\"\n"
              "viejo | {python} -c \"print('forma antigua')\"\nboard: build | 0.1 | {python} -c \"print('derivados al dia')\"\n")
        first, said = quietly(V.main, [], root)
        verdict = os.path.join(root, *V.VERDICT_FILE.split(os.sep))
        check(first == 1 and "vuelve a correr" in said and "board: build *" in said and os.path.exists(verdict), "verify: el veredicto cambia, se escribe, se regeneran los derivados y sale 1 (visto fallar)")
        check(said.strip().splitlines()[-1] == V.result_line(3, [], True),
              "verify: su ultima linea es result_line, la que lee quien corre verify.py para saber si solo cambio el veredicto (visto fallar)")
        check("WARNING: gates.txt:3 usa la forma antigua" in said and "/120s" in said and "/60s" in said, "verify: avisa de la fila antigua e imprime segundos frente a tope")
        stored = read_bytes(root, "tools/board/verdict.txt")
        check(b"gate\tuno\tGREEN" in stored and b"gate\tviejo\tGREEN" in stored, "verify: el veredicto guarda cada puerta")
        second, said = quietly(V.main, [], root)
        check(second == 0 and "RESULT: 3 puertas, 0 en rojo" in said, "verify: la siguiente corrida es verde sin tocar nada")
        one, said = quietly(V.main, ["--", "uno"], root)
        check(one == 0 and "RESULT: 1 puertas" in said and read_bytes(root, "tools/board/verdict.txt") == stored, "verify: una sola puerta no escribe el veredicto")
        unknown, said = quietly(V.main, ["--", "nadie"], root)
        check(unknown == 1 and "etiquetas desconocidas" in said, "verify: una etiqueta desconocida es rojo")
        stray, said = quietly(V.main, ["uno"], root)
        check(stray == 2 and "no se corrio ninguna puerta" in said and "GREEN" not in said and read_bytes(root, "tools/board/verdict.txt") == stored, "verify: un argumento sin '--' se rechaza sin correr nada ni tocar el veredicto (visto fallar)")
        write(root, "gates.txt", "guard finished\nrojo | - | {python} -c \"import sys; print('se rompio'); sys.exit(3)\"\n"
              "t [harness] | - | {python} t.py\nsin marca | - | {python} t.py\n")
        write(root, "t.py", "print('ok sin guardas')\n")
        write(root, "tools/board/documents.txt", "harness otro.py\n")
        red, said = quietly(V.main, [], root)
        check(red == 1 and "exit=3" in said and "    | se rompio" in said and "WARNING: ninguna puerta se llama" in said, "verify: una puerta roja sale con su codigo y su cola")
        check("salio 0 sin imprimir sus guardas: guard finished" in said and said.count("sin imprimir sus guardas") == 1,
              "verify: la fila marcada [harness] que sale 0 sin sus guardas es roja, y la que no lleva la marca no (visto fallar)")
        write(root, "gates.txt", "colgada | - | " + HUNG + "\n")
        before = read_bytes(root, "tools/board/verdict.txt")
        for name, deliver in (("Ctrl+C", _thread.interrupt_main), ("SIGTERM", send_sigterm)):
            result, said, started = "volvio sin interrumpirse", "", time.monotonic()
            try:
                with interrupt_when(lambda: pid_in_file(root) > 0, deliver):
                    result, said = quietly(V.main, [], root)
            except KeyboardInterrupt:
                result = "la interrupcion escapo de main"
            waited = time.monotonic() - started
            grandchild = pid_in_file(root)
            check(result == 130 and waited < 15 and read_bytes(root, "tools/board/verdict.txt") == before,
                  "verify: un %s acaba enseguida con 130 y no escribe el veredicto (visto fallar)" % name)
            check("RESULT: interrumpido (%s: matada, y no queda vivo nada" % name in said and "el veredicto no se escribe" in said,
                  "verify: el informe del %s dice que lo paro y lo que comprobo de la muerte del arbol" % name)
            check(grandchild > 0 and dead_within(grandchild, 5), "verify: tras un %s no queda vivo el nieto de la puerta (visto fallar)" % name)
            stop(grandchild)
            if os.path.exists(os.path.join(root, "grandchild.pid")):
                os.remove(os.path.join(root, "grandchild.pid"))
        late = PY + ' -c "import os, time; ((open(\'hung\', \'w\').close(), time.sleep(60)) if os.path.exists(\'mark\') else open(\'mark\', \'w\').close())"'
        write(root, "gates.txt", "board: build | - | " + late + "\n")
        with interrupt_when(lambda: os.path.exists(os.path.join(root, "hung"))):
            result, said = quietly(V.main, [], root)
        stored = read_bytes(root, "tools/board/verdict.txt")
        check(result == 130 and b"gate\tboard: build\tGREEN" in stored and "el veredicto CAMBIO y ya se escribio" in said and "no se escribe" not in said,
              "verify: un Ctrl+C mientras se regeneran los derivados dice que el veredicto ya se escribio, no lo contrario (visto fallar)")
        write(root, "gates.txt", "uno | - | {python} -c \"print('uno')\"\n")
        os.remove(os.path.join(root, "tools", "board", "documents.txt"))
        os.makedirs(os.path.join(root, "tools", "board", "documents.txt"))
        quietly(V.main, [], root)
        indifferent, said = quietly(V.main, [], root)
        check(indifferent == 0 and "documents.txt" not in said, "verify: no lee documents.txt; las guardas y los arneses son de gates.txt (visto fallar)")
        os.remove(os.path.join(root, "gates.txt"))
        os.makedirs(os.path.join(root, "gates.txt"))
        unreadable, said = quietly(V.main, [], root)
        check(unreadable == 1 and "RESULT: gates.txt no se puede leer" in said, "verify: un gates.txt ilegible es una linea RESULT en rojo, no un traceback")
        os.rmdir(os.path.join(root, "gates.txt"))
        remove_tree(os.path.join(root, "tools"))
        os.makedirs(os.path.join(root, "tools", "board", "verdict.txt"))
        blocked = V.store_verdict([("uno", V.GREEN)], root)
        leftovers = [n for n in os.listdir(os.path.join(root, "tools", "board")) if n != "verdict.txt"]
        check(blocked["changed"] and blocked["error"] and leftovers == [], "verify: un veredicto que no se puede escribir se dice, y no deja temporales")
        write(root, "gates.txt", "uno | - | {python} -c \"print(1)\"\n")
        unwritable, said = quietly(V.main, [], root)
        check(unwritable == 1 and "WARNING: el veredicto cambio y no se pudo escribir" in said and "los derivados se regeneraron" not in said,
              "verify: cuando el veredicto no se pudo escribir, la linea RESULT no afirma que los derivados se regeneraron (visto fallar)")
        remove_tree(os.path.join(root, "tools"))
        broken_derived = PY + ' -c "import os, sys; sys.exit(1 if os.path.exists(\'tools/board/verdict.txt\') else 0)"'
        write(root, "gates.txt", "board: build | - | " + broken_derived + "\n")
        derived_red, said = quietly(V.main, [], root)
        check(derived_red == 1 and "RESULT: 1 puertas, 1 en rojo -> board: build" in said,
              "verify: si regenerar los derivados falla tras escribir el veredicto, la puerta sale en rojo en RESULT (visto fallar)")
    end()


def test_atomic_writes():
    begin("test_atomic_writes")
    with scratch_tree() as root:
        for name, writer in (("verify", V.write_atomically), ("board", B.write_atomically)):
            path = os.path.join(root, name, "sub", "f.txt")
            writer(path, "a ✔\nb\n")
            writer(path, "nuevo ✔\nb\n")
            check(read_bytes(root, name + "/sub/f.txt") == "nuevo ✔\nb\n".encode("utf-8") and os.listdir(os.path.dirname(path)) == ["f.txt"],
                  "escritura atomica (%s): reemplaza entero, en UTF-8 y LF, sin dejar temporales (visto fallar)" % name)
            blocked = os.path.join(root, name, "es-un-directorio")
            os.makedirs(blocked)
            try:
                writer(blocked, "x")
                check(False, "escritura atomica (%s): escribir sobre un directorio tenia que fallar" % name)
            except OSError as error:
                check("es un directorio" in str(error) and sorted(os.listdir(os.path.join(root, name))) == ["es-un-directorio", "sub"],
                      "escritura atomica (%s): un fallo se propaga diciendo por que, y no deja temporales" % name)
            folder = os.path.join(root, name, "sub")
            frozen = os.path.join(folder, "solo-lectura.txt")
            writer(frozen, "antes\n")
            os.chmod(frozen, 0o444)
            refused = ""
            try:
                writer(frozen, "despues\n")
            except OSError as error:
                refused = str(error)
            os.chmod(frozen, 0o644)
            check("solo-lectura.txt" in refused and "solo lectura" in refused and read_bytes(root, name + "/sub/solo-lectura.txt") == b"antes\n"
                  and not [n for n in os.listdir(folder) if n.endswith(".tmp")],
                  "escritura atomica (%s): un destino de solo lectura se rechaza nombrandolo, sin tocarlo ni dejar temporales (visto fallar)" % name)
            held = os.path.join(folder, "abierto.txt")
            writer(held, "antes\n")
            reader = open(held, "rb")
            threading.Timer(0.15, reader.close).start()
            writer(held, "despues\n")
            reader.close()
            check(read_bytes(root, name + "/sub/abierto.txt") == b"despues\n",
                  "escritura atomica (%s): un destino que otro programa tiene abierto un momento se reemplaza en cuanto lo suelta (visto fallar)" % name)
            if os.name == "nt":
                failed = ""
                with open(held, "rb"), patched(V, REPLACE_PAUSES=(0.01,)), patched(B, REPLACE_PAUSES=(0.01,)):
                    try:
                        writer(held, "otra\n")
                    except PermissionError as error:
                        failed = str(error)
                check("abierto.txt" in failed and read_bytes(root, name + "/sub/abierto.txt") == b"despues\n" and not [n for n in os.listdir(folder) if n.endswith(".tmp")],
                      "escritura atomica (%s): un destino que no se suelta se rinde tras unos intentos, nombrandolo y sin temporales" % name)
            else:
                os.chmod(held, 0o755)
                writer(held, "otra\n")
                check(os.stat(held).st_mode & 0o777 == 0o755, "escritura atomica (%s): el destino conserva su modo (visto fallar)" % name)
        check(read_bytes(root, "verify/sub/f.txt") == read_bytes(root, "board/sub/f.txt"), "escritura atomica: las dos copias escriben lo mismo")
    end()


def test_board_end_to_end():
    begin("test_board_end_to_end")
    with scratch_tree() as root:
        minimal_tree(root)
        derived = {name: read_bytes(root, name) for name in derived_on_disk(root)}
        check(findings_of(root) == [], "integracion: un arbol minimo construido no tiene hallazgos")
        code, said = quietly(B.check, root)
        check(code == 0 and "0 hallazgos" in said and "por os.walk" in said, "integracion: check sale 0 y dice como leyo el arbol")
        code, said = quietly(B.build, root)
        check(code == 0 and "sin cambios" in said and all(read_bytes(root, n) == derived[n] for n in derived), "integracion: build sobre lo que esta al dia no reescribe nada")
        append(root, "AGENTS.md", "\nVer `docs/no-existe.md`.\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_CITE and found[0]["key"] == "docs/no-existe.md", "integracion: una cita de ruta rota en el contrato sale (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        append(root, "README.md", "\n[guia](docs/no-existe.md) y [plan](docs/ROADMAP.md)\n")
        append(root, B.BOARD_README, "\n[contrato](AGENTS.md) y [bueno](../../AGENTS.md)\n")
        append(root, "docs/registry/decisions/la-base.md", "Ver [la guia](../../guia-perdida.md).\n")
        append(root, "docs/registry/lessons/lesson-something.md", "Ver [el producto](../../../README.md).\n")
        found = sorted(f["key"] for f in findings_of(root))
        check(found == ["../../guia-perdida.md", "AGENTS.md", "docs/no-existe.md"],
              "integracion: los enlaces markdown de los documentos vivos y de los registros que gobiernan se comprueban desde su directorio (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "AGENTS.md", B.UTF8_BOM + read_bytes(root, "AGENTS.md"))
        found = findings_of(root)
        check(len(found) == 1 and found[0]["key"] == "AGENTS.md" and "BOM" in found[0]["message"],
              "integracion: un documento que se lee por varias razones (vivo, arranque, intemporal) da UN hallazgo de codificacion (visto fallar)")
        append(root, "tools/board/documents.txt", "generated salida\n")
        write(root, "salida/informe.md", "# Informe generado\n")
        check(findings_of(root) == found, "integracion: el recorrido sin git no entra en un arbol generado (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "src/store.py", "X = 1  # ver " + TICK + "#nadie" + TICK + "\n# bien: " + TICK + "#la-base" + TICK + "\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_SLUG and found[0]["key"] == "#nadie" and found[0]["where"] == "src/store.py:1", "integracion: una cita #id rota en un comentario de codigo sale, tambien al final de la linea (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "docs/suelto.md", "# Suelto\n")
        write(root, ".pytest_cache/CACHEDIR.TAG", B.CACHE_TAG_SIGNATURE + b"\n")
        write(root, ".pytest_cache/README.md", "# pytest cache directory #\n")
        write(root, "venv/pyvenv.cfg", "home = x\n")
        write(root, "venv/Lib/site-packages/x-1.0.dist-info/LICENSE.md", "licencia\n")
        write(root, "otra-cache/CACHEDIR.TAG", "sin la firma\n")
        write(root, "otra-cache/notas.md", "# Notas\n")
        found = sorted(f["key"] for f in findings_of(root))
        check(found == ["docs/suelto.md", "otra-cache/notas.md"], "integracion: un markdown sin casa sale; la cache de pytest y un venv sin punto no, y una etiqueta sin firma no es cache (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        status_text = read_bytes(root, "STATUS.txt").replace(B.today().encode("utf-8"), b"2001-01-01")
        write(root, "STATUS.txt", status_text)
        check(findings_of(root) == [], "integracion: un derivado sellado en otra fecha pasada sigue al dia")
        write(root, "STATUS.txt", status_text.replace(b"EN CURSO", b"HECHA (a mano)", 1))
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_DERIVED and "a mano" in found[0]["message"], "integracion: un derivado editado a mano con la huella intacta sale (visto fallar)")
        code, said = quietly(B.build, root)
        check(code == 1 and "restaurado STATUS.txt" in said and read_bytes(root, "STATUS.txt") == status_text,
              "integracion: build lo restaura con la fecha que guardaba, no con la de hoy, y sale rojo para que se vea (visto fallar)")
        code, said = quietly(B.build, root)
        check(code == 0 and findings_of(root) == [], "integracion: tras restaurarlo, el siguiente build es verde")
        write(root, "STATUS.txt", "ESTADO escrito a mano entero, sin huella\n")
        found = findings_of(root)
        check(len(found) == 1 and "no lleva su huella" in found[0]["message"], "integracion: un derivado reescrito entero sin su huella sale como edicion a mano (visto fallar)")
        code, said = quietly(B.build, root)
        check(code == 1 and "no lleva su huella" in said and findings_of(root) == [], "integracion: build lo restaura y sale rojo, en vez de borrar la edicion en silencio (visto fallar)")
        write(root, "STATUS.txt", read_bytes(root, "STATUS.txt").replace(B.today().encode("utf-8"), b"2999-12-31"))
        found = findings_of(root)
        check(len(found) == 1 and "posterior a hoy" in found[0]["message"], "integracion: una fecha futura en un derivado sale como edicion a mano (visto fallar)")
        code, said = quietly(B.build, root)
        check(code == 1 and b"2999-12-31" not in read_bytes(root, "STATUS.txt") and findings_of(root) == [], "integracion: build devuelve la fecha de hoy a un derivado con fecha futura, en rojo")
        write(root, "STATUS.txt", B.UTF8_BOM + read_bytes(root, "STATUS.txt"))
        code, said = quietly(B.build, root)
        check(code == 1 and not read_bytes(root, "STATUS.txt").startswith(B.UTF8_BOM) and "UTF-8 sin BOM" in said and findings_of(root) == [],
              "integracion: build reescribe sin BOM un derivado que una herramienta guardo con BOM, en rojo (visto fallar)")
        os.remove(os.path.join(root, "docs", "registry", "NOTES.md"))
        found = findings_of(root)
        check(len(found) == 1 and "no existe" in found[0]["message"], "integracion: un derivado que falta sale, y no como edicion")
        code, said = quietly(B.build, root)
        check(code == 0 and "reescrito docs/registry/NOTES.md" in said and findings_of(root) == [], "integracion: build escribe el derivado que falta, en verde: nadie lo edito")
        notes, summary = read_bytes(root, "docs/registry/NOTES.md"), read_bytes(root, "STATUS.txt")
        write(root, "docs/registry/lessons/lesson-another.md", "---\ntitle: Otra\ndate: 2026-01-02\n---\n**Otra.** mas\n")
        code, said = quietly(B.build, root)
        check(code == 0 and "reescrito docs/registry/NOTES.md" in said and "STATUS.txt" not in said.split("RESULT")[-1]
              and read_bytes(root, "docs/registry/NOTES.md") != notes and read_bytes(root, "STATUS.txt") == summary, "integracion: build reescribe solo el derivado cuyas fuentes cambiaron")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "docs/registry/lessons/lesson-something.md", "---\ntitle: Algo\ndate: 2026-01-01\n---\n**Algo.** café\n".encode("cp1252"))
        code, said = quietly(B.build, root)
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_DATA and "lesson-something.md' no es UTF-8" in found[0]["message"] and code == 0,
              "integracion: un registro en cp1252 es UN hallazgo de datos, sin traceback en build ni en check (visto fallar)")
        write(root, "docs/registry/lessons/lesson-something.md", B.UTF8_BOM + b"---\ntitle: Algo\ndate: 2026-01-01\n---\n**Algo.** bien\n")
        found = findings_of(root)
        check(len(found) == 1 and "BOM" in found[0]["message"], "integracion: un registro con BOM es UN hallazgo que dice BOM, no tres de cabecera (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "CLAUDE.md", B.UTF8_BOM + b"@AGENTS.md\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["key"] == "CLAUDE.md" and "BOM" in found[0]["message"], "integracion: el adaptador con BOM lo dice, en vez de un import que falta")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "src/con_bom.py", B.UTF8_BOM + ("# " + TICK + "#nadie-tras-bom" + TICK + "\n").encode("utf-8"))
        write(root, "src/heredado.py", "# café\nX = 1\n".encode("cp1252"))
        result = B.inspect(root)
        kinds = sorted((f["kind"], f["key"]) for f in result["findings"])
        check(kinds == [(B.KIND_ENCODING, "src/heredado.py"), (B.KIND_SLUG, "#nadie-tras-bom")] and len(result["warnings"]) == 1 and "con_bom.py" in result["warnings"][0],
              "integracion: un fuente con BOM avisa y se lee desde la primera linea; uno en cp1252 es un hallazgo de codificacion (visto fallar)")
        append(root, "tools/board/exceptions.txt", "# Un fuente heredado que aun no se puede convertir.\n%s src/heredado.py\n" % B.KIND_ENCODING)
        kinds = [f["kind"] for f in findings_of(root)]
        check(kinds == [B.KIND_SLUG], "integracion: el hallazgo de codificacion se excusa con su motivo")
    with scratch_tree() as root:
        minimal_tree(root)
        append(root, "tools/board/documents.txt", "live docs/extra.md\n")
        write(root, "docs/extra.md", "# Extra\n\nCita `docs/solo-en-la-prueba.md`.\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["key"] == "docs/solo-en-la-prueba.md", "integracion: los ficheros de datos se leen de la raiz que se pasa, no de donde vive board.py (visto fallar)")
    end()


def test_tree_listing_with_git():
    begin("test_tree_listing_with_git")
    with scratch_tree() as root:
        minimal_tree(root)
        if init_repository(root):
            write(root, ".gitignore", "salida/\n")
            write(root, "salida/informe.md", "# Informe\n")
            write(root, "docs/suelto.md", "# Suelto\n")
            write(root, ".pytest_cache/CACHEDIR.TAG", B.CACHE_TAG_SIGNATURE + b"\n")
            write(root, ".pytest_cache/README.md", "# cache\n")
            write(root, "docs/borrado.md", "# Borrado\n")
            added = git(root, "add", "docs/borrado.md")
            os.remove(os.path.join(root, "docs", "borrado.md"))
            append(root, "README.md", "\nCita `docs/borrado.md`.\n")
            result = B.inspect(root)
            found = sorted((f["kind"], f["key"]) for f in result["findings"])
            check(added and result["stats"]["source"] == "git ls-files", "arbol con git: se lista con git ls-files")
            check(found == [(B.KIND_CITE, "docs/borrado.md"), (B.KIND_DATA, "docs/suelto.md")],
                  "arbol con git: lo que .gitignore excluye no se lee, lo no versionado si, y un fichero borrado del arbol no resuelve (visto fallar)")
        else:
            check(shutil.which("git") is None, "arbol con git: git init solo puede fallar si git no esta instalado")
    with scratch_tree() as root, scratch_tree() as decoy:
        minimal_tree(root)
        if init_repository(root) and init_repository(decoy):
            write(decoy, ".git/info/exclude", "*.md\n")
            outer = os.environ.get("GIT_DIR")
            os.environ["GIT_DIR"] = os.path.join(decoy, ".git")
            try:
                result = B.inspect(root)
            finally:
                if outer is None:
                    del os.environ["GIT_DIR"]
                else:
                    os.environ["GIT_DIR"] = outer
            check(result["findings"] == [] and result["stats"]["source"] == "git ls-files",
                  "arbol con git: un GIT_DIR del entorno (el que exporta un hook) no hace listar otro repositorio (visto fallar)")
        else:
            check(shutil.which("git") is None, "arbol con git: git init solo puede fallar si git no esta instalado")
        listed = B.git_files(root, [], ["README.md", "README.md", "docs/ROADMAP.md"])
        check(listed["files"] == ["README.md", "docs/ROADMAP.md"] and listed["dirs"] == ["docs"],
              "arbol con git: una ruta que git lista dos veces (un conflicto la da una vez por etapa) cuenta una (visto fallar)")
        with patched(B, GIT_LIST=[sys.executable, "-c", "import time; time.sleep(10)"], GIT_SECONDS=0.5):
            said, started = "", time.monotonic()
            try:
                B.git_names(root)
            except B.TreeListError as error:
                said = str(error)
        check("no respondio" in said and time.monotonic() - started < 8, "arbol con git: un git que no responde se corta a su tope y lo dice (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, ".git", "gitdir: ./no-existe\n")
        write(root, "docs/suelto.md", "# Suelto\n")
        result = B.inspect(root)
        found = sorted((f["kind"], f["key"]) for f in result["findings"])
        check(found == [(B.KIND_DATA, ".git"), (B.KIND_DATA, "docs/suelto.md")] and result["stats"]["source"].startswith("os.walk"),
              "arbol con git: si git falla es un hallazgo, y el arbol se recorre igual (visto fallar)")
        lost = B.walk_files(os.path.join(root, "no-existe"), [])
        check(len(lost["findings"]) == 1 and "no se pudo recorrer" in lost["findings"][0]["message"], "recorrido: un directorio que no se puede leer es un hallazgo, no un silencio (visto fallar)")
    code, said = quietly(B.main, ["otra"])
    check(code == 2 and "uso:" in said, "tablero: una orden desconocida dice el uso y sale 2")
    end()


def test_adapters():
    begin("test_adapters")
    with scratch_tree() as root:
        minimal_tree(root)
        append(root, "tools/board/documents.txt", "adapter opencode.json AGENTS.md\n")
        write(root, "opencode.json", '{"instructions": []}\n')
        check(findings_of(root) == [], "integracion: dos adaptadores, uno que importa y otro cuya herramienta ya lee el contrato, llegan a la lectura de arranque")
        write(root, "opencode.json", '{"instructions": ["AGENTS.md"]}\n')
        found = findings_of(root)
        check(len(found) == 1 and found[0]["key"] == "AGENTS.md" and "opencode.json" in found[0]["message"], "integracion: cada adaptador se cruza con la lectura de arranque por su cuenta (visto fallar)")
        write(root, "opencode.json", '{"instructions": [}\n')
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_DATA and "JSON" in found[0]["message"], "integracion: un adaptador que no se puede leer es un hallazgo de datos, no un traceback (visto fallar)")
        write(root, "opencode.json", '{"instructions": []}\n')
        write(root, "tools/board/limits.txt", limits_data(startup=len(read_bytes(root, "AGENTS.md")) + 5))
        found = findings_of(root)
        check(len(found) == 1 and found[0]["key"] == "CLAUDE.md" and found[0]["kind"] == B.KIND_SHAPE,
              "integracion: el contrato cabe en el tope y, con el CLAUDE.md que la herramienta tambien carga, no: sale el adaptador (visto fallar)")
        write(root, "tools/board/limits.txt", limits_data())
        write(root, "tools/board/documents.txt", read_bytes(root, "tools/board/documents.txt").replace(b"adapter CLAUDE.md\n", b""))
        os.remove(os.path.join(root, "opencode.json"))
        found = sorted(f["key"] for f in findings_of(root))
        check(found == ["CLAUDE.md", "opencode.json"], "integracion: un CLAUDE.md que nadie declara adaptador no tiene casa, y un adaptador declarado que no existe sale (visto fallar)")
    end()


def test_harness_rows():
    begin("test_harness_rows")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "gates.txt", "guard finished\nguard silent\nt [harness] | - | {python} tools/t.py\n")
        write(root, "tools/t.py", "print('guard finished')\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_DATA and "guard silent" in found[0]["message"],
              "integracion: el tablero lee de gates.txt que filas son arneses y que guardas llevan (visto fallar)")
        append(root, "tools/t.py", "print('guard silent')\n")
        check(findings_of(root) == [], "integracion: con las dos guardas en el fichero que corre la fila, no sale nada")
        write(root, "gates.txt", "t [nada] | - | {python} tools/t.py\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_DATA and "gates.txt:1" in found[0]["message"],
              "integracion: un gates.txt que verify.py no acepta es un hallazgo de datos del tablero, con su linea (visto fallar)")
        os.remove(os.path.join(root, "gates.txt"))
        found = findings_of(root)
        check(len(found) == 1 and found[0]["key"] == "gates.txt", "integracion: sin gates.txt no hay puertas, y el tablero lo dice (visto fallar)")
    end()


SKILL = "---\nname: audit\ndescription: Antes de pedir un commit.\nlicense: MIT\nmetadata:\n  author: x\n---\n# Auditar\n\nVer `AGENTS.md`.\n"


def test_skills():
    begin("test_skills")
    front = B.skill_frontmatter(SKILL)
    check(front["problem"] == "" and front["fields"]["name"] == "audit" and front["fields"]["description"] == "Antes de pedir un commit.",
          "skills: la cabecera YAML se lee clave a clave, y un mapa anidado no rompe la lectura (visto fallar)")
    folded = B.skill_frontmatter("---\nname: 'audit'\ndescription: >\n  Dos lineas\n  plegadas.\n---\n")
    check(folded["fields"] == {"name": "audit", "description": "Dos lineas plegadas."}, "skills: comillas y un bloque plegado de YAML dan su valor (visto fallar)")
    check("no abre" in B.skill_frontmatter("# Auditar\n")["problem"] and "no se cierra" in B.skill_frontmatter("---\nname: a\n")["problem"],
          "skills: sin cabecera, o sin cerrarla, es un problema que se dice (visto fallar)")
    texts = {"audit": SKILL, "otra": SKILL, "sin-desc": "---\nname: sin-desc\ndescription:\n---\n", "Mal_Nombre": SKILL.replace("audit", "Mal_Nombre")}
    found = B.skills_are_well_formed(".agents/skills", ["audit", "otra", "sin-desc", "Mal_Nombre", "vacia"], texts,
                                     [".agents/skills/audit/SKILL.md", ".agents/skills/otra/SKILL.md", ".agents/skills/sin-desc/SKILL.md", ".agents/skills/fantasma/SKILL.md"])
    said = sorted("%s|%s" % (f["key"], f["message"]) for f in found)
    check(len(found) == 6 and all(f["kind"] == B.KIND_SHAPE for f in found)
          and any("otra" in s and "'name: audit'" in s for s in said) and any("sin-desc" in s and "description" in s for s in said)
          and any("Mal_Nombre" in s and "identidad" in s for s in said) and any("Mal_Nombre" in s and "indice" in s for s in said)
          and any("vacia" in s and "SKILL.md" in s for s in said) and any("fantasma" in s for s in said),
          "skills: name distinto de su carpeta, sin description, carpeta que no es identidad, sin SKILL.md, sin indexar e indexada sin existir salen (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        append(root, "tools/board/documents.txt", "skills .agents/skills\n")
        append(root, "tools/board/prose.txt", "skills 9. Skills del proyecto\n")
        append(root, "AGENTS.md", "\n## 9. Skills del proyecto\n\nCada una, en `.agents/skills/<nombre>/SKILL.md`.\n\n- **audit** — antes de un commit: `.agents/skills/audit/SKILL.md`\n")
        write(root, ".agents/skills/audit/SKILL.md", SKILL.replace("`AGENTS.md`", "`AGENTS.md` y [la base](../../../docs/registry/decisions/la-base.md)"))
        write(root, ".agents/skills/audit/references/pasos.md", "Sin titulo: una referencia. Ver `README.md`.\n")
        check(findings_of(root) == [], "integracion: una skill con su cabecera, indexada en el contrato y con sus referencias tiene casa y no sale (visto fallar)")
        append(root, ".agents/skills/audit/references/pasos.md", "Y [roto](../no-existe.md) y `docs/tampoco.md`.\n")
        write(root, ".agents/skills/nueva/SKILL.md", SKILL.replace("name: audit", "name: nueva"))
        found = sorted((f["kind"], f["key"]) for f in findings_of(root))
        check(found == [(B.KIND_CITE, "../no-existe.md"), (B.KIND_CITE, "docs/tampoco.md"), (B.KIND_SHAPE, "nueva")],
              "integracion: las citas y los enlaces de una skill se comprueban como los de un documento vivo, y una skill sin indexar sale (visto fallar)")
        write(root, "tools/board/prose.txt", prose_data())
        check(one_says(findings_of(root), "'skills'"), "integracion: declarar skills sin la cabecera de su indice en prose.txt es un hallazgo de datos (visto fallar)")
    colon = B.skill_frontmatter("---\nname: a\ndescription: Úsala al cerrar: antes de x\n---\n")
    check("': '" in colon["problem"] and "comillas" in colon["problem"], "skills: un valor sin comillas que lleva ': ' no es YAML y se dice: la herramienta no cargaria la skill (visto fallar)")
    quoted = B.skill_frontmatter("---\nname: a # su carpeta\ndescription: \"Úsala al cerrar: antes de x\"\nlicense: 'it''s' # nota\n---\n")
    check(quoted["problem"] == "" and quoted["fields"] == {"name": "a", "description": "Úsala al cerrar: antes de x", "license": "it's"},
          "skills: entre comillas vale, y un comentario tras el valor no es parte de el, como en YAML (visto fallar)")
    for value in ("[a, b]", "'sin cerrar", "*ancla", "- una lista"):
        check(B.skill_frontmatter("---\nname: a\ndescription: %s\n---\n" % value)["problem"] != "",
              "skills: 'description: %s' no es un texto para YAML, y se dice (visto fallar)" % value)
    end()


TYPES = ["feat", "fix", "docs", "test", "refactor", "chore"]
AGENTS = ["claude", "anthropic", "codex", "openai", "copilot", "cursor agent", "noreply@aider.chat"]


def test_commit_message():
    begin("test_commit_message")
    import commit_message as C
    ok = ["feat(board): read the gates", "fix: one line", "docs(F6, board): x", "chore(H0.1): y", "refactor!: z",
          "Merge branch 'feature/x' into main", "Revert \"feat: x\"", "Reapply \"feat: x\"", "fixup! feat: x", "squash! fix: y", "amend! fix: y",
          "docs: explain the CLAUDE.md adapter\n\nCo-authored-by: Ana Ruiz <ana@example.com>\n"]
    check([m for m in ok if C.problems(m, TYPES, AGENTS)] == [],
          "commit: la forma de la regla dura 3, los asuntos que escribe git y un coautor humano pasan; nombrar a un agente en el asunto no es firmar (visto fallar)")
    for message, says in [("Update board.py", "forma"), ("feature(board): x", "'feature'"), ("feat(Board): x", "forma"), ("feat:x", "forma"),
                          ("", "vacio"), ("# solo comentarios\n\n", "vacio")]:
        found = C.problems(message, TYPES, AGENTS)
        check(len(found) == 1 and says in found[0], "commit: '%s' se rechaza con un motivo (visto fallar)" % message.strip().replace("\n", " "))
    for signed in ["feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n", "feat: x\n\n\U0001F916 Generated with [Claude Code](https://claude.com/claude-code)\n",
                   "feat: x\n\nSigned-off-by: Codex <codex@openai.com>\n", "feat: x\n# Co-authored-by: Cursor Agent <cursoragent@cursor.com>\n",
                   "feat: x\n\nHelped-by: aider <noreply@aider.chat>\n"]:
        found = C.problems(signed, TYPES, AGENTS)
        check(len(found) == 1 and "agente" in found[0], "commit: una firma o coautoria de agente se rechaza, tambien en una linea '#' que git conserva con -m (visto fallar)")
    verbose = ("feat: x\n# Please enter the commit message\n# ------------------------ >8 ------------------------\n# Do not modify\ndiff --git a/x b/x\n"
               "Co-Authored-By: Claude <noreply@anthropic.com>\n")
    check(C.problems(verbose, TYPES, AGENTS) == [], "commit: lo que hay bajo la tijera de 'commit -v' es el diff, que git quita, y no se juzga (visto fallar)")
    fake_scissors = "feat: x\n# ------------------------ >8 ------------------------\nCo-Authored-By: Claude <noreply@anthropic.com>\n"
    check(len(C.problems(fake_scissors, TYPES, AGENTS)) == 1,
          "commit: una tijera sin el diff de 'commit -v' debajo no esconde nada, y lo de debajo se juzga (visto fallar)")
    check(C.problems("\ufefffeat: x\n", TYPES, AGENTS) == [], "commit: un mensaje que un editor guardo con BOM se juzga sin el (visto fallar)")
    for subject, says in [("fix(verify.py): x", "ambito '(verify.py)'"), ("docs(AGENTS): x", "ambito '(AGENTS)'"), ("feat x", "': '"),
                          ("Update x", "tipo en minusculas")]:
        found = C.problems(subject, TYPES, AGENTS)
        check(len(found) == 1 and says in found[0] and "forma" in found[0], "commit: '%s' se rechaza diciendo que parte de la forma no vale (visto fallar)" % subject)
    data = read_bytes(V.ROOT, "tools/board/commits.txt").decode("utf-8")
    types, agents = C.data_rows(data, "type"), C.data_rows(data, "agent")
    for signed in ["Generated with opencode", "Co-authored-by: Amp <amp@ampcode.com>", "Written by Claude Code", "Created with Kiro",
                   "Co-Authored-By: Devin AI <158243242+devin-ai-integration[bot]@users.noreply.github.com>",
                   "Co-authored-by: google-labs-jules[bot] <161369871+google-labs-jules[bot]@users.noreply.github.com>",
                   "Co-authored-by: Windsurf <noreply@windsurf.com>", "Co-authored-by: Qwen-Coder <qwen-coder@alibabacloud.com>"]:
        found = C.problems("feat: x\n\n%s\n" % signed, types, agents)
        check(len(found) == 1 and "agente" in found[0], "commit: '%s' es la firma de un agente con los datos de commits.txt (visto fallar)" % signed)
    check(C.problems("feat: x\n\nCo-authored-by: Jules Verne <jules@example.com>\n", types, agents) == [],
          "commit: un coautor humano que se llama como un agente pasa: esos agentes entran por su direccion o por su cuenta [bot]")
    check(len(C.problems("feat: x\n\nCo-authored-by: helper[bot] <1+helper[bot]@users.noreply.github.com>\n", types, [])) == 1,
          "commit: una cuenta [bot] en un trailer es de una herramienta, aunque commits.txt no la nombre (visto fallar)")
    check(C.data_rows("# --- KEYS ---\n# type : t\n#\ntype feat\ntype  \nagent cursor agent\n", "type") == ["feat"]
          and C.data_rows("agent cursor agent\n", "agent") == ["cursor agent"], "commit: lee sus filas de commits.txt sin importar el tablero, y una fila sin valor no cuenta")
    with scratch_tree() as root:
        write(root, "tools/board/commits.txt", "# --- KEYS ---\n# type : t\n# agent : a\n#\ntype feat\nagent claude\n")
        write(root, "msg", "feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n")
        code, said = quietly(C.main, [os.path.join(root, "msg")], root)
        check(code == 1, "commit: main sale 1 con un mensaje firmado por un agente (visto fallar)")
        write(root, "msg", "feat: x\n")
        check(quietly(C.main, [os.path.join(root, "msg")], root)[0] == 0, "commit: main sale 0 con un mensaje bien formado")
        os.remove(os.path.join(root, "tools", "board", "commits.txt"))
        code, said = quietly(C.main, [os.path.join(root, "msg")], root)
        check(code == 1, "commit: sin commits.txt no hay tipos que comprobar y el commit se rechaza, no se da por bueno (visto fallar)")
    end()


def test_pre_push():
    begin("test_pre_push")
    import pre_push as P
    head, other, zero = "a" * 40, "b" * 40, "0" * 40
    refs = P.pushed_refs("refs/heads/main %s refs/heads/main %s\n(delete) %s refs/heads/x %s\n\n" % (head, other, zero, other))
    check([r["local_ref"] for r in refs] == ["refs/heads/main", "(delete)"] and refs[1]["local_sha"] == zero, "pre-push: lee las referencias que git le da por la entrada")
    check(P.push_problems(refs, head, {head: head}) == [], "pre-push: empujar HEAD, o borrar una rama remota, no tiene problema")
    old = P.pushed_refs("refs/heads/vieja %s refs/heads/vieja %s\n" % (other, zero))
    found = P.push_problems(old, head, {other: other})
    check(len(found) == 1 and "refs/heads/vieja" in found[0] and "HEAD" in found[0], "pre-push: empujar un commit que no es HEAD se rechaza: las puertas verifican el arbol, que es HEAD (visto fallar)")
    tag = P.pushed_refs("refs/tags/v1 %s refs/tags/v1 %s\n" % (other, zero))
    check(P.push_problems(tag, head, {other: head}) == [], "pre-push: una etiqueta anotada sobre HEAD se juzga por el commit al que apunta")
    deletion = "(delete) %s refs/heads/main %s\n" % (zero, head)
    malformed = ("garbage\n", "(delete) 0 refs/heads/main x\n", "garbage\n" + deletion,
                 "refs/heads/main %s refs/heads/main %s extra\n" % (head, zero),
                 "refs/heads/main %s refs/heads/main %s\n" % ("g" * 40, zero),
                 "refs/heads/main %s refs/heads/main %s\n" % ("a" * 64, zero),
                 "refs/heads/main %s refs/heads/main %s\n" % (zero, head),
                 "(delete) %s refs/heads/main %s\n" % (head, other),
                 "(delete) %s refs/heads/main %s\n" % (zero, zero),
                 "(delete) %s main %s\n" % (zero, head))

    def unexpected(*args, **kwargs):
        raise AssertionError("malformed input must not call git or a gate")
    for text in malformed:
        with patched(P, git=unexpected), patched(P.subprocess, run=unexpected):
            code, said = quietly(P.main, [], "unused", io.StringIO(text))
        check(code == 1 and "entrada" in said, "pre-push: la entrada malformada se rechaza antes de git o las puertas (visto fallar) %r" % text)
    for size in (40, 64):
        rows = P.pushed_refs("HEAD %s refs/heads/main %s\n" % ("a" * size, "0" * size))
        check(len(rows) == 1 and rows[0]["local_ref"] == "HEAD" and not P.is_deletion(rows[0]),
              "pre-push: una referencia SHA de %d caracteres completa sigue admitida" % size)
        for text in ("", " \n\n", "(delete) %s refs/heads/main %s\n" % ("0" * size, "a" * size)):
            with patched(P, git=unexpected), patched(P.subprocess, run=unexpected):
                code, said = quietly(P.main, [], "unused", io.StringIO(text))
            check(code == 0, "pre-push: vacio o borrado completo de %d caracteres no ejecuta puertas" % size)
    status = P.tree_changes(" M a.py\0?? nuevo.md\0R  b.py\0viejo.py\0A  c.py\0")
    check(status == {"tracked": ["a.py", "b.py", "c.py"], "untracked": ["nuevo.md"]}, "pre-push: separa lo versionado que cambio de lo no versionado, con renombrados (visto fallar)")
    with scratch_tree() as root:
        write(root, "sucio.txt", "sin commitear\n")
        code, said = quietly(P.main, [], root, io.StringIO("(delete) %s refs/heads/x %s\n" % (zero, other)))
        check(code == 0 and "solo se borran" in said and "RESULT" not in said,
              "pre-push: un push que solo borra ramas remotas no publica nada que verificar: pasa sin mirar el arbol ni correr las puertas (visto fallar)")
    red = P.refused_why([])
    changed = P.refused_why(["tools/board/verdict.txt"])
    unknown = P.refused_why(None)
    check("rojo" in red and "commitea" not in red and "verdict.txt" in changed and "commitea" in changed and "rojo" in changed and "rojo" in unknown and "commitea" in unknown,
          "pre-push: tras unas puertas que no salen en verde dice lo que toca: arreglar las rojas, o commitear los derivados si solo cambio el veredicto (visto fallar)")
    if shutil.which("git") is not None:
        with scratch_tree() as root:
            write(root, "a.txt", "a\n")
            init_repository(root)
            git_run(root, "add", "-A")
            git_run(root, "commit", "-q", "--no-verify", "-m", "chore: start")
            git_run(root, "tag", "-a", "v1", "-m", "v1")
            tag = git_run(root, "rev-parse", "v1").stdout.decode().strip()
            commit = git_run(root, "rev-parse", "HEAD").stdout.decode().strip()
            judged = P.check_push(root, P.pushed_refs("refs/tags/v1 %s refs/tags/v1 %s\n" % (tag, zero)))
            check(tag != commit and judged == {"problems": []},
                  "pre-push: una etiqueta anotada sobre HEAD es HEAD: git le da la etiqueta, y se resuelve a su commit (visto fallar)")
    end()


def git_run(root, *args, **extra):
    """git in `root` with a fixed identity, its result whole: the hooks' output is what is checked."""
    env = sanitized_env()
    env.update(extra.pop("env", {}))
    return subprocess.run(["git", "-c", "init.defaultBranch=main", "-c", "core.autocrlf=false", "-c", "user.name=Prueba",
                           "-c", "user.email=prueba@example.com"] + list(args), cwd=root, env=env, stdin=subprocess.DEVNULL,
                          capture_output=True, timeout=60, **extra)


def hooked_repository(root):
    """A repository with the engine's hooks, the scripts they run and one gate, committed."""
    for rel in ["verify.py", "tools/board/board.py", ".githooks/pre-push", ".githooks/commit-msg", ".githooks/python.sh", "tools/board/commit_message.py",
                "tools/board/pre_push.py", "tools/board/commits.txt"]:
        write(root, rel, read_bytes(V.ROOT, rel))
    write(root, "gates.txt", "uno | - | {python} -c \"print('verde')\"\n")
    write(root, ".gitignore", "__pycache__/\n")
    # Index modes alone do not make hooks executable on a POSIX filesystem.
    for hook in ("pre-push", "commit-msg"):
        os.chmod(os.path.join(root, ".githooks", hook), 0o755)
    init_repository(root)
    git(root, "config", "core.hooksPath", ".githooks")
    quietly(V.main, [], root)
    git(root, "add", "-A")
    git(root, "update-index", "--chmod=+x", ".githooks/pre-push", ".githooks/commit-msg")


def whole_output(said):
    """Every line a short step printed, each one indented under the name of
    the check that failed: when git and a hook fail, the cause sits in the
    middle (the remote's error, before git's summary), past what last_words
    keeps."""
    return "".join("\n    " + line for line in said.strip().splitlines())


def test_hooks_through_git():
    begin("test_hooks_through_git")
    shown = whole_output("uno  GREEN\nremote: error: unable to write file: Filename too long\nerror: failed to push some refs\n")
    check(shown == "\n    uno  GREEN\n    remote: error: unable to write file: Filename too long\n    error: failed to push some refs",
          "hooks: un check de un push que falla ensena todo lo que dijeron el hook y git, una linea sangrada cada vez (visto fallar)")
    if shutil.which("git") is None:
        check(True, "hooks: sin git en esta maquina no hay hooks que probar")
        end()
        return
    env = {"PYTHON": sys.executable} if " " not in sys.executable else {}
    with scratch_tree() as root, scratch_tree() as remote:
        hooked_repository(root)
        bad = git_run(root, "commit", "-q", "-m", "Update everything", env=env)
        said = bad.stderr.decode("utf-8", "replace")
        check(bad.returncode != 0 and "commit-msg" in said and "forma" in said, "hooks: git commit pasa por commit-msg, que rechaza un asunto sin forma (visto fallar)")
        signed = git_run(root, "commit", "-q", "-m", "chore: start", "-m", "Co-Authored-By: Claude <noreply@anthropic.com>", env=env)
        check(signed.returncode != 0, "hooks: commit-msg rechaza la coautoria de un agente escrita con -m")
        good = git_run(root, "commit", "-q", "-m", "chore: start", env=env)
        check(good.returncode == 0, "hooks: un mensaje bien formado se commitea (%s)" % good.stderr.decode("utf-8", "replace").strip()[:120])
        init_repository(remote, "--bare")
        git(root, "remote", "add", "origin", remote)
        write(root, "gates.txt", read_bytes(root, "gates.txt") + b"# sin commitear\n")
        dirty = git_run(root, "push", "-q", "origin", "main", env=env)
        said = dirty.stderr.decode("utf-8", "replace")
        check(dirty.returncode != 0 and "gates.txt" in said and not git(remote, "rev-parse", "--verify", "-q", "main"),
              "hooks: pre-push rechaza empujar con cambios versionados sin commitear: las puertas verificarian otra cosa (visto fallar)")
        git(root, "checkout", "-q", "--", "gates.txt")
        write(root, "suelto.txt", "no versionado\n")
        untracked = git_run(root, "push", "-q", "origin", "main", env=env)
        said = untracked.stderr.decode("utf-8", "replace")
        check(untracked.returncode != 0 and "suelto.txt" in said and not git(remote, "rev-parse", "--verify", "-q", "main"),
              "hooks: pre-push rechaza empujar con archivos sin versionar: una puerta podria pasar por un archivo que no va en el push (visto fallar)")
        os.remove(os.path.join(root, "suelto.txt"))
        clean = git_run(root, "push", "-q", "origin", "main", env=env)
        said = clean.stdout.decode("utf-8", "replace") + clean.stderr.decode("utf-8", "replace")
        pushed = clean.returncode == 0 and "RESULT: 1 puertas, 0 en rojo" in said and git(remote, "rev-parse", "--verify", "-q", "main")
        check(pushed, "hooks: con el arbol limpio, pre-push corre las puertas y empuja (visto fallar)%s"
              % ("" if pushed else whole_output(said)))
        git(root, "branch", "vieja")
        write(root, "otro.txt", "x\n")
        git(root, "add", "otro.txt")
        git_run(root, "commit", "-q", "-m", "chore: move on", env=env)
        old = git_run(root, "push", "-q", "origin", "vieja", env=env)
        check(old.returncode != 0 and "HEAD" in old.stderr.decode("utf-8", "replace") and not git(remote, "rev-parse", "--verify", "-q", "vieja"),
              "hooks: pre-push rechaza empujar una rama que no es HEAD (visto fallar)")
        published = git_run(remote, "rev-parse", "main").stdout
        write(root, "gates.txt", "ensucia | - | {python} -c \"open('residuo.txt', 'w').write('x')\"\n")
        # The verdict of the new gate is settled and committed first, as a real
        # change to gates.txt would be, so the push reaches the check after the gates.
        quietly(V.main, [], root)
        os.remove(os.path.join(root, "residuo.txt"))
        git(root, "add", "-A")
        git_run(root, "commit", "-q", "-m", "chore: gate leaves untracked file", env=env)
        leaked = git_run(root, "push", "-q", "origin", "main", env=env)
        said = leaked.stderr.decode("utf-8", "replace")
        if os.path.exists(os.path.join(root, "residuo.txt")):
            os.remove(os.path.join(root, "residuo.txt"))
        check(leaked.returncode != 0 and "residuo.txt" in said and "mientras corrian" in said and git_run(remote, "rev-parse", "main").stdout == published,
              "hooks: si una puerta deja un archivo sin versionar al correr, pre-push rechaza el push (visto fallar)%s"
              % ("" if leaked.returncode != 0 and "residuo.txt" in said else whole_output(said)))
        write(root, "gates.txt", "rojo | - | {python} -c \"import sys; sys.exit(1)\"\n")
        git_run(root, "commit", "-q", "-am", "chore: break the gates", env=env)
        red = git_run(root, "push", "-q", "origin", "main", env=env)
        check(red.returncode != 0 and published and git_run(remote, "rev-parse", "main").stdout == published,
              "hooks: con una puerta en rojo, pre-push rechaza el push y el remoto no cambia (visto fallar)")
    end()


# The length of the folder of the bare remote in test_long_paths: what git
# writes there while it receives a push (objects/tmp_objdir-incoming-*/xx/<38
# hex digits>, 77 characters more) goes past 260, and what stays
# (objects/xx/<38>) does not, so the folder can be removed on any Windows.
DEEP_REMOTE = 200


def test_long_paths():
    """Every repository this suite makes itself is made by init_repository,
    with core.longpaths. Here, where git alone writes the long path whatever
    the machine allows: a bare remote in a deep folder receiving a push, which
    a deep temporary folder makes of the hooks' remote."""
    begin("test_long_paths")
    if shutil.which("git") is None:
        check(True, "rutas largas: sin git no hay repositorios que probar")
        end()
        return
    with scratch_tree() as root, scratch_tree() as deep:
        write(root, "a.txt", "a\n")
        commit_all(root)
        remote = os.path.join(deep, "r" * max(1, DEEP_REMOTE - len(deep) - 1))
        os.makedirs(remote)
        init_repository(remote, "--bare")
        git(root, "remote", "add", "origin", remote)
        done = git_run(root, "push", "-q", "origin", "main")
        said = done.stdout.decode("utf-8", "replace") + done.stderr.decode("utf-8", "replace")
        pushed = done.returncode == 0 and git(remote, "rev-parse", "--verify", "-q", "main")
        check(pushed, "rutas largas: un remoto desnudo en una carpeta de %d caracteres recibe un push: los repositorios de la suite llevan"
              " core.longpaths (visto fallar)%s" % (len(remote), "" if pushed else whole_output(said)))
    end()


def test_python_discovery():
    """Both hooks find a real Python 3.8+ the same way (.githooks/python.sh).
    git runs a '!' alias with the shell it runs hooks with, so the test asks
    that shell, on a PATH where `python3` is a Store stub that runs nothing and
    `python` is Python 2."""
    begin("test_python_discovery")
    if shutil.which("git") is None:
        check(True, "hooks: sin git en esta maquina no hay shell de hooks que probar")
        end()
        return
    with scratch_tree() as root:
        real = sys.executable.replace("\\", "/")
        for name, text in (("python3", "#!/bin/sh\nexit 9009\n"), ("python", "#!/bin/sh\nexit 1\n"),
                           ("py", "#!/bin/sh\n[ \"$1\" = \"-3\" ] && shift\nexec \"%s\" \"$@\"\n" % real)):
            write(root, "bin/" + name, text)
            os.chmod(os.path.join(root, "bin", name), 0o755)
        source = os.path.join(V.ROOT, ".githooks", "python.sh").replace("\\", "/")
        path = os.path.join(root, "bin") + os.pathsep + os.environ.get("PATH", "")

        def found(python):
            done = git_run(root, "-c", "alias.found=!. \"%s\" && find_python" % source, "found", env={"PATH": path, "PYTHON": python})
            return done.stdout.decode("utf-8", "replace").strip() if done.returncode == 0 else "(ninguno)"

        check(found("") == "py -3", "hooks: un stub de la Store que no corre nada y un Python 2 no valen; el primero que es 3.8 o posterior si (visto fallar)")
        check(found("no-existe -x") == "py -3", "hooks: un PYTHON del entorno que no funciona no vale, y se sigue buscando (visto fallar)")
        if " " not in real:
            check(found(real) == real, "hooks: el PYTHON del entorno que funciona va primero")
    end()


def test_hook_modes():
    begin("test_hook_modes")
    entries = [("100644", ".githooks/pre-push"), ("100755", ".githooks/commit-msg"), ("100644", ".githooks/python.sh")]
    found = B.hooks_are_executable(entries)
    check(len(found) == 1 and found[0]["key"] == ".githooks/pre-push" and "100644" in found[0]["message"] and "--chmod=+x" in found[0]["message"],
          "hooks: un hook (sin extension) que el indice no tiene como ejecutable sale; un fichero que los hooks cargan no (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        if init_repository(root):
            write(root, ".githooks/pre-push", "#!/bin/sh\nexit 0\n")
            git(root, "add", ".githooks/pre-push")
            git(root, "update-index", "--chmod=-x", ".githooks/pre-push")
            found = [f for f in findings_of(root) if f["key"] == ".githooks/pre-push"]
            check(len(found) == 1, "integracion: con .git, un hook no ejecutable en el indice sale (visto fallar)")
            git(root, "update-index", "--chmod=+x", ".githooks/pre-push")
            check([f for f in findings_of(root) if f["key"] == ".githooks/pre-push"] == [], "integracion: tras update-index --chmod=+x ya no sale")
        else:
            check(shutil.which("git") is None, "hooks: git init solo puede fallar si git no esta instalado")
    end()


def test_runner_by_its_path():
    begin("test_runner_by_its_path")
    with scratch_tree() as root:
        for rel in ("verify.py", "tools/board/board.py"):
            write(root, rel, read_bytes(V.ROOT, rel))
        write(root, "verify/__init__.py", "raise SystemExit('el paquete verify del producto')\n")
        done = subprocess.run([sys.executable, "-c", "import sys; sys.path.insert(0, 'tools/board'); import board; print(board.V.__file__)"],
                              cwd=root, stdin=subprocess.DEVNULL, capture_output=True, timeout=60)
        said = (done.stdout + done.stderr).decode("utf-8", "replace").strip()
        check(done.returncode == 0 and said.endswith("verify.py") and "del producto" not in said,
              "tablero: carga verify.py por su ruta; un paquete 'verify' del producto en la raiz no lo suplanta (visto fallar)")
    end()


def test_record_rules():
    begin("test_record_rules")
    walked = B.read_dir("docs/registry/deliveries", [".gitkeep", "una.md"], lambda f: "---\ntitle: a\ndate: 2026-01-01\n---\n")
    check(len(walked["records"]) == 1 and walked["problems"] == [],
          "registro: un fichero oculto ('.gitkeep', que guarda en git un directorio vacio) no es un registro ni un problema (visto fallar)")
    seed = record("hook.md", {"title": "a", "state": "confirmed", "date": "2026-09-21", "origin": "agentic-scaffold"})
    check(B.validate_record(seed, "decision", []) == [], "registro: una decision puede declarar su origen, como una leccion (visto fallar)")
    check(one_says(B.validate_record(record("x.md", {"title": "a", "date": "2026-09-21", "origin": "x"}), "delivery", []), "no existe"),
          "registro: una entrega no lleva origen")
    groups = groups_of([decision("d" * 80, "confirmed", "2026-09-11")], [lesson("l" * 81, "2026-09-11")])
    long_ids = B.record_ids_within(list(groups.values()), 80, B.IDENTITY_LIMIT)
    check(len(long_ids) == 1 and long_ids[0]["kind"] == B.KIND_RECORD and long_ids[0]["key"] == "#" + "l" * 81 and "81 caracteres" in long_ids[0]["message"],
          "identidad: una de 81 caracteres pasa del tope de 80 y una de 80 no (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "docs/registry/lessons/lesson-%s.md" % ("x" * 80), "---\ntitle: Larga\ndate: 2026-01-02\n---\n**Larga.** x\n")
        found = [f for f in findings_of(root) if f["kind"] == B.KIND_RECORD]
        check(len(found) == 1 and B.IDENTITY_LIMIT in found[0]["message"], "integracion: una identidad que pasa del tope de limits.txt sale como registro (visto fallar)")
        write(root, "tools/board/limits.txt", limits_data().replace("identity 80\n", ""))
        check(one_says(findings_of(root), "tope '%s'" % B.IDENTITY_LIMIT), "integracion: limits.txt sin tope de identidad es un hallazgo de datos (visto fallar)")
    end()


def test_prose_is_data():
    begin("test_prose_is_data")
    words = B.state_words(["ABIERTA"])
    check("ABIERTA" in words and "CONFIRMED" in words and "OPEN" in words,
          "prosa: las palabras de estado son las del idioma del equipo y los estados del esquema en mayusculas (visto fallar)")
    check(B.state_word_in_opening("**Titulo (ABIERTA):** x", words) == "ABIERTA" and B.state_word_in_opening("**Titulo (CONFIRMED)** x", words) == "CONFIRMED",
          "prosa: un cuerpo que repite su estado sale, en el idioma del equipo y con el valor del esquema (visto fallar)")
    check(B.state_word_in_opening("**Titulo (ABIERTA):** x", B.state_words([])) == "", "prosa: una palabra que prose.txt no declara no se adivina")
    with scratch_tree() as root:
        minimal_tree(root, authority="4. Where each thing lives")
        check(findings_of(root) == [], "prosa: las cabeceras que el tablero lee por nombre salen de prose.txt, no del codigo (visto fallar)")
        append(root, "AGENTS.md", "| Notas | `docs/notas.md` | sin declarar |\n")
        write(root, "docs/notas.md", "# Notas\n")
        undeclared = [f for f in findings_of(root) if "manda en" in f["message"]]
        check(len(undeclared) == 1 and undeclared[0]["key"] == "docs/notas.md",
              "prosa: la tabla de autoridad se lee bajo la cabecera que declara prose.txt (visto fallar)")
        remove_lines = read_bytes(root, "AGENTS.md").decode("utf-8").replace("| Notas | `docs/notas.md` | sin declarar |\n", "")
        write(root, "AGENTS.md", remove_lines)
        os.remove(os.path.join(root, "docs", "notas.md"))
        write(root, "tools/board/prose.txt", prose_data(authority="4. Where each thing lives", words=["ZANJADA"]))
        append(root, "docs/registry/decisions/la-base.md", "\n**Otra (ZANJADA).**\n")
        write(root, "docs/registry/decisions/repetida.md", "---\ntitle: Repetida\nstate: confirmed\ndate: 2026-01-01\n---\n**Repetida (ZANJADA).** x\n")
        found = [f for f in findings_of(root) if f["kind"] == B.KIND_RECORD]
        check(len(found) == 1 and found[0]["key"] == "#repetida", "prosa: la palabra de estado declarada en prose.txt la lee la comprobacion del cuerpo (visto fallar)")
        write(root, "tools/board/prose.txt", legend(PROSE_KEYS) + "authority 4. Where each thing lives\nfields Campos\nfields Otra\n")
        os.remove(os.path.join(root, "docs", "registry", "decisions", "repetida.md"))
        found = findings_of(root)
        check(one_says(found, "'checklist'") and one_says(found, "'fields'") and all(f["kind"] in (B.KIND_DATA, B.KIND_DERIVED) for f in found),
              "prosa: una cabecera que falta o se repite en prose.txt es un hallazgo de datos, no un permiso para leer cualquier seccion (visto fallar)")
        check(one_says(found, "'%s'" % B.PENDING_KEY),
              "prosa: sin la cabecera de la seccion por fusionar en prose.txt, el tablero no sabria que seccion no puede quedar en el contrato: es un hallazgo de datos (visto fallar)")
    end()


def test_order_line_and_parts():
    begin("test_order_line_and_parts")
    headers = B.phase_headers("## F0 — Base (DONE)\n## F1 — Uno (IN PROGRESS)\n## F2 — Dos (PENDING)\n", ["F"])
    line = B.order_lines("**F0 ✔ → F1 (IN PROGRESS) → construccion → [jefes: sin decidir] → tras F1 → F2**\n", ["F"])
    found = B.order_and_headers_agree(headers, line, "p.md", ["F"])
    check(sorted(f["key"] for f in found) == ["[jefes: sin decidir]", "construccion", "tras F1"] and all(f["kind"] == B.KIND_ORDER for f in found),
          "orden: la linea de orden solo nombra fases de su plan; un nombre suelto, una duda entre corchetes o un paso que no empieza por su fase salen (visto fallar)")
    dotted = B.order_lines("**F0 ✔ · F1 (IN PROGRESS) → F2**\n", ["F"])
    check(B.order_and_headers_agree(headers, dotted, "p.md", ["F"]) == [], "orden: '·' separa como la flecha")
    pending = B.phase_headers("## F0 — Base (DONE)\n## F1 — Uno (PENDING)\n## F2 — Dos (PENDING)\n", ["F"])
    dots = B.order_lines("**F0 ✔ · F1 · F2**\n", ["F"])
    check(len(dots) == 1 and B.order_and_headers_agree(pending, dots, "p.md", ["F"]) == [], "orden: una linea separada solo por '·' tambien es la linea de orden (visto fallar)")
    for step in ("F1 [duda: sin decidir]", "F1 o F2", "F1 candidata-a-fase", "F1 (una) y (otra)"):
        found = B.order_and_headers_agree(pending, B.order_lines("**F0 ✔ → %s → F2**\n" % step, ["F"]), "p.md", ["F"])
        check([f["key"] for f in found if "solo nombra fases" in f["message"]] == [step],
              "orden: '%s' no es un paso: tras su fase solo caben '✔' o un parentesis (visto fallar)" % step)
    phases = {"F0": {"title": "Base", "marker": B.DONE}, "F1": {"title": "Uno", "marker": B.IN_PROGRESS}}
    steps = B.order_steps("**F0 ✔ → F1 (IN PROGRESS) → construccion**", phases, ["F"])
    check([s["kind"] for s in steps] == ["phase", "phase"], "orden: el resumen no pinta lo que no es una fase (visto fallar)")
    plan = ("## F1 — Uno (IN PROGRESS)\n\n- **Partes:**\n  1. **Hecha — DONE.** x\n  2. **ABANDONED en mayusculas.** x\n"
            "  3. **Sin marca.** Al entregarla se marca DONE\n     citando su entrega.\n  4. **A medias — IN PROGRESS.**\n"
            "  5. Sin negrita: al cerrarla se marca DONE citando su entrega.\n")
    parts = B.parts_of(B.section(plan, "F1 "))
    check([p["state"] for p in parts] == [B.DONE, B.PENDING, B.PENDING, B.IN_PROGRESS, B.PENDING],
          "partes: una parte sin marca esta PENDING, la marca vive solo en su nombre en negrita y no en su prosa, y solo cuenta como palabra entera (visto fallar)")
    check(parts[4]["title"] == "Sin negrita", "partes: una parte sin negrita se nombra por su texto hasta la primera pausa (visto fallar)")
    model = B.build_model([{"axis": "F", "file": "p.md", "text": "**F1 (IN PROGRESS)**\n\n" + plan}], groups_of([]), {"date": "", "rows": []})
    shown = [row.split()[-1] for row in B.render_summary(model).split("\n") if row.startswith("  F1.")]
    check(shown == ["HECHA", "PENDIENTE", "PENDIENTE", "CURSO", "PENDIENTE"], "partes: el resumen dice PENDIENTE de la parte sin marca, no NO DERIVABLE (visto fallar)")
    end()


def big_registry():
    """Eight hundred decisions over ten product phases, two tooling ones and
    none; three hundred deliveries over three months; fifty lessons."""
    states = ["confirmed"] * 6 + ["resolved", "discarded", "open", "provisional"]
    decisions = []
    for n in range(800):
        extra = {"phase": "F%d" % (n % 10)} if n % 4 else {}
        if n % 50 == 0:
            extra = {"phase": "H%d" % (n % 2)}
        state = states[n % len(states)]
        if state == "open" and "phase" not in extra:
            extra["phase"] = "none"
        if n % 37 == 0 and state == "confirmed":
            extra["retired"] = "2026-09-30"
        if n % 41 == 0:
            extra.update({"type": "debt", "criterion": "Se paga", "phase": extra.get("phase", "F1")})
        decisions.append(decision("decision-%03d" % n, state, "2026-%02d-%02d" % (7 + n % 3, 1 + n % 28), extra))
    deliveries = [delivery("2026-%02d-%02d-entrega-%03d" % (7 + n % 3, 1 + n % 28, n), "2026-%02d-%02d" % (7 + n % 3, 1 + n % 28)) for n in range(300)]
    lessons = [lesson("lesson-%02d" % n, "2026-09-%02d" % (1 + n % 28)) for n in range(50)]
    return groups_of(decisions, lessons, deliveries)


def test_split_indexes():
    begin("test_split_indexes")
    product = "**" + " → ".join("F%d" % n for n in range(10)) + "**\n\n" + "".join("## F%d — Fase %d (PENDING)\n\n" % (n, n) for n in range(10))
    tooling = "**H0 → H1**\n\n## H0 — Uno (PENDING)\n\n## H1 — Dos (PENDING)\n"
    registry = big_registry()
    model = B.build_model([{"axis": "F", "file": "p.md", "text": product}, {"axis": "H", "file": "t.md", "text": tooling}], registry, {"date": "", "rows": []})
    dirs = {"decisions": "docs/registry/decisions", "lessons": "docs/registry/lessons", "deliveries": "docs/registry/deliveries"}
    derived = {entry["file"]: entry["template"] for entry in B.derived_of(model, dirs)}
    main, notes = derived[B.DECISIONS_INDEX_FILE], derived[B.NOTES_INDEX_FILE]
    check(len(B.stamp(main, "2026-10-01").encode("utf-8")) < 30000 and len(B.stamp(notes, "2026-10-01").encode("utf-8")) < 30000,
          "indices: con 800 decisiones y 300 entregas, los dos indices principales quedan bajo el tope (visto fallar)")
    every = [r["id"] for group in registry.values() for r in group["records"]]
    lost = [rid for rid in every if not any("`#%s`" % rid in text for text in derived.values())]
    check(every and lost == [], "indices: todo registro aparece en algun indice derivado (visto fallar)")
    decisions = registry["decisions"]["records"]
    working = {False: ("open", "postponed", "provisional"), True: ("open", "postponed", "provisional", "confirmed")}
    asks_work = [r["id"] for r in decisions if not B.is_retired(r) and r["fields"]["state"] in working[B.is_debt(r)]]
    settled = [r["id"] for r in decisions if r["id"] not in asks_work]
    check(all("`#%s`" % rid in main for rid in asks_work) and not any("`#%s`" % rid in main for rid in settled),
          "indices: el principal lista enteras las abiertas, las deudas vivas y las provisionales, y de las demas solo da la cuenta (visto fallar)")
    f3 = derived[B.INDEX_DIR + "/decisions-F3.md"]
    named_f3 = [r["id"] for r in decisions if "F3" in B.phases_of(r)]
    check(sorted(named_f3) == sorted(rid for rid in every if "`#%s`" % rid in f3), "indices: el de una fase lista todas las decisiones que la nombran, y solo esas")
    nowhere = derived[B.INDEX_DIR + "/decisions-" + B.NO_PHASE + ".md"]
    check("`#decision-004`" in nowhere and "`#decision-001`" not in nowhere and B.INDEX_DIR + "/decisions-F3.md" in main,
          "indices: la que no nombra fase va al indice de 'none', y el principal apunta a cada indice de fase")
    september = derived[B.INDEX_DIR + "/notes-2026-09.md"]
    month_ids = [r["id"] for r in registry["deliveries"]["records"] + registry["lessons"]["records"] if r["fields"]["date"].startswith("2026-09")]
    check(all("`#%s`" % rid in september for rid in month_ids) and notes.count("`#2026-") == B.RECENT_NOTES and notes.count("`#lesson-") == B.RECENT_NOTES,
          "indices: las notas del mes van enteras a su indice y el principal da solo las mas recientes de cada clase (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        check(os.path.isfile(os.path.join(root, *(B.INDEX_DIR + "/decisions-none.md").split("/"))) and findings_of(root) == [],
              "integracion: build escribe los indices por fase y por mes, y check los da por al dia")
        write(root, B.INDEX_DIR + "/decisions-F7.md", "# Sobra\n\n" + B.STAMP_MARK + "0123456789abcdef\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_DERIVED and "decisions-F7.md" in found[0]["key"],
              "integracion: un indice que ya no genera ninguna fuente sale como derivado, no como documento sin casa (visto fallar)")
        code, said = quietly(B.build, root)
        check(code == 0 and not os.path.exists(os.path.join(root, *(B.INDEX_DIR + "/decisions-F7.md").split("/"))) and findings_of(root) == [],
              "integracion: build borra el indice que sobra si lleva la huella del tablero (visto fallar)")
        write(root, B.INDEX_DIR + "/notas-mias.md", "# Mias\n")
        code, said = quietly(B.build, root)
        check(code == 1 and os.path.exists(os.path.join(root, *(B.INDEX_DIR + "/notas-mias.md").split("/"))) and "notas-mias.md" in said,
              "integracion: un fichero sin huella en el directorio de indices no se borra: build sale rojo y lo nombra (visto fallar)")
        os.remove(os.path.join(root, *(B.INDEX_DIR + "/notas-mias.md").split("/")))
        write(root, B.INDEX_DIR + "/.gitkeep", "")
        code, said = quietly(B.build, root)
        check(code == 0 and os.path.exists(os.path.join(root, *(B.INDEX_DIR + "/.gitkeep").split("/"))) and findings_of(root) == [],
              "integracion: lo que no es markdown en el directorio de indices (un .gitkeep) no es un indice: build no lo toca ni sale rojo (visto fallar)")
        write(root, "tools/board/limits.txt", limits_data(index=100))
        found = findings_of(root)
        none_index = B.INDEX_DIR + "/decisions-" + B.NO_PHASE + ".md"
        check(sorted(f["where"] for f in found) == sorted([B.DECISIONS_INDEX_FILE, B.NOTES_INDEX_FILE, none_index])
              and all(f["kind"] == B.KIND_SHAPE and f["key"] == B.INDEX_LIMIT for f in found),
              "integracion: los indices principales y el de 'none', que una sesion consulta antes de tocar nada, salen por encima de su tope de limits.txt,"
              " uno por indice (visto fallar)")
        check(one_says([f for f in found if f["where"] == none_index], "cómo se parte"),
              "integracion: el indice de 'none' por encima del tope pregunta como se parte, porque no se cierra nunca (visto fallar)")
        write(root, "tools/board/limits.txt", limits_data().replace("index 30000\n", ""))
        check(one_says(findings_of(root), "tope '%s'" % B.INDEX_LIMIT), "integracion: limits.txt sin tope de indice es un hallazgo de datos (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        before = {path: read_bytes(root, path) for path in derived_on_disk(root)}
        write(root, "tools/board/documents.txt", read_bytes(root, "tools/board/documents.txt").replace(b"decisions docs/registry/decisions\n", b"decisions docs/registry/decision\n"))
        code, said = quietly(B.build, root)
        check(code == 1 and "docs/registry/decision'" in said and {path: read_bytes(root, path) for path in derived_on_disk(root)} == before,
              "integracion: con un directorio de registros que no se pudo leer, build sale rojo diciendolo y no reescribe ni borra ningun derivado (visto fallar)")
    end()


UNITTEST_OK = ("import unittest\nfrom app.core import double\n\n\nclass Core(unittest.TestCase):\n"
               "    def test_double(self):\n        self.assertEqual(double(2), 4)\n\n"
               "    @unittest.skip('no aplica')\n    def test_skipped(self):\n        pass\n")
JUNIT_RUNNER = '''import os, sys
CASES = {
    "weak": '<testsuites><testsuite tests="3"><testcase name="a"/><testcase name="b"><skipped/></testcase><testcase name="c"/></testsuite></testsuites>',
    "strong": '<testsuite tests="2"><testcase name="a" assertions="3"/><testcase name="b" assertions="1"/></testsuite>',
    "silent": '<testsuite tests="2"><testcase name="a" assertions="3"/><testcase name="b" assertions="0"/></testsuite>',
    "crash": '<testsuite tests="2"><testcase name="a"/><testcase name="b"><error message="boom"/></testcase></testsuite>',
    "failed": '<testsuite tests="2"><testcase name="a"/><testcase name="b"><failure message="no"/></testcase></testsuite>',
    "short": '<testsuite tests="3"><testcase name="a"/><testcase name="b"/></testsuite>',
}
case, target = sys.argv[1], sys.argv[2]
if case != "none":
    os.makedirs(os.path.dirname(target) or ".", exist_ok=True)
    with open(target, "w") as handle:
        handle.write(CASES[case.split("+")[0]])
    if case.endswith("+second"):
        with open(os.path.join(os.path.dirname(target), "TEST-second.xml"), "w") as handle:
            handle.write(CASES["strong"])
print("runner ran", case)
sys.exit(3 if case == "strong+exit" else 0)
'''


def guard_run(root, script, *args):
    done = subprocess.run([sys.executable, "-B", os.path.join(V.ROOT, "tools", "guards", script)] + list(args), cwd=root, stdin=subprocess.DEVNULL,
                          capture_output=True, timeout=120)
    return done.returncode, done.stdout.decode("utf-8", "replace") + done.stderr.decode("utf-8", "replace")


def guard_state(said, name):
    """'PASS' or 'FAIL' for one guard line of an adapter's output, '' when it was not printed."""
    for line in said.splitlines():
        if line.startswith("[") and "] " + name + ":" in line:
            return line[1:5]
    return ""


def test_guard_adapters():
    begin("test_guard_adapters")
    with scratch_tree() as root:
        write(root, "app/__init__.py", "")
        write(root, "app/core.py", "def double(x):\n    return 2 * x\n")
        write(root, "tests/test_core.py", UNITTEST_OK)
        code, said = guard_run(root, "python_unittest.py")
        check(code == 0 and [guard_state(said, g) for g in GUARDS] == ["PASS"] * 3 and said.strip().splitlines()[-1].startswith("RESULT: 2 tests, 0 fallos"),
              "unittest: una suite que comprueba algo sale 0 e imprime las tres guardas, y un test saltado no es mudo (visto fallar)")
        write(root, "tests/test_mute.py", "import unittest\n\n\nclass Mute(unittest.TestCase):\n    def test_nothing(self):\n        x = 1\n\n    def test_bare(self):\n        assert True\n")
        code, said = guard_run(root, "python_unittest.py")
        check(code == 1 and guard_state(said, "guard silent") == "FAIL" and "test_nothing" in said and "test_bare" in said,
              "unittest: un test que no llama a ningun assert*, ni con un assert pelado, es rojo por guard silent y se nombra (visto fallar)")
        os.remove(os.path.join(root, "tests", "test_mute.py"))
        write(root, "tests/test_boom.py", "import unittest\n\n\nclass Boom(unittest.TestCase):\n    def test_boom(self):\n        self.assertTrue(True)\n        raise RuntimeError('x')\n")
        code, said = guard_run(root, "python_unittest.py")
        check(code == 1 and guard_state(said, "guard finished") == "FAIL" and guard_state(said, "guard silent") == "PASS",
              "unittest: un test que revienta con una excepcion no termina, y es rojo por guard finished (visto fallar)")
        write(root, "tests/test_boom.py", "import unittest\n\n\nclass Boom(unittest.TestCase):\n    @classmethod\n    def setUpClass(cls):\n        raise RuntimeError('x')\n\n"
              "    def test_a(self):\n        self.assertTrue(True)\n")
        code, said = guard_run(root, "python_unittest.py")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL", "unittest: los tests de una clase cuyo setUpClass fallo no arrancan, y es rojo por guard registered (visto fallar)")
        write(root, "tests/test_boom.py", "import no_such_module\n")
        code, said = guard_run(root, "python_unittest.py")
        check(code == 1 and guard_state(said, "guard finished") == "FAIL", "unittest: un modulo de tests que no importa es un error, no un modulo sin tests (visto fallar)")
        os.remove(os.path.join(root, "tests", "test_boom.py"))
        original_stat = os.stat(os.path.join(root, "tests", "test_core.py"))
        write(root, "tests/test_core.py", UNITTEST_OK.replace("double(2), 4", "double(2), 5"))
        # Same-size rewrites within a filesystem timestamp tick must run new source.
        os.utime(os.path.join(root, "tests", "test_core.py"), ns=(original_stat.st_atime_ns, original_stat.st_mtime_ns))
        code, said = guard_run(root, "python_unittest.py")
        check(code == 1 and [guard_state(said, g) for g in GUARDS] == ["PASS"] * 3 and "1 fallos" in said, "unittest: una asercion que falla es rojo con las guardas en pie")
        write(root, "tests/test_core.py", "import unittest\n\n\nclass Skips(unittest.TestCase):\n    @unittest.skip('x')\n    def test_a(self):\n        pass\n")
        code, said = guard_run(root, "python_unittest.py")
        check(code == 1 and guard_state(said, "guard silent") == "FAIL", "unittest: una suite que solo salta tests no ejecuto nada, y es roja (visto fallar)")
        os.remove(os.path.join(root, "tests", "test_core.py"))
        code, said = guard_run(root, "python_unittest.py")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL" and "0 descubiertos" in said, "unittest: sin un solo test es rojo: un runner sin nada que ejecutar no es verde (visto fallar)")
        code, said = guard_run(root, "python_unittest.py", "no-existe")
        check(code == 1 and "no existe el directorio de tests" in said and [guard_state(said, g) for g in GUARDS] == ["PASS", "FAIL", "FAIL"],
              "unittest: un directorio de tests que no existe es rojo: nada se registro ni se ejecuto, aunque nada se quedara a medias")
    with scratch_tree() as root:
        write(root, "runner.py", JUNIT_RUNNER)
        report = os.path.join("out", "report.xml")

        def junit(case, *reports):
            return guard_run(root, "junit.py", *[w for r in (reports or (report,)) for w in ("--report", r)] + ["--", sys.executable, "runner.py", case, report])

        code, said = junit("weak")
        check(code == 0 and [guard_state(said, g) for g in GUARDS] == ["PASS"] * 3 and "debil" in said and "runner ran weak" in said,
              "junit: un informe sin cuenta de aserciones da la guarda debil, dicha como tal, y el comando corre por el shell (visto fallar)")
        code, said = junit("strong")
        check(code == 0 and guard_state(said, "guard silent") == "PASS" and "debil" not in said, "junit: con aserciones por caso, la guarda silent es la fuerte")
        code, said = junit("silent")
        check(code == 1 and guard_state(said, "guard silent") == "FAIL", "junit: un caso con 0 aserciones es rojo por guard silent (visto fallar)")
        code, said = junit("crash")
        check(code == 1 and guard_state(said, "guard finished") == "FAIL", "junit: un caso que acaba en <error> es rojo por guard finished (visto fallar)")
        code, said = junit("failed")
        check(code == 1 and guard_state(said, "guard silent") == "FAIL" and "1 fallidos" in said, "junit: un fallo es rojo, y la guarda debil lo cuenta (visto fallar)")
        code, said = junit("short")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL", "junit: una suite que declara mas tests de los que lista es roja por guard registered (visto fallar)")
        junit("strong")
        code, said = junit("none")
        check(code == 1 and "no escribio ningun informe" in said and guard_state(said, "guard registered") == "FAIL",
              "junit: el informe de una corrida anterior se borra antes, asi que un comando que no escribe nada es rojo (visto fallar)")
        code, said = junit("strong+exit")
        check(code == 1 and [guard_state(said, g) for g in GUARDS] == ["PASS"] * 3, "junit: si el comando sale con error, la puerta es roja aunque el informe este bien (visto fallar)")
        code, said = junit("crash+second", "out")
        check(code == 1 and "4 en los informes" in said and guard_state(said, "guard finished") == "FAIL",
              "junit: un directorio de informes se lee entero, cada .xml que tenga")
        code, said = guard_run(root, "junit.py", "--report", "x.xml", sys.executable)
        check(code == 2 and "falta '--'" in said, "junit: sin '--' antes del comando dice el uso y no corre nada")
        write(root, "out/pom.xml", "<project><modelVersion>4.0.0</modelVersion></project>\n")
        write(root, "out/TEST-viejo.xml", '<testsuite tests="1"><testcase name="viejo"')
        code, said = junit("none", "out")
        check(code == 1 and os.path.exists(os.path.join(root, "out", "pom.xml")) and not os.path.exists(os.path.join(root, "out", "TEST-viejo.xml"))
              and "no escribio ningun informe" in said,
              "junit: antes de correr borra solo los informes viejos, tambien uno cortado a medias; un XML que no es un informe sobrevive y no se lee (visto fallar)")
        code, said = guard_run(root, "junit.py", "--report", "out/pom.xml", "--", sys.executable, "-c", "print(1)")
        check(code == 1 and os.path.exists(os.path.join(root, "out", "pom.xml")) and "no es un informe JUnit" in said,
              "junit: un fichero nombrado como informe que no lo es no se borra, y se dice (visto fallar)")
        for unsafe in (".", ".."):
            code, said = guard_run(root, "junit.py", "--report", unsafe, "--", sys.executable, "runner.py", "strong", report)
            check(code == 2 and os.path.exists(os.path.join(root, "out", "pom.xml")) and "runner ran" not in said,
                  "junit: '%s' como ruta de informes es la raiz o la contiene: se rechaza sin borrar ni correr nada (visto fallar)" % unsafe)
    with scratch_tree() as root, scratch_tree() as decoy:
        if init_repository(root) and init_repository(decoy):
            write(root, "reports/TEST-a.xml", '<testsuite tests="1"><testcase name="a"/></testsuite>')
            git(root, "add", "reports/TEST-a.xml")
            code, said = guard_run(root, "junit.py", "--report", "reports", "--", sys.executable, "-c", "print('el comando se lanzo')")
            check(code == 2 and os.path.exists(os.path.join(root, "reports", "TEST-a.xml")) and "versionados" in said and "se lanzo" not in said,
                  "junit: una ruta de informes con ficheros versionados se rechaza: vaciarla los borraria (visto fallar)")
            with environment(GIT_DIR=os.path.join(decoy, ".git"), GIT_WORK_TREE=decoy):
                code, said = guard_run(root, "junit.py", "--report", "reports", "--", sys.executable, "-c", "print('el comando se lanzo')")
            check(code == 2 and os.path.exists(os.path.join(root, "reports", "TEST-a.xml")) and "versionados" in said and "se lanzo" not in said,
                  "junit: un GIT_DIR heredado no esconde los ficheros versionados del repositorio donde corre (visto fallar)")
        else:
            check(shutil.which("git") is None, "junit: git init solo puede fallar si git no esta instalado")
    end()


DART_RUNNER = '''import json, os, sys
START = {"type": "start", "protocolVersion": "0.1.1", "runnerVersion": None, "pid": 1, "time": 0}
DONE = [{"type": "done", "success": True}]


def loading(suite, test, result="success", hidden=True):
    return [{"type": "suite", "suite": {"id": suite, "path": "s%d_test.dart" % suite}},
            {"type": "testStart", "test": {"id": test, "name": "loading s%d_test.dart" % suite, "suiteID": suite, "groupIDs": []}},
            {"type": "testDone", "testID": test, "result": result, "hidden": hidden, "skipped": False}]


def suite(declared, *tests, nested=0):
    events = loading(0, 1) + [{"type": "group", "group": {"id": 2, "suiteID": 0, "parentID": None, "testCount": declared}},
                              {"type": "testStart", "test": {"id": 3, "name": "(setUpAll)", "suiteID": 0, "groupIDs": [2]}},
                              {"type": "testDone", "testID": 3, "result": "success", "hidden": True, "skipped": False}]
    if nested:
        events.append({"type": "group", "group": {"id": 4, "suiteID": 0, "parentID": 2, "testCount": nested}})
    for number, (result, skipped) in enumerate(tests, 10):
        events.append({"type": "testStart", "test": {"id": number, "name": "t%d" % number, "suiteID": 0, "groupIDs": [2]}})
        if result:
            events.append({"type": "testDone", "testID": number, "result": result, "hidden": False, "skipped": skipped})
    return events


GREEN = suite(2, ("success", False), ("success", True))
CASES = {
    "green": GREEN + DONE,
    "zero": [{"type": "allSuites", "count": 0}] + DONE,
    "skipped": suite(1, ("success", True)) + DONE,
    "failed": suite(2, ("success", False), ("failure", False)) + DONE,
    "error": suite(2, ("success", False), ("error", False)) + DONE,
    "unloaded": loading(0, 1, "error", False) + DONE,
    "unfinished": suite(2, ("success", False), (None, False)),
    "short": suite(3, ("success", False), ("success", False)) + DONE,
    "nested": suite(2, ("success", False), ("success", False), nested=1) + DONE,
    "undone": GREEN,
    "empty": GREEN + loading(5, 6) + DONE,
    "garbage": GREEN + ["esto no es json"] + DONE,
    "typeless": GREEN + [{"x": 1}] + DONE,
    "noversion": GREEN + DONE,
}
case, target = sys.argv[1], sys.argv[2]
if case != "none":
    start = {"type": "start"} if case == "noversion" else START
    os.makedirs(os.path.dirname(target) or ".", exist_ok=True)
    with open(target, "w") as handle:
        handle.write("".join((json.dumps(e) if isinstance(e, dict) else e) + "\\n" for e in [start] + CASES[case.split("+")[0]]))
print("runner ran", case)
sys.exit(3 if case == "green+exit" else 1 if case in ("failed", "error", "unloaded") else 0)
'''


def test_dart_test_adapter():
    begin("test_dart_test_adapter")
    with scratch_tree() as root:
        write(root, "runner.py", DART_RUNNER)
        report = os.path.join("build", "reports", "tests.json")

        def dart(case):
            return guard_run(root, "dart_test.py", "--report", report, "--", sys.executable, "runner.py", case, report)

        code, said = dart("green")
        check(code == 0 and [guard_state(said, g) for g in GUARDS] == ["PASS"] * 3 and "debil" in said and "runner ran green" in said
              and said.strip().splitlines()[-1].startswith("RESULT: 2 tests, 0 fallidos"),
              "dart_test: un informe en verde da las tres guardas, la silent dicha debil, sin contar los tests ocultos (visto fallar)")
        code, said = dart("nested")
        check(code == 0 and [guard_state(said, g) for g in GUARDS] == ["PASS"] * 3,
              "dart_test: un grupo anidado declara parte de los tests de su raiz, y no se cuentan dos veces (visto fallar)")
        code, said = dart("zero")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL" and guard_state(said, "guard silent") == "FAIL",
              "dart_test: un informe de 0 tests es rojo: un runner sin nada que ejecutar no es verde (visto fallar)")
        code, said = dart("skipped")
        check(code == 1 and guard_state(said, "guard silent") == "FAIL" and guard_state(said, "guard registered") == "PASS",
              "dart_test: una suite que solo salta tests no ejecuto nada, y es roja por guard silent (visto fallar)")
        code, said = dart("failed")
        check(code == 1 and guard_state(said, "guard silent") == "FAIL" and "1 fallidos" in said,
              "dart_test: un fallo es rojo, y la guarda debil lo cuenta (visto fallar)")
        code, said = dart("error")
        check(code == 1 and guard_state(said, "guard finished") == "FAIL", "dart_test: un test que acaba en error es rojo por guard finished (visto fallar)")
        code, said = dart("unloaded")
        check(code == 1 and guard_state(said, "guard finished") == "FAIL" and guard_state(said, "guard registered") == "FAIL",
              "dart_test: una suite que no carga es un test visible que ningun grupo declaro, y es roja (visto fallar)")
        code, said = dart("unfinished")
        check(code == 1 and guard_state(said, "guard finished") == "FAIL" and "1 sin terminar" in said and "final del runner" in said,
              "dart_test: un test que arranca y no termina, en un informe sin su evento final, es rojo por guard finished (visto fallar)")
        code, said = dart("undone")
        check(code == 1 and guard_state(said, "guard finished") == "FAIL" and "0 sin terminar" in said and "final del runner" in said,
              "dart_test: un informe con todos sus tests terminados que no llega al evento final del runner es rojo por guard finished (visto fallar)")
        code, said = dart("short")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL",
              "dart_test: un grupo que declara mas tests de los que arrancan es rojo por guard registered (visto fallar)")
        code, said = dart("empty")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL" and "1 suites sin ningun test" in said,
              "dart_test: un fichero de tests que no declara ninguno es rojo por guard registered (visto fallar)")
        code, said = dart("garbage")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL" and "no es JSON" in said,
              "dart_test: una linea del informe que no es un evento es roja por guard registered (visto fallar)")
        code, said = dart("typeless")
        check(code == 1 and guard_state(said, "guard registered") == "FAIL" and "no es un evento" in said and "Traceback" not in said,
              "dart_test: una linea de JSON sin 'type' no es un evento: roja por guard registered, con su linea y sin traza (visto fallar)")
        code, said = dart("noversion")
        check(code == 1 and "no es un informe" in said and guard_state(said, "guard registered") == "FAIL",
              "dart_test: un fichero cuyo primer evento no lleva la version del protocolo no se lee como informe (visto fallar)")
        code, said = dart("green+exit")
        check(code == 1 and [guard_state(said, g) for g in GUARDS] == ["PASS"] * 3,
              "dart_test: si el comando sale con error, la puerta es roja aunque el informe este bien (visto fallar)")
        dart("green")
        code, said = dart("none")
        check(code == 1 and "no escribio el informe" in said and guard_state(said, "guard registered") == "FAIL",
              "dart_test: el informe de una corrida anterior se borra antes, asi que un comando que no escribe nada es rojo (visto fallar)")
        write(root, "notas.json", "hola\n")
        code, said = guard_run(root, "dart_test.py", "--report", "notas.json", "--", sys.executable, "-c", "print(1)")
        check(code == 1 and read_bytes(root, "notas.json") == b"hola\n" and "no es un informe" in said,
              "dart_test: un fichero nombrado como informe que no lo es no se borra, y se dice (visto fallar)")
        code, said = guard_run(root, "dart_test.py", "--report", "build", "--", sys.executable, "runner.py", "green", report)
        check(code == 2 and "directorio" in said and "runner ran" not in said, "dart_test: un directorio como informe se rechaza sin correr nada")
        for unsafe in (".", ".."):
            code, said = guard_run(root, "dart_test.py", "--report", unsafe, "--", sys.executable, "runner.py", "green", report)
            check(code == 2 and "runner ran" not in said and os.path.exists(os.path.join(root, "runner.py")),
                  "dart_test: '%s' como informe es la raiz o la contiene: se rechaza sin borrar ni correr nada (visto fallar)" % unsafe)
        code, said = guard_run(root, "dart_test.py", "--report", report, sys.executable)
        check(code == 2 and "falta '--'" in said, "dart_test: sin '--' antes del comando dice el uso y no corre nada")
    with scratch_tree() as root:
        if init_repository(root):
            write(root, "tests.json", '{"type": "start", "protocolVersion": "0.1.1"}\n')
            git(root, "add", "tests.json")
            code, said = guard_run(root, "dart_test.py", "--report", "tests.json", "--", sys.executable, "-c", "print('el comando se lanzo')")
            check(code == 2 and os.path.exists(os.path.join(root, "tests.json")) and "versionados" in said and "se lanzo" not in said,
                  "dart_test: un informe versionado se rechaza: borrarlo borraria un fichero del repositorio (visto fallar)")
        else:
            check(shutil.which("git") is None, "dart_test: git init solo puede fallar si git no esta instalado")
    end()


FAKE_CONTRACT = ("# Contrato\n\n## 3. Estándares\n\n- **Uno.** x\n  sigue\n\n_Nota final._\n\n## %s (autoridad)\n\n| Para saber | Fichero | Manda sobre |\n"
                 "|---|---|---|\n| Uso | `README.md` | el uso |\n\nProsa tras la tabla.\n\n## 9. Skills del proyecto\n\nCada una en su carpeta.\n")
LAYER_LEGEND = ("#\n# --- KEYS ---\n# requires : r\n# needs : n\n# gate : g\n# document : d\n# ignore : i\n# standard : s\n# authority : a\n"
                "# external : e\n# prepare : p\n#\n")
# A layer whose gate needs the first test of the product, and whose standard cites where it lives.
READY_LAYER = ("# Una capa que entra con el primer test.\n" + LAYER_LEGEND + "requires 0.0.1\nneeds tests/test*.py | el primer test del producto\n"
               "gate pruebas | - | {python} -c \"print('pruebas')\"\nstandard pruebas | **Cada regla con su test en `tests/`.** Se comprueba.\n")
DEMO_LAYER = ("# La capa de prueba.\n" + LAYER_LEGEND + "requires 0.0.1\n"
              "gate demo | - | {python} -c \"print('demo')\"\ndocument extension .toml\ndocument live docs/ARCH.md\nignore dist/\n"
              "standard demo | **La demo.** Se comprueba.\nauthority | Arquitectura | `docs/ARCH.md` | la forma del codigo |\n")
DEMO_SKILL = "---\nname: demo-skill\ndescription: Cuando haga falta la demo.\n---\n# Demo\n"


def fake_template(root):
    """A template: the minimal tree with the sections a layer writes into, the
    hooks, the files an existing repository may already have, and one layer."""
    minimal_tree(root)
    write(root, "AGENTS.md", FAKE_CONTRACT % AUTHORITY)
    append(root, "tools/board/prose.txt", "standards 3. Estándares\nskills 9. Skills del proyecto\n")
    append(root, "tools/board/documents.txt", "skills .agents/skills\nadapter opencode.json AGENTS.md\n")
    write(root, "opencode.json", '{"instructions": []}\n')
    write(root, "README.md", "# Producto\n\nQue es.\n\n## Trabajar aqui\n\n1. Algo.\n")
    for hook in ("pre-push", "commit-msg"):
        write(root, ".githooks/" + hook, "#!/bin/sh\nexit 0\n")
    write(root, ".githooks/python.sh", "# compartido\n")
    write(root, ".gitignore", "__pycache__/\n*.pyc\n")
    write(root, ".gitattributes", "* text=auto eol=lf\n")
    write(root, ".editorconfig", "root = true\n\n[*]\ncharset = utf-8\n")
    write(root, "verify.py", "# el runner\n")
    write(root, "tools/board/board.py", "# el tablero\n")
    write(root, "docs/registry/lessons/lesson-a-cap-schedules-the-next-crisis.md", "---\ntitle: Un tope\ndate: 2026-01-01\norigin: x\n---\n**Un tope.** x\n")
    append(root, "tools/board/MANIFEST.txt", "\n# Solo en la plantilla.\ntemplate overlays\n")
    write(root, "overlays/demo/layer.txt", DEMO_LAYER)
    write(root, "overlays/demo/files/docs/ARCH.md", "# Arquitectura\n")
    write(root, "overlays/demo/files/.agents/skills/demo-skill/SKILL.md", DEMO_SKILL)
    write(root, "overlays/choca/layer.txt", "# Una capa que choca con la base.\n" + LAYER_LEGEND + "requires 0.0.1\ngate uno | - | {python} -c \"print('otra')\"\n")
    write(root, "overlays/futura/layer.txt", "# Una capa de un motor que aun no existe.\n" + LAYER_LEGEND + "requires 9.0.0\ngate futura | - | {python} -c \"print(1)\"\n")
    write(root, "overlays/sin-motor/layer.txt", "# Una capa que no dice que motor necesita.\n" + LAYER_LEGEND + "gate otra | - | {python} -c \"print(1)\"\n")
    write(root, "overlays/lista/layer.txt", READY_LAYER)
    write(root, "overlays/sin-entrada/layer.txt", "# Un runner de tests que no dice con que entra.\n" + LAYER_LEGEND + "requires 0.0.1\n"
          "gate suite [harness] | - | {python} -c \"print(1)\"\n")
    write(root, "overlays/mal-entrada/layer.txt", "# Filas 'needs' que no valen.\n" + LAYER_LEGEND + "requires 0.0.1\n"
          "needs tests/test*.py\nneeds /tests | absoluta\nneeds ../fuera | fuera del repositorio\nneeds dos palabras | con un blanco\n")
    write(root, "overlays/dos-fuera/layer.txt", "# Una capa que dice dos veces donde vive su producto.\n" + LAYER_LEGEND + "requires 0.0.1\n"
          "needs tests/test*.py | el primer test del producto\ngate fuera [harness] | - | {python} -c \"print(1)\"\n"
          "external stack/uno | una razon\nexternal stack/otro | otra razon\n")
    write(root, "overlays/mal-fuera/layer.txt", "# Filas 'external' que no valen.\n" + LAYER_LEGEND + "requires 0.0.1\n"
          "external ../fuera | fuera del repositorio\nexternal stack/sin-razon\n")
    write(root, "overlays/prepara-sin-fuera/layer.txt", "# Una preparacion que nadie correria.\n" + LAYER_LEGEND + "requires 0.0.1\n"
          "gate prep | - | {python} -c \"print(1)\"\nprepare {python} -c \"print(1)\"\n")
    write(root, "overlays/ajena/layer.txt", "# Una capa con una clave que no es de capa.\n#\n# --- KEYS ---\n# requires : r\n# extra : e\n#\n"
          "requires 0.0.1\nextra algo\n")
    write(root, "overlays/cita-rota/layer.txt", "# Una capa que cita lo que nadie trae.\n" + LAYER_LEGEND + "requires 0.0.1\n"
          "gate rota | - | {python} -c \"print(1)\"\nstandard rota | **La forma en `docs/FALTA.md`.** Se comprueba.\n")
    write(root, "overlays/trae/layer.txt", "# Una capa que cita la carpeta que trae y un arbol que genera.\n" + LAYER_LEGEND + "requires 0.0.1\n"
          "gate trae | - | {python} -c \"print(1)\"\ndocument generated informes\n"
          "standard trae | **El lint en `tool/lint/`, y su informe en `informes/ultimo.txt`.** Se comprueba.\n")
    write(root, "overlays/trae/files/tool/lint/config.toml", "estricto = true\n")
    quietly(B.build, root)
    commit_all(root)


def commit_all(root):
    """A scratch tree as a repository with everything committed, hooks
    skipped: a template is instantiated from what its git versions, and an
    existing repository has to be clean."""
    init_repository(root)
    git_run(root, "add", "-A")
    git_run(root, "commit", "-q", "--no-verify", "-m", "chore: start")


def template_snapshot(root):
    """This template as it is on disk, committed in a scratch repository:
    instantiate.py copies only what git versions, and the template is not
    committed while it is being changed. The snapshot is sealed as it is, so
    that an instance's gates judge what a layer did; whether the template
    itself is sealed is its own documents gate's to say."""
    for path in B.walk_files(V.ROOT, [])["files"]:
        write(root, path, read_bytes(V.ROOT, path))
    quietly(B.main_on, ["seal"], root)
    commit_all(root)


def tree_bytes(root):
    """Every file of a tree but git's own, with its bytes: what 'touches nothing' compares."""
    return {path: read_bytes(root, path) for path in B.walk_files(root, [])["files"]}


def test_instantiate_merges():
    begin("test_instantiate_merges")
    import instantiate as I
    check(I.merge_ignore("node_modules/\n*.pyc\n", "# x\n__pycache__/\n*.pyc\n") == "node_modules/\n*.pyc\n\n" + I.FROM_US + "\n__pycache__/\n",
          "fusion: .gitignore conserva lo suyo y anade solo lo que le falta (visto fallar)")
    attributes = I.merge_attributes("*.png binary\n", "* text=auto eol=lf\n*.bat text eol=crlf\n")
    check(attributes.index("* text=auto eol=lf") < attributes.index("*.png binary"),
          "fusion: las reglas de .gitattributes de la plantilla van primero, porque en git gana la ultima linea y las del repositorio deciden (visto fallar)")
    editor = I.merge_editorconfig("[*.js]\nindent_size = 2\n", "root = true\n\n[*]\ncharset = utf-8\n")
    check(editor.startswith("root = true") and editor.index("[*]") < editor.index("[*.js]") and "indent_size = 2" in editor,
          "fusion: .editorconfig gana root = true y las secciones que le faltan, antes de las suyas (visto fallar)")
    check(I.merge_editorconfig("root = true\n\n[*]\nx = 1\n", "root = true\n\n[*]\ncharset = utf-8\n") == "root = true\n\n[*]\nx = 1\n",
          "fusion: una seccion que el repositorio ya tiene no se toca")
    check(I.merge_readme("# Mi app\n\nYa existe.\n", "# Producto\n\nPlaceholder.\n\n## Trabajar aqui\n\n1. x\n") == "# Mi app\n\nYa existe.\n\n## Trabajar aqui\n\n1. x\n",
          "fusion: el README del repositorio sigue primero y entero, y le siguen las secciones de la plantilla sin su titulo (visto fallar)")
    contract = I.merges(PENDING)["AGENTS.md"]("# Reglas viejas\n", "# Contrato\n")
    check(contract.startswith("# Contrato\n") and contract.endswith("\n## " + PENDING + "\n\n# Reglas viejas\n"),
          "fusion: AGENTS.md lleva primero el contrato y el del repositorio entero bajo la cabecera por fusionar que se le da (visto fallar)")
    claude = I.merge_imports("Lo mio.\n@AGENTS.md\n", "@STATUS.txt\n@AGENTS.md\n")
    check(claude == "@STATUS.txt\n@AGENTS.md\n\nLo mio.\n" and B.adapter_reaches_startup("CLAUDE.md", B.adapter_reads("CLAUDE.md", claude)["listed"], [], ["STATUS.txt", "AGENTS.md"]) == [],
          "fusion: CLAUDE.md abre con la lectura de arranque en su orden aunque ya importara parte de ella, y conserva su texto detras (visto fallar)")
    check(I.merge_imports("@STATUS.txt\n@AGENTS.md\nLo mio.\n", "@STATUS.txt\n@AGENTS.md\n") == "@STATUS.txt\n@AGENTS.md\nLo mio.\n",
          "fusion: un CLAUDE.md que ya carga la lectura de arranque en su orden no se toca")
    merged = json.loads(I.merge_instructions('{"model": "x", "instructions": ["docs/ROADMAP.md", "extra.md"]}', '{"instructions": ["STATUS.txt", "docs/ROADMAP.md"]}'))
    check(merged == {"model": "x", "instructions": ["STATUS.txt", "docs/ROADMAP.md", "extra.md"]},
          "fusion: opencode.json conserva sus ajustes y lleva primero la lectura de arranque, en su orden (visto fallar)")
    kept = '{\n    "model": "x",\n    "instructions": ["STATUS.txt"]\n}\n'
    check(I.merge_instructions(kept, '{"instructions": ["STATUS.txt"]}') == kept, "fusion: un opencode.json al que no le falta nada no se reescribe (visto fallar)")
    # Its own text, not the template's MANIFEST.txt: this suite also runs in every copy, whose manifest has no template rows.
    shipped = (legend(MANIFEST_KEYS) + "version 1.2.3\n\n# El motor.\nengine x.py %s\n\n# Solo en la plantilla.\ntemplate overlays\ntemplate otra\n\n"
               "# Mezclado.\nengine y.py %s\ntemplate z\n" % ("a" * 64, "b" * 64))
    copied = B.read_manifest(B.parse_data(I.instance_manifest(shipped), "MANIFEST.txt", []), [])
    original = B.read_manifest(B.parse_data(shipped, "MANIFEST.txt", []), [])
    check(original["template"] == ["overlays", "otra", "z"] and copied["template"] == [] and copied["engine"] == original["engine"]
          and copied["version"] == "1.2.3" and "Solo en la plantilla" not in I.instance_manifest(shipped),
          "fusion: el MANIFEST.txt de una copia lleva la version y el motor, y no las filas 'template' ni el comentario que solo las presenta a ellas (visto fallar)")
    check(I.engine_problems("0.2.0", "0.2.0") == [] and I.engine_problems("0.9.1", "0.10.0") == [] and one_says(I.engine_problems("0.2.0", "0.1.9"), "0.1.9")
          and one_says(I.engine_problems("0.2.0", ""), "no declara"), "capas: el motor de la instancia es al menos el que pide la capa, comparando numeros (visto fallar)")
    lines = FAKE_CONTRACT.split("\n")
    check(I.last_bullet(lines, 2, 8) == 5, "secciones: la ultima vineta de una lista incluye su linea de continuacion")
    added = I.insert_in_section(FAKE_CONTRACT % AUTHORITY, "3. Estándares", ["- **Nueva.**"], I.last_bullet)
    check(added.index("- **Nueva.**") < added.index("_Nota final._") and added.index("  sigue") < added.index("- **Nueva.**"),
          "secciones: una vineta nueva va tras la ultima de la lista, antes de la prosa que la sigue (visto fallar)")
    check(I.insert_in_section("# X\n", "3. Estándares", ["- y"], I.last_bullet) is None, "secciones: sin la seccion no se escribe nada")
    end()


def test_instantiate():
    begin("test_instantiate")
    import instantiate as I
    if shutil.which("git") is None:
        check(True, "instantiate: sin git no se puede instanciar con hooks")
        end()
        return
    with scratch_tree() as template, scratch_tree() as scratch:
        fake_template(template)
        target = os.path.join(scratch, "nuevo")
        code, said = quietly(I.main, [target, "--layer", "demo"], template, "2026-02-03")
        check(code == 0 and "plan sin escribir" in said and not os.path.exists(target), "instantiate: sin --apply ensena el plan y no escribe nada (visto fallar)")
        code, said = quietly(I.main, [target, "--layer", "demo", "--apply"], template, "2026-02-03")
        contract = read_bytes(target, "AGENTS.md").decode("utf-8")
        check(code == 0 and not os.path.exists(os.path.join(target, "overlays")) and os.path.exists(os.path.join(target, *("docs/registry/decisions/%s.md" % A_ID()).split("/"))),
              "instantiate: copia la plantilla sin lo que solo es de ella y escribe la decision de adopcion (visto fallar)")
        modes = dict((path, mode) for mode, path in B.git_modes(target))
        check(git_run(target, "config", "core.hooksPath").stdout.decode().strip() == ".githooks" and modes.get(".githooks/pre-push") == "100755"
              and modes.get(".githooks/commit-msg") == "100755" and ".githooks/python.sh" not in modes,
              "instantiate: git iniciado, hooks activados y ejecutables en el indice (visto fallar)")
        check(contract.index("**La demo.** Se comprueba. Puerta: `demo`.") < contract.index("_Nota final._") and contract.index("`docs/ARCH.md`") < contract.index("Prosa tras la tabla")
              and "- **demo-skill** — Cuando haga falta la demo.: `.agents/skills/demo-skill/SKILL.md`" in contract,
              "instantiate: la capa escribe su estandar en el §3, su fila en el §4 y su skill en el indice (visto fallar)")
        check(b"demo | - |" in read_bytes(target, "gates.txt") and b"dist/" in read_bytes(target, ".gitignore") and os.path.exists(os.path.join(target, "docs", "ARCH.md")),
              "instantiate: la capa anade su puerta, su linea de .gitignore y sus ficheros")
        quietly(B.build, target)
        check(findings_of(target) == [], "instantiate: la instancia nueva con su capa pasa todas las comprobaciones del tablero tras el build (visto fallar)")
        before = {rel: read_bytes(target, rel) for rel in ("AGENTS.md", "gates.txt", ".gitignore")}
        code, said = quietly(I.main, [target, "--layer", "demo", "--apply"], template)
        check(code == 1 and "ya tiene una puerta 'demo'" in said and all(read_bytes(target, rel) == text for rel, text in before.items()),
              "instantiate: una capa que ya esta no se aplica dos veces, y no toca nada (visto fallar)")
        clashing = os.path.join(scratch, "con-choque")
        code, said = quietly(I.main, [clashing, "--layer", "choca", "--apply"], template, "2026-02-03")
        check(code == 1 and "ya tiene una puerta 'uno'" in said and not os.path.exists(clashing),
              "instantiate: el choque de una capa con lo que la instanciacion va a escribir para todo antes de copiar nada (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "otro")], target)
        check(code == 1 and "no es la plantilla" in said, "instantiate: una instancia no sirve de plantilla: copiaria su historia (visto fallar)")
        code, said = quietly(I.main, [os.path.join(template, "dentro")], template)
        check(code == 1 and "dentro de la plantilla" in said, "instantiate: el destino no puede estar dentro de la plantilla")
        write(scratch, "notas.txt", "mis notas\n")
        code, said = quietly(I.main, [os.path.join(scratch, "notas.txt")], template)
        check(code == 1 and "es un fichero" in said and read_bytes(scratch, "notas.txt") == b"mis notas\n",
              "instantiate: un fichero como destino para el plan, en vez de dar el plan por bueno y romper al crear el directorio (visto fallar)")
        existing = os.path.join(scratch, "existente")
        for rel, text in (("README.md", "# Mi app\n\nYa existe.\n"), ("AGENTS.md", "# Reglas viejas\n\n- usar tabs\n"), (".gitignore", "node_modules/\n"),
                          (".gitattributes", "*.png binary\n"), (".editorconfig", "[*.js]\nindent_size = 2\n"), ("CLAUDE.md", "Instrucciones propias.\n"),
                          ("opencode.json", '{"model": "x"}\n'), ("src/app.js", "x\n")):
            write(existing, rel, text)
        init_repository(existing)
        git_run(existing, "add", "-A")
        git_run(existing, "commit", "-q", "--no-verify", "-m", "chore: start")
        write(existing, "src/app.js", "y\n")
        code, said = quietly(I.main, [existing, "--apply"], template, "2026-02-03")
        check(code == 1 and "no esta limpio" in said and not os.path.exists(os.path.join(existing, "gates.txt")), "instantiate: un repositorio con cambios sin commitear no se toca (visto fallar)")
        git(existing, "checkout", "-q", "--", "src/app.js")
        code, said = quietly(I.main, [existing, "--apply"], template, "2026-02-03")
        numstat = git_run(existing, "diff", "--numstat", "HEAD", "--", "README.md", "AGENTS.md", ".gitignore", ".gitattributes", ".editorconfig", "CLAUDE.md").stdout.decode()
        deleted = [line for line in numstat.splitlines() if line.split("\t")[1] != "0"]
        check(code == 0 and numstat.count("\n") == 6 and deleted == [], "instantiate: en un repositorio que ya existe, sus ficheros se fusionan solo con anadidos (visto fallar)")
        readme, contract = read_bytes(existing, "README.md").decode(), read_bytes(existing, "AGENTS.md").decode()
        check(readme.startswith("# Mi app") and "## Trabajar aqui" in readme and contract.startswith("# Contrato") and contract.endswith("# Reglas viejas\n\n- usar tabs\n")
              and json.loads(read_bytes(existing, "opencode.json"))["model"] == "x", "instantiate: README del repositorio primero, contrato de la plantilla primero, ajustes conservados")
        check(code == 0 and "\n## %s\n\n# Reglas viejas\n" % PENDING in contract and "'%s'" % PENDING in said.strip().splitlines()[-1],
              "instantiate: el contrato que ya tenia el repositorio queda bajo la cabecera que declara el prose.txt de la plantilla, y el final pide llevarlo"
              " al contrato (visto fallar)")
        quietly(B.build, existing)
        check([f["kind"] for f in findings_of(existing) if f["key"] == PENDING] == [B.KIND_SHAPE],
              "integracion: el tablero de la instancia sale rojo mientras su contrato conserva la seccion por fusionar (visto fallar)")
        write(existing, "AGENTS.md", contract.split("\n## " + PENDING)[0] + "\n")
        check([f for f in findings_of(existing) if f["key"] == PENDING] == [], "integracion: llevado lo suyo al contrato y borrada la seccion, el tablero ya no la ve")
        legacy = os.path.join(scratch, "heredado")
        write(legacy, "README.md", "# Café\n".encode("cp1252"))
        write(legacy, "AGENTS.md", B.UTF8_BOM + b"# Reglas\n")
        init_repository(legacy)
        git_run(legacy, "add", "-A")
        git_run(legacy, "commit", "-q", "--no-verify", "-m", "chore: start")
        code, said = quietly(I.main, [legacy, "--apply"], template)
        check(code == 1 and "README.md no es UTF-8" in said and read_bytes(legacy, "README.md") == "# Café\n".encode("cp1252") and not os.path.exists(os.path.join(legacy, "gates.txt")),
              "instantiate: un fichero que se fusionaria y no es UTF-8 para todo antes de escribir: fusionarlo perderia sus bytes (visto fallar)")
        write(legacy, "README.md", "# Cafe\n")
        git_run(legacy, "commit", "-q", "--no-verify", "-am", "chore: utf-8")
        code, said = quietly(I.main, [legacy, "--apply"], template)
        check(code == 0 and "\ufeff" not in read_bytes(legacy, "AGENTS.md").decode("utf-8"), "instantiate: el BOM de un fichero que se fusiona no acaba en medio del resultado (visto fallar)")
        clash = os.path.join(scratch, "choque")
        write(clash, "verify.py", "# otro runner\n")
        init_repository(clash)
        git_run(clash, "add", "-A")
        git_run(clash, "commit", "-q", "--no-verify", "-m", "chore: start")
        code, said = quietly(I.main, [clash, "--apply"], template)
        check(code == 1 and "verify.py ya existe" in said and not os.path.exists(os.path.join(clash, "AGENTS.md")),
              "instantiate: un fichero del andamio que ya existe y no se fusiona para la instanciacion antes de escribir nada (visto fallar)")
        check(os.name != "nt" or git_run(target, "config", "core.longpaths").stdout.decode().strip() == "true",
              "instantiate: en Windows activa core.longpaths, que una identidad larga necesita bajo la ruta de un clon (visto fallar)")

        def untouched(root):
            return not os.path.exists(os.path.join(root, "verify.py")) and not git_run(root, "config", "core.hooksPath").stdout.strip()

        husky = os.path.join(scratch, "con-husky")
        write(husky, "src/app.js", "x\n")
        commit_all(husky)
        git(husky, "config", "core.hooksPath", ".husky")
        code, said = quietly(I.main, [husky, "--apply"], template)
        check(code == 1 and "'.husky'" in said and not os.path.exists(os.path.join(husky, "verify.py")),
              "instantiate: con otro core.hooksPath se para: activar los hooks del andamio apagaria esos (visto fallar)")
        git(husky, "config", "--unset", "core.hooksPath")
        write(husky, ".git/hooks/pre-commit", "#!/bin/sh\necho framework\n")
        write(husky, ".git/hooks/pre-push.sample", "#!/bin/sh\n")
        code, said = quietly(I.main, [husky, "--apply"], template)
        check(code == 1 and "pre-commit" in said and "pre-push.sample" not in said and untouched(husky),
              "instantiate: un hook en .git/hooks para la instanciacion: core.hooksPath lo apagaria sin avisar; un .sample no es un hook (visto fallar)")
        loose = os.path.join(scratch, "sin-git")
        write(loose, "src/app.js", "x\n")
        code, said = quietly(I.main, [loose, "--apply"], template)
        check(code == 1 and "git init" in said and not os.path.exists(os.path.join(loose, "verify.py")),
              "instantiate: un directorio con ficheros y sin git no se toca: lo escrito no seria un diff que revisar (visto fallar)")
        jsonc = os.path.join(scratch, "jsonc")
        write(jsonc, "opencode.json", '{\n  // mio\n  "model": "x",\n}\n')
        commit_all(jsonc)
        code, said = quietly(I.main, [jsonc, "--apply"], template)
        check(code == 1 and "opencode.json no se puede fusionar" in said and untouched(jsonc),
              "instantiate: un opencode.json que no es JSON estricto para el plan, antes de escribir nada (visto fallar)")
        kustomize = os.path.join(scratch, "k8s")
        write(kustomize, "overlays/prod/kustomization.yaml", "resources: []\n")
        write(kustomize, "overlays/prod/README.md", "# Prod\n")
        commit_all(kustomize)
        code, said = quietly(I.main, [kustomize, "--apply"], template, "2026-02-03")
        manifest = read_bytes(kustomize, "tools/board/MANIFEST.txt").decode("utf-8") if code == 0 else ""
        check(code == 0 and os.path.exists(os.path.join(kustomize, *("docs/registry/decisions/%s.md" % A_ID()).split("/")))
              and "version 0.0.1" in manifest and "\ntemplate " not in manifest,
              "instantiate: un repositorio con su propia carpeta overlays/ se instancia, y su MANIFEST.txt no lleva las filas 'template' (visto fallar)")
        sealed, said = quietly(B.main_on, ["seal"], kustomize)
        quietly(B.build, kustomize)
        check(sealed == 1 and "overlays/prod/README.md" in [f["key"] for f in findings_of(kustomize)],
              "instantiate: la copia no es la plantilla aunque tenga overlays/: seal se niega y su markdown pide casa (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "futura"), "--layer", "futura"], template)
        check(code == 1 and "9.0.0" in said and "0.0.1" in said, "instantiate: una capa que pide un motor mas nuevo que el que se copiaria no se aplica (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "sin-motor"), "--layer", "sin-motor"], template)
        check(code == 1 and "'requires X.Y.Z'" in said, "instantiate: una capa que no dice que version del motor necesita no se aplica (visto fallar)")
        adopted = os.path.join(scratch, "ya-adoptado")
        write(adopted, "docs/registry/decisions/%s.md" % A_ID(), "---\ntitle: x\n---\n")
        commit_all(adopted)
        code, said = quietly(I.main, [adopted, "--apply"], template)
        check(code == 1 and "se escribe una vez" in said and untouched(adopted),
              "instantiate: un destino que ya tiene la decision de adopcion para el plan, en vez de pararse a medias en adopt.py (visto fallar)")
        if os.name == "nt":
            code, said = quietly(I.main, [os.path.join(template.upper(), "dentro")], template)
            check(code == 1 and "dentro de la plantilla" in said, "instantiate: dentro de la plantilla se mira como lo mira el sistema, sin distinguir mayusculas en Windows (visto fallar)")
        code, said = quietly(I.main, [os.path.dirname(template)], template)
        check(code == 1 and "dentro de la plantilla, o la contiene" in said, "instantiate: un destino que contiene la plantilla tampoco vale (visto fallar)")
        write(template, ".env", "API_KEY=abc\n")
        code, said = quietly(I.main, [os.path.join(scratch, "con-secreto")], template)
        check(code == 1 and ".env" in said and "sin commitear" in said, "instantiate: una plantilla con un fichero sin versionar no se instancia: no se copia lo que nadie reviso (visto fallar)")
        os.remove(os.path.join(template, ".env"))
        append(template, "README.md", "otra linea\n")
        code, said = quietly(I.main, [os.path.join(scratch, "con-cambio")], template)
        check(code == 1 and "README.md" in said and "sin commitear" in said, "instantiate: una plantilla con un fichero versionado modificado no se instancia (visto fallar)")
        git(template, "checkout", "-q", "--", "README.md")
        append(template, ".gitignore", ".venv/\nThumbs.db\n")
        git_run(template, "commit", "-q", "--no-verify", "-am", "chore: ignore")
        write(template, ".venv/pyvenv.cfg", "home = x\n")
        write(template, "Thumbs.db", "x")
        clean = os.path.join(scratch, "sin-basura")
        code, said = quietly(I.main, [clean, "--apply"], template, "2026-02-03")
        check(code == 0 and os.path.exists(os.path.join(clean, "verify.py")) and not os.path.exists(os.path.join(clean, ".venv")) and not os.path.exists(os.path.join(clean, "Thumbs.db")),
              "instantiate: lo que git ignora en la plantilla no viaja (visto fallar)")
        write(template, "tools/board/prose.txt", read_bytes(template, "tools/board/prose.txt").replace(("%s %s\n" % (B.PENDING_KEY, PENDING)).encode("utf-8"), b""))
        git_run(template, "commit", "-q", "--no-verify", "-am", "chore: no pending heading")
        unheaded = os.path.join(scratch, "no-pending-heading")
        write(unheaded, "AGENTS.md", "# Reglas\n")
        commit_all(unheaded)
        code, said = quietly(I.main, [unheaded, "--apply"], template)
        check(code == 1 and "'%s'" % B.PENDING_KEY in said and untouched(unheaded),
              "instantiate: sin la cabecera por fusionar en el prose.txt de la plantilla, el contrato de un repositorio no se fusiona y nada se escribe (visto fallar)")
    end()


def A_ID():
    import adopt
    return adopt.DECISION_ID


def test_instantiate_command_line():
    begin("test_instantiate_command_line")
    import instantiate as I
    for words in (["-h"], ["--help"], ["destino", "--apply", "-h"]):
        request = I.parse_args(words)
        check(request.get("help") is True and not request["error"], "instantiate: %s pide la ayuda y no es un destino (visto fallar)" % " ".join(words))
    wrong = ((["-x", "destino"], "opcion desconocida: -x"), (["destino", "--frobnicate"], "opcion desconocida: --frobnicate"),
             (["destino", "--layer"], "--layer necesita"), (["destino", "--layer", "--apply"], "--layer necesita"), (["destino", "--layer", ""], "--layer necesita"),
             (["uno", "otro"], "sobra 'otro'"),
             (["destino", "--layer", "a", "--layer", "b"], "--layer va una sola vez"), ([], "falta el destino"))
    for words, says in wrong:
        error = I.parse_args(words)["error"]
        check(says in error, "instantiate: '%s' se rechaza diciendo '%s', sin tomar una opcion por destino (visto fallar)" % (" ".join(words), says))
    code, said = quietly(I.main, ["-h"])
    check(code == 0 and "uso:" in said and "--layer" in said and "modo:" not in said and "RESULT" not in said,
          "instantiate: -h dice el uso y que hace cada opcion, sin planificar nada (visto fallar)")
    code, said = quietly(I.main, ["--frobnicate", "destino"])
    check(code == 2 and "--frobnicate" in said and "modo:" not in said, "instantiate: una opcion desconocida sale con 2 sin planificar nada (visto fallar)")
    end()


def test_layer_readiness():
    """A layer declares what the instance has to have before it enters
    ('needs'), and what it writes into the contract cites only what exists:
    the plan refuses it before writing anything, so applying it too early
    never leaves an instance red for lack of what it declares. That is
    necessary, not sufficient: the layer's gates judge the rest."""
    begin("test_layer_readiness")
    import components as C
    import instantiate as I
    check(C.matches("tests/test*.py", "tests/test_a.py") and not C.matches("tests/*.py", "tests/unit/test_a.py")
          and not C.matches("tests", "tests/test_a.py") and not C.matches("tests/test*.py", "tests/test_a.pyc"),
          "capas: un patron de 'needs' casa con un fichero de su misma profundidad, y '*' no cruza '/' (visto fallar)")
    check(C.matches("src/**/*Test.java", "src/a/b/UnoTest.java") and C.matches("src/**/*Test.java", "src/UnoTest.java")
          and not C.matches("src/**/*Test.java", "lib/a/UnoTest.java") and not C.matches("src/**/*Test.java", "src/a/Uno.java"),
          "capas: un segmento '**' toma cualquier numero de segmentos, ninguno incluido, para los runners que buscan sus tests a cualquier profundidad (visto fallar)")
    check(not C.matches("tests/test*.py", "Tests/Test_a.py") and not C.matches("tests/test*.py", "tests/TEST_a.py"),
          "capas: un patron de 'needs' distingue mayusculas, como git y como un runner en Linux, tambien en Windows (visto fallar)")
    check(I.parse_need("tests/test*.py | el primer test") == {"pattern": "tests/test*.py", "what": "el primer test", "problem": ""},
          "capas: una fila 'needs' es el patron y lo que es, en el idioma del equipo")
    check(all(I.parse_need(row)["problem"] for row in ("tests/test*.py", "/tests | x", "../fuera | x", "a b | x", " | x", "tests\\a.py | x", "tests/ | x")),
          "capas: una fila 'needs' sin decir que es, o que no nombra un fichero del repositorio (una carpeta puede no tener nada que correr), no vale (visto fallar)")
    need = {"pattern": "tests/test*.py", "what": "el primer test del producto", "problem": ""}
    check(I.readiness_problems("lista", [need], {"tests/test_a.py", "README.md"}, set(), [], [], [], "layer") == [], "capas: con lo que necesita en el destino, la capa entra")
    said = I.readiness_problems("lista", [need], {"README.md"}, set(), [], [], [], "new")
    check(len(said) == 1 and "el primer test del producto" in said[0] and "tests/test*.py" in said[0] and "sin --layer" in said[0],
          "capas: la negativa dice con que entra la capa, y en un repositorio nuevo, que se instancie sin ella (visto fallar)")
    said = I.readiness_problems("lista", [need], {"README.md"}, set(), [], [], [], "existing")
    check(len(said) == 1 and "sin --layer" in said[0], "capas: en un repositorio que ya existe y no tiene su primer test, la negativa tambien dice que se instancie sin la capa (visto fallar)")
    said = I.readiness_problems("lista", [need], {"README.md"}, set(), [], [], [], "layer")
    check(len(said) == 1 and "sin --layer" not in said[0] and "aplicala cuando lo tenga" in said[0],
          "capas: sobre una instancia que ya tiene el andamio, la negativa no pide instanciar otra vez")
    said = I.readiness_problems("lista", [need], {"README.md"}, set(), ["- **Cada regla con su test en `tests/`.** Puerta: `x`."], [".md"], [], "new")
    check(len(said) == 1 and "el primer test del producto" in said[0],
          "capas: mientras falta lo que la capa necesita, su cita de eso mismo no se cuenta otra vez: una causa, una negativa (visto fallar)")
    known = set()
    B.add_suffixes(known, "docs/ARCH.md")
    lines = ["- **Forma.** En `docs/ARCH.md` y `docs/FALTA.md`. Puerta: `x`."]
    said = I.readiness_problems("lista", [], {"docs/ARCH.md"}, known, lines, [".md"], [], "layer")
    check(len(said) == 1 and "docs/FALTA.md" in said[0], "capas: lo que la capa escribe en el contrato solo cita lo que existe; lo demas para la capa (visto fallar)")
    if shutil.which("git") is None:
        check(True, "capas: sin git no se instancia")
        end()
        return
    with scratch_tree() as template, scratch_tree() as scratch:
        fake_template(template)
        target = os.path.join(scratch, "nuevo")
        code, said = quietly(I.main, [target, "--layer", "lista", "--apply"], template, "2026-02-03")
        check(code == 1 and "el primer test del producto" in said and "tests/test*.py" in said and not os.path.exists(target),
              "capas: una capa que entra con el primer test no se aplica junto a un repositorio nuevo: se para antes de escribir nada y dice con que entra (visto fallar)")
        code, said = quietly(I.main, [target, "--apply"], template, "2026-02-03")
        before = tree_bytes(target)
        code, said = quietly(I.main, [target, "--layer", "lista", "--apply"], template)
        check(code == 1 and "el primer test del producto" in said and tree_bytes(target) == before,
              "capas: sobre una instancia sin su primer test, la capa se niega y no toca nada (visto fallar)")
        check("RESULT: 1 problemas" in said, "capas: la negativa por el primer test que falta es una sola, aunque la capa cite tests/ (visto fallar)")
        write(target, "tests/unit/test_hondo.py", "x = 1\n")
        code, said = quietly(I.main, [target, "--layer", "lista"], template)
        check(code == 1 and "el primer test del producto" in said, "capas: un fichero que no casa con el patron no cuenta como lo que la capa necesita")
        write(target, "tests/test_a.py", "x = 1\n")
        code, said = quietly(I.main, [target, "--layer", "lista", "--apply"], template)
        quietly(B.build, target)
        cited = [f["key"] for f in findings_of(target) if f["kind"] == B.KIND_CITE]
        check(code == 0 and "`tests/`" in read_bytes(target, "AGENTS.md").decode("utf-8") and cited == [],
              "capas: con su primer test en el arbol, aunque no este commiteado, la capa entra y su cita de tests/ resuelve (visto fallar)")
        existing = os.path.join(scratch, "existente")
        write(existing, "src/app.py", "x = 1\n")
        write(existing, "tests/test_app.py", "x = 1\n")
        commit_all(existing)
        code, said = quietly(I.main, [existing, "--layer", "lista", "--apply"], template, "2026-02-03")
        check(code == 0 and b"pruebas | - |" in read_bytes(existing, "gates.txt"),
              "capas: un repositorio que ya tiene sus tests recibe el andamio y la capa a la vez (visto fallar)")
        ignored = os.path.join(scratch, "ignorado")
        write(ignored, ".gitignore", "tests/\n")
        write(ignored, "tests/test_app.py", "x = 1\n")
        commit_all(ignored)
        code, said = quietly(I.main, [ignored, "--layer", "lista"], template)
        check(code == 1 and "el primer test del producto" in said, "capas: lo que git ignora no esta en el repositorio y no cuenta como lo que la capa necesita")
        code, said = quietly(I.main, [os.path.join(scratch, "x"), "--layer", "sin-entrada"], template)
        check(code == 1 and "'suite'" in said and "needs" in said,
              "capas: una capa con un runner de tests que no declara con que entra no vale: un runner sin nada que ejecutar es rojo (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "x"), "--layer", "mal-entrada"], template)
        check(code == 1 and said.count("needs ") >= 4 and "/tests" in said and "../fuera" in said and "dos palabras" in said,
              "capas: cada fila 'needs' que no vale se dice, antes de nada (visto fallar)")
        check(I.parse_external("frontend/app | sin red en la suite") == {"folder": "frontend/app", "why": "sin red en la suite", "problem": ""},
              "capas: una fila 'external' es la carpeta de su plantilla de stack y por que sus puertas se aceptan fuera de la suite")
        code, said = quietly(I.main, [os.path.join(scratch, "x"), "--layer", "dos-fuera"], template)
        check(code == 1 and "2 filas 'external'" in said and not os.path.exists(os.path.join(scratch, "x")),
              "capas: una capa dice una vez como mucho donde vive su producto y por que la suite no corre sus puertas (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "x"), "--layer", "mal-fuera"], template)
        check(code == 1 and "../fuera" in said and "stack/sin-razon" in said and "no dice por que" in said and not os.path.exists(os.path.join(scratch, "x")),
              "capas: una fila 'external' fuera del repositorio o sin decir por que no vale, y se dice antes de nada (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "x"), "--layer", "prepara-sin-fuera"], template)
        check(code == 1 and "filas 'prepare' sin una 'external'" in said and not os.path.exists(os.path.join(scratch, "x")),
              "capas: una fila 'prepare' solo vale en una capa externa, la unica cuya aceptacion la corre (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "x"), "--layer", "ajena"], template)
        check(code == 1 and "la clave 'extra' no es de una capa" in said and not os.path.exists(os.path.join(scratch, "x")),
              "capas: una clave que la leyenda declara y una capa no tiene es un problema del plan, no un error del motor (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "rota"), "--layer", "cita-rota", "--apply"], template, "2026-02-03")
        check(code == 1 and "docs/FALTA.md" in said and not os.path.exists(os.path.join(scratch, "rota")),
              "capas: una capa cuyo estandar cita lo que ni el destino tiene ni ella trae se para antes de escribir: el tablero daria la cita por rota (visto fallar)")
        code, said = quietly(I.main, [os.path.join(scratch, "trae"), "--layer", "trae"], template)
        check("`tool/lint/`" not in said, "capas: las carpetas de lo que la capa trae existen para sus citas (visto fallar)")
        check("`informes/ultimo.txt`" not in said, "capas: una cita dentro de un arbol que la capa declara generado no esta rota (visto fallar)")
        check(code == 0, "capas: una capa cuyas citas resuelven con lo que trae y lo que genera entra %s" % ("" if code == 0 else last_words(said)))
    end()


def instance_gates(root, skipped=()):
    """Runs every gate of an instance but the engine's suite and the ones
    named in `skipped`, and returns the exit code and what verify.py said.
    The instance's suite is this very suite: the instance's documents gate,
    which does run, says its engine is the sealed one, and running it here
    again would double the template's run."""
    with open(os.path.join(root, V.GATES_FILE), encoding="utf-8") as handle:
        gates = V.parse_gates(handle.read(), sys.executable)["gates"]
    suite = os.path.relpath(os.path.abspath(__file__), V.ROOT).replace("\\", "/")
    labels = [gate["label"] for gate in gates if not B.named_files(gate["raw"], {suite}) and gate["label"] not in skipped]
    done = subprocess.run([sys.executable, B.RUNNER_FILE, "--"] + labels, cwd=root, env=sanitized_env(),
                          stdin=subprocess.DEVNULL, capture_output=True, timeout=300)
    said = done.stdout.decode("utf-8", "replace") + done.stderr.decode("utf-8", "replace")
    green = done.returncode == 0 and said.strip().splitlines()[-1].startswith("RESULT: %d puertas, 0 en rojo" % len(labels))
    return (0 if green else 1), said


def last_words(said):
    """The end of what a step printed, for the name of a check that failed."""
    lines = [line.strip() for line in said.strip().splitlines() if line.strip()]
    return " | ".join(lines[-4:])[:400]


def test_template_layers():
    """The acceptance of every layer of the template, end to end, on
    instances of a committed snapshot of this very template: a new instance
    is green without the layer; the layer applied to it is either refused for
    what it needs, touching nothing, or green; with the product of the
    layer's ready/ folder in it, the layer enters and every gate of the
    instance is green; and an existing repository that already has that
    product takes the scaffold and the layer at once, green too. A layer whose
    gates this suite cannot run ('external': they need what it does not
    install, or more than its budget) has no ready/, because its product is
    its stack template: applied too early it is refused touching nothing, and
    that stack template's sources take the scaffold and the layer at once with
    every gate of the scaffold green. Its own gates are accepted outside, by
    overlays/accept.py."""
    begin("test_template_layers")
    import instantiate as I
    folder = os.path.join(V.ROOT, I.LAYERS_DIR)
    names = sorted(n for n in os.listdir(folder) if os.path.isfile(os.path.join(folder, n, I.LAYER_FILE))) if os.path.isdir(folder) else []
    if not names or shutil.which("git") is None:
        check(not names or shutil.which("git") is None, "capas: solo la plantilla tiene capas, y sin git no se instancia ninguna")
        end()
        return
    with scratch_tree() as template, scratch_tree() as base:
        template_snapshot(template)
        listing = I.template_listing(template)["files"]
        # One new instance, the same for every layer: each layer gets a copy of it.
        fresh = os.path.join(base, "nueva")
        made, said = quietly(I.main, [fresh, "--apply"], template)
        green, said = instance_gates(fresh) if made == 0 else (1, said)
        check(green == 0, "capas: la instancia nueva, sin capa, sale en verde %s" % (last_words(said) if green else ""))
        if green != 0:
            end()
            return
        for name in names:
            ready_root = os.path.join(template, I.LAYERS_DIR, name, I.LAYER_READY)
            ready = B.walk_files(ready_root, [])["files"] if os.path.isdir(ready_root) else []
            layer = I.read_layer(template, name, listing)
            with scratch_tree() as scratch:
                target = os.path.join(scratch, "nueva")
                shutil.copytree(fresh, target)
                before = tree_bytes(target)
                layered, said = quietly(I.main, [target, "--layer", name, "--apply"], template)
                if layer["external"]:
                    accept_external(I, template, scratch, layer, ready, layered == 0 or tree_bytes(target) != before, said)
                    continue
                if layered != 0:
                    refused = "NO: la capa %s entra con " % name in said and tree_bytes(target) == before
                    check(refused, "capas (%s): aplicada antes de tiempo, la capa se niega por lo que declara en 'needs' y no toca nada (visto fallar) %s"
                          % (name, "" if refused else last_words(said)))
                    for path in ready:
                        write(target, path, read_bytes(ready_root, path))
                    layered, said = quietly(I.main, [target, "--layer", name, "--apply"], template)
                green, said = instance_gates(target) if layered == 0 else (1, said)
                check(green == 0, "capas (%s): con el producto de ready/, la capa entra y todas las puertas de la instancia salen en verde (visto fallar) %s"
                      % (name, last_words(said) if green else ""))
                existing = os.path.join(scratch, "existente")
                write(existing, "README.md", "# Producto existente\n\nUn producto que ya tenia sus tests.\n")
                for path in ready:
                    write(existing, path, read_bytes(ready_root, path))
                commit_all(existing)
                both, said = quietly(I.main, [existing, "--layer", name, "--apply"], template)
                green, said = instance_gates(existing) if both == 0 else (1, said)
                check(green == 0, "capas (%s): un repositorio que ya tiene ese producto recibe el andamio y la capa a la vez, en verde (visto fallar) %s"
                      % (name, last_words(said) if green else ""))
    end()


def accept_external(I, template, scratch, layer, ready, touched, said):
    """What this suite accepts of a layer whose gates it cannot run: applied
    to a new instance it is refused for what it needs and touches nothing; it
    has no ready/; and the sources of its stack template, committed as an
    existing repository, take the scaffold and the layer at once with every
    gate of the scaffold green. That proves its plan, and what it writes and
    cites, against its real product; its own gates run outside. A clone never
    sees the layer, so each of its 'prepare' rows is a command the README of
    its stack template shows on a line of its own."""
    name, stack = layer["name"], layer["external"][0]
    refused = not touched and "NO: la capa %s entra con " % name in said
    check(refused and not ready, "capas (%s): sus puertas se aceptan fuera de esta suite (%s); aplicada antes de tiempo se niega sin tocar nada,"
          " y no tiene ready/, porque su producto es su plantilla de stack (visto fallar) %s" % (name, stack["why"], "" if refused else last_words(said)))
    tool = accept_tool()
    try:
        sources = tool.sources(tool.stack_folder(V.ROOT, stack["folder"])) if tool else {}
        failed = "ni %s ni git dan las fuentes de %s" % (ACCEPT_FILE, stack["folder"])
    except tool.Refused as error:
        sources, failed = {}, str(error)
    readme = [line.strip() for line in sources.get("README.md", {"data": b""})["data"].decode("utf-8", "replace").splitlines()]
    # A README writes the interpreter as a person types it.
    unshown = [row for row in layer["prepare"] if row.replace(V.PYTHON_TOKEN, "python") not in readme]
    check(not unshown, "capas (%s): cada fila 'prepare' es un comando que el README de %s ensena en su propia linea, porque un clon no ve la capa"
          " (visto fallar) %s" % (name, stack["folder"], unshown or ""))
    existing = os.path.join(scratch, "existente")
    if sources:
        # The same copy overlays/accept.py makes of the stack template.
        quietly(tool.committed_copy, sources, existing, "chore: start")
        both, said = quietly(I.main, [existing, "--layer", name, "--apply"], template)
    else:
        both, said = 1, failed
    # The layer's own gates are the ones accepted outside; its rows parse, or the plan would not have applied it.
    own = [V.parse_gate_row(row, 0, "python")["label"] for row in layer["gates"]] if both == 0 else []
    green, said = instance_gates(existing, own) if both == 0 else (1, said)
    check(green == 0, "capas (%s): las fuentes de su plantilla de stack, %s, reciben el andamio y la capa a la vez, y las puertas del andamio"
          " salen en verde (visto fallar) %s" % (name, stack["folder"], last_words(said) if green else ""))


ACCEPT_FILE = "accept.py"


def accept_tool():
    """overlays/accept.py, which accepts the layers whose gates this suite
    cannot run, loaded by its path; None in a copy, which has no overlays."""
    import instantiate as I
    path = os.path.join(V.ROOT, I.LAYERS_DIR, ACCEPT_FILE)
    if not os.path.isfile(path):
        return None
    spec = importlib.util.spec_from_file_location("accept", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# A layer whose gate is green only after its 'prepare' row ran in the instance.
FAKE_EXTERNAL = ("# Una capa cuyas puertas se aceptan fuera de la suite.\n" + LAYER_LEGEND + "requires 0.0.1\n"
                 "external stack/app | la prueba de la aceptacion de fuera\nneeds entrada.txt | la entrada del producto\n"
                 "gate preparado | - | {python} -c \"import os, sys; sys.exit(0 if os.path.isfile('preparado/hecho.txt') else 1)\"\n"
                 "prepare {python} -c \"import os; os.makedirs('preparado', exist_ok=True); open('preparado/hecho.txt', 'w').write('si')\"\n"
                 "ignore preparado/\n")


def scripted(results):
    """A runner for the steps of accept.py that answers each one with the next
    of `results` (an exit code and its lines, or 'timeout') and records what it
    was asked to run, with its budget and where."""
    ran = []

    def run(command, seconds, root):
        ran.append((command, seconds, root))
        answer = results.pop(0)
        if answer == "timeout":
            kill = {"exited": False, "tree": True, "gone": True, "how": "x", "scope": "s", "pid": 1}
            return {"timed_out": True, "code": -1, "lines": [], "seconds": seconds, "budget": seconds, "kill": kill}
        return {"timed_out": False, "code": answer[0], "lines": answer[1], "seconds": 0.1, "budget": seconds, "kill": None}
    return run, ran


def test_accept():
    """overlays/accept.py accepts a layer whose gates this suite cannot run, on
    a fake one that needs no toolchain: the copies hold what git lists and not
    what it ignores, executable where git's index says so, on `main`; the
    scaffold and the layer enter the stack template's sources at once; the
    layer's 'prepare' rows run in the instance, in order, before verify.py;
    and verify.py records the verdict once and is then green twice. A command
    line it cannot take says how to use it and creates nothing; a git that
    cannot list is said as such; the folder never reaches a step's command
    line; and a stop ends it with its RESULT line and 130. Only the template
    has the tool."""
    begin("test_accept")
    tool = accept_tool()
    if tool is None or shutil.which("git") is None:
        check(tool is None or shutil.which("git") is None, "aceptacion: solo la plantilla la tiene, y sin git no se acepta nada")
        end()
        return
    with scratch_tree() as product:
        write(product, V.GATES_FILE, "uno | 10 | x\nboard: build | 1 | y\n")
        layer = {"prepare": ["{python} -c \"print('uno')\"", "echo dos"]}
        changed = (1, [V.result_line(2, [], True)])
        green = (0, [V.result_line(2, [], False)])
        run, ran = scripted([(0, ["uno"]), (0, ["dos"]), changed, green, green])
        quietly(tool.run_gates, product, layer, 2, run)
        check([command for command, _, _ in ran[:2]] == [V.expand(layer["prepare"][0], sys.executable), "echo dos"]
              and all("verify.py" in command for command, _, _ in ran[2:]) and len(ran) == 5 and {root for _, _, root in ran} == {product},
              "aceptacion: las filas 'prepare' corren en la instancia, en su orden y con {python} sustituido, antes de verify.py (visto fallar)")
        # Each gate's budget (never under 60 s) and the time to kill it, and board: build once more for a verdict that changes.
        check(ran[2][1] == 3 * (60 + V.KILL_WAIT_SECONDS) and ran[0][1] == tool.PREPARE_SECONDS,
              "aceptacion: verify.py tiene de tope lo que suman los topes de sus puertas, y la reconstruccion del veredicto (visto fallar)")
        # A first run that recorded the verdict with a gate red is red, not the verdict's first record.
        red = (1, [V.result_line(2, ["uno"], True)])
        for results, says, calls in (([(1, ["fallo"])], "'prepare {python}", 1), (["timeout"], "sin veredicto tras su tope", 1),
                                     ([(0, []), (0, []), red], "la primera corrida", 3),
                                     ([(0, []), (0, []), changed, green, red], "la corrida 2 de 2", 5)):
            run, ran = scripted(list(results))
            try:
                quietly(tool.run_gates, product, layer, 2, run)
                refused = ""
            except tool.Refused as error:
                refused = str(error)
            stopped = says in refused and len(ran) == calls
            check(stopped, "aceptacion: un paso que no sale en verde la para ahi y lo dice: '%s' (visto fallar) %s" % (says, "" if stopped else refused))
        # Outside every repository, wherever the machine keeps its temporary folders.
        with environment(GIT_CEILING_DIRECTORIES=os.path.dirname(product)):
            for name, call, says in (("las fuentes", lambda: tool.sources(product), "git ls-files salio con"),
                                     ("la carpeta de la plantilla de stack", lambda: tool.stack_folder(product, "stack/app"), "git rev-parse salio con")):
                try:
                    refused = "sin negarse: %r" % (call(),)
                except tool.Refused as error:
                    refused = str(error)
                check(says in refused, "aceptacion: si git no puede decir %s, se dice que fallo git, no que la capa o su plantilla no tienen nada (visto fallar) %s"
                      % (name, "" if says in refused else refused))
    with scratch_tree() as repo, scratch_tree() as out:
        scaffold, app = os.path.join(repo, "agentic-scaffold"), os.path.join(repo, "stack", "app")
        for path in B.walk_files(V.ROOT, [])["files"]:
            write(scaffold, path, read_bytes(V.ROOT, path))
        # Without the suite's row: each verify.py of the instance would run this suite again.
        gates = read_bytes(scaffold, V.GATES_FILE).decode("utf-8")
        write(scaffold, V.GATES_FILE, "".join(line for line in gates.splitlines(True) if not line.startswith("board: tests")))
        write(scaffold, "overlays/fuera/layer.txt", FAKE_EXTERNAL)
        write(scaffold, "overlays/rota/layer.txt", FAKE_EXTERNAL + "external stack/otra | otra razon\n")
        quietly(B.main_on, ["seal"], scaffold)
        write(app, "README.md", "# App\n\nLa app de prueba.\n")
        write(app, "entrada.txt", "x\n")
        write(app, ".gitignore", "dist/\n")
        write(app, "dist/viejo.js", "ignorado\n")
        write(app, "borrado.txt", "commiteado y borrado\n")
        write(app, "lanza.sh", "#!/bin/sh\necho lanza\n")
        init_repository(repo)
        git_run(repo, "add", "stack/app/borrado.txt")
        git_run(repo, "commit", "-q", "--no-verify", "-m", "chore: start")
        git_run(repo, "add", "--chmod=+x", "stack/app/lanza.sh")
        os.remove(os.path.join(app, "borrado.txt"))
        found = tool.sources(app)
        check(sorted(found) == [".gitignore", "README.md", "entrada.txt", "lanza.sh"] and tool.sources(os.path.join(repo, "stack", "nada")) == {},
              "aceptacion: las fuentes son lo que git lista, commiteado o no, sin lo que ignora ni lo que ya no esta en disco (visto fallar)")
        check(found["lanza.sh"]["executable"] and not found["README.md"]["executable"],
              "aceptacion: una fuente es ejecutable cuando el indice de git la tiene asi, aunque no este commiteada (visto fallar)")
        write(out, "llena/viejo.txt", "de otra corrida\n")
        for argv, case in ((["fuera", os.path.join(out, "llena")], "con una carpeta que no esta vacia"), ([], "sin argumentos"),
                           (["fuera", os.path.join(out, "nueva"), "--rapido"], "con una opcion de mas"),
                           (["--rapido", os.path.join(out, "nueva")], "con una opcion en lugar de la capa"),
                           (["fuera", os.path.join(out, "nueva"), "--runs", "0"], "con --runs 0"),
                           (["fuera", os.path.join(out, "nueva"), "--runs", "²"], "con --runs ², un digito que no es un numero")):
            code, said = quietly(tool.main, argv, scaffold)
            check(code == 2 and "uso:" in said and os.listdir(out) == ["llena"] and os.listdir(os.path.join(out, "llena")) == ["viejo.txt"],
                  "aceptacion: %s dice el uso y sale con 2, sin crear ni tocar nada (visto fallar)" % case)
        code, said = quietly(tool.main, ["python", os.path.join(out, "interna")], scaffold)
        check(code == 1 and "no declara 'external'" in said and not os.path.exists(os.path.join(out, "interna")),
              "aceptacion: una capa que la suite acepta entera no se acepta fuera, y no se copia nada (visto fallar)")
        code, said = quietly(tool.main, ["rota", os.path.join(out, "rota")], scaffold)
        check(code == 1 and "2 filas 'external'" in said and not os.path.exists(os.path.join(out, "rota")),
              "aceptacion: una capa con problemas se para con ellos antes de copiar nada (visto fallar)")
        # A '&' in a command line splits it in cmd.exe and in sh: the folder's name stays out of every step's.
        accepted = os.path.join(out, "fuera&eco")
        # The machine's git would name the copies' branch 'otra'.
        with environment(GIT_CONFIG_COUNT="1", GIT_CONFIG_KEY_0="init.defaultBranch", GIT_CONFIG_VALUE_0="otra"):
            code, said = quietly(tool.main, ["fuera", accepted], scaffold)
        instance = os.path.join(accepted, "producto")
        check(code == 0 and said.strip().splitlines()[-1].startswith("RESULT: capa fuera aceptada")
              and os.path.isfile(os.path.join(instance, "preparado", "hecho.txt")) and not os.path.exists(os.path.join(instance, "dist"))
              and b"\npreparado | - |" in read_bytes(instance, V.GATES_FILE),
              "aceptacion: una capa externa de mentira entra en las fuentes de su plantilla de stack, su 'prepare' corre y verify.py sale en"
              " verde tras escribir el veredicto (visto fallar) %s" % ("" if code == 0 else last_words(said)))
        runs = [line.split(" (tope ")[0] for line in said.splitlines() if line.startswith("--- verify.py, ") and " (tope " in line]
        twice = runs == ["--- verify.py, la corrida que escribe el veredicto", "--- verify.py, corrida 1 de 2", "--- verify.py, corrida 2 de 2"]
        check(twice and "en verde 2 veces seguidas" in said.strip().splitlines()[-1],
              "aceptacion: sin --runs, verify.py corre una vez para escribir el veredicto y dos mas en verde (visto fallar) %s" % ("" if twice else runs))
        steps = [line for line in said.splitlines() if line.startswith("--- ") and " (tope " in line]
        check(code == 0 and steps and not any(accepted in line for line in steps),
              "aceptacion: la carpeta no llega a la linea de comandos de ningun paso, asi que un '&' en su nombre no la parte (visto fallar)")
        check(code == 0 and git_run(instance, "ls-files", "-s", "--", "lanza.sh").stdout.decode().startswith(B.EXECUTABLE_MODE + " ")
              and git_run(instance, "rev-parse", "--abbrev-ref", "HEAD").stdout.decode().strip() == "main",
              "aceptacion: la copia commiteada tiene ejecutable lo que el indice de su fuente tiene asi, en la rama main, como un clon (visto fallar)")
        handlers, before = [], signal.getsignal(signal.SIGTERM)

        def stopped(command, seconds, root):
            handlers.append(signal.getsignal(signal.SIGTERM))
            raise V.GateInterrupted({"exited": False, "tree": True, "gone": True, "how": "x", "scope": "s", "pid": 1}, "SIGTERM")
        try:
            code, said = quietly(tool.main, ["fuera", os.path.join(out, "parada")], scaffold, stopped)
        except KeyboardInterrupt:
            code, said = "la interrupcion escapo de main", ""
        last = said.strip().splitlines()[-1] if said.strip() else ""
        check(code == V.INTERRUPTED_EXIT and last.startswith("RESULT: la capa fuera NO queda aceptada: interrumpida (SIGTERM: matada, y no queda vivo nada"),
              "aceptacion: una parada mata el paso en curso y acaba con su linea RESULT y 130, como verify.py (visto fallar) %s" % ("" if code == V.INTERRUPTED_EXIT else code))
        check(handlers == [V.stop_on] and signal.getsignal(signal.SIGTERM) == before,
              "aceptacion: mientras corren los pasos, SIGTERM toma el camino del Ctrl+C, y despues vuelve lo que habia (visto fallar)")
    end()


ONE_UNITTEST = "import unittest\n\n\nclass One(unittest.TestCase):\n    def test_one(self):\n        self.assertEqual(1 + 1, 2)\n"


def test_python_layer_needs():
    """What the python layer needs is necessary and never more: every tree in
    which the runner of its gate, tools/guards/python_unittest.py, runs a test
    green has a file that matches each of its 'needs' rows, also when the
    test lives in a package nested under tests/, so that a product whose
    tests run is never refused; and a tree with no test module at all does
    not, so that the layer never enters with nothing to run. Only the
    template has the layer."""
    begin("test_python_layer_needs")
    import components as C
    import instantiate as I
    data = os.path.join(V.ROOT, I.LAYERS_DIR, "python", I.LAYER_FILE)
    if not os.path.isfile(data):
        check(True, "capas: solo la plantilla tiene la capa python")
        end()
        return
    with open(data, encoding="utf-8") as handle:
        needs = [I.parse_need(row["value"])["pattern"] for row in B.parse_data(handle.read(), data, []) if row["keyword"] == "needs"]
    trees = (["tests/test_core.py"], ["tests/unit/__init__.py", "tests/unit/test_core.py"],
             ["tests/__init__.py", "tests/unit/__init__.py", "tests/unit/domain/__init__.py", "tests/unit/domain/test_core.py"])
    for tree in trees:
        with scratch_tree() as root:
            for rel in tree:
                write(root, rel, ONE_UNITTEST if rel.endswith("test_core.py") else "")
            code, said = guard_run(root, "python_unittest.py", "tests")
            unmet = [pattern for pattern in needs if not any(C.matches(pattern, rel) for rel in tree)]
            check(code == 0 and needs and not unmet, "capas (python): con %s, cuyo test corre en verde, la capa tiene lo que necesita (visto fallar) %s"
                  % (tree[-1], "" if code == 0 and needs and not unmet else "%s | sin casar: %s" % (last_words(said), unmet)))
    for tree in (["tests/__init__.py"], ["tests/unit/__init__.py", "tests/unit/helpers.py"]):
        with scratch_tree() as root:
            for rel in tree:
                write(root, rel, "")
            code, said = guard_run(root, "python_unittest.py", "tests")
            unmet = [pattern for pattern in needs if not any(C.matches(pattern, rel) for rel in tree)]
            check(code == 1 and unmet, "capas (python): con %s y ningun modulo de tests, que su runner da en rojo, la capa no entra (visto fallar)" % tree[-1])
    end()


# Each released version of the scaffold is a tag of the repository that holds
# the template, which an upgrade copies its files from (the scaffold's README).
# The versions released before the template's folder was renamed keep the
# tags they were published with.
RELEASE_TAG = "agentic-scaffold-v%s"
FORMER_RELEASE_TAG, FORMER_RELEASES = "andamio-v%s", ("0.2.0", "0.3.0")


def release_tag(version):
    """The tag `version` of the scaffold is released with."""
    return (FORMER_RELEASE_TAG if version in FORMER_RELEASES else RELEASE_TAG) % version


def released_engine(version, current, root=None):
    """The engine files of the template as `version` was released: the
    `engine` rows of the one MANIFEST.txt with `template` rows in the tree of
    its tag, wherever the template's folder was then; for the version in
    progress, not tagged yet, those of `current`, the template's own. The
    paths and '', or None and why."""
    import instantiate as I
    root = V.ROOT if root is None else root
    tag = release_tag(version)
    listed = git_run(root, "ls-tree", "-r", "--full-tree", "--name-only", "-z", tag)
    if listed.returncode != 0 and version == current["version"]:
        return {path for path, _ in current["engine"]}, ""
    if listed.returncode != 0:
        return None, "la etiqueta %s no esta en este clon (git fetch --tags): %s" % (tag, last_words(listed.stderr.decode("utf-8", "replace")))
    manifests = []
    for path in listed.stdout.decode("utf-8", "replace").split("\0"):
        if path != I.MANIFEST_FILE and not path.endswith("/" + I.MANIFEST_FILE):
            continue
        shown = git_run(root, "show", "%s:%s" % (tag, path))
        manifest = B.read_manifest(B.parse_data(shown.stdout.decode("utf-8", "replace"), path, []), [])
        if shown.returncode == 0 and B.is_template(manifest):
            manifests.append(manifest)
    if len(manifests) != 1:
        return None, "el arbol de %s tiene %d %s con filas '%s', y la plantilla es uno" % (tag, len(manifests), I.MANIFEST_FILE, B.TEMPLATE_KEY)
    return {path for path, _ in manifests[0]["engine"]}, ""


def test_released_engine():
    begin("test_released_engine")
    if shutil.which("git") is None:
        check(True, "motor publicado: sin git no se construye el repositorio aislado de etiquetas")
        end()
        return
    sealed = B.engine_hash(b"fixture\n")
    current = {"version": "0.3.2", "engine": [("unreleased.py", sealed)], "template": ["overlays"]}
    manifest = legend(MANIFEST_KEYS) + "version 0.3.2\nengine released.py %s\n" % sealed
    with scratch_tree() as root:
        write(root, "instance/tools/board/MANIFEST.txt", manifest)
        commit_all(root)
        check(released_engine("0.3.2", current, root) == ({"unreleased.py"}, ""),
              "motor publicado: sin la etiqueta de la version en curso usa exactamente su motor en disco (visto fallar)")
        missing, why = released_engine("0.0.0", current, root)
        check(missing is None and "agentic-scaffold-v0.0.0" in why,
              "motor publicado: otra version sin etiqueta no hereda el motor en disco y dice que etiqueta falta (visto fallar)")
        check(git_run(root, "tag", release_tag("0.3.1")).returncode == 0,
              "motor publicado: la fixture crea una etiqueta cuyo arbol solo tiene un manifiesto de instancia")
        absent, why = released_engine("0.3.1", current, root)
        check(absent is None and "tiene 0" in why,
              "motor publicado: un manifiesto de instancia no reemplaza al de la plantilla publicada (visto fallar)")
        path = "previous-name/tools/board/MANIFEST.txt"
        write(root, path, manifest + "template overlays\n")
        commit_all(root)
        check(git_run(root, "tag", release_tag("0.3.2")).returncode == 0,
              "motor publicado: la fixture etiqueta el motor en una carpeta anterior, junto a una instancia")
        write(root, path, manifest.replace("released.py", "changed.py") + "template overlays\n")
        check(released_engine("0.3.2", current, root) == ({"released.py"}, ""),
              "motor publicado: aun siendo la version en curso lee el unico manifiesto de plantilla de la etiqueta, no el motor ni el fichero en disco (visto fallar)")
        write(root, "second/tools/board/MANIFEST.txt", manifest + "template overlays\n")
        commit_all(root)
        check(git_run(root, "tag", release_tag("0.3.3")).returncode == 0,
              "motor publicado: la fixture crea una etiqueta con dos manifiestos de plantilla")
        ambiguous, why = released_engine("0.3.3", current, root)
        check(ambiguous is None and "tiene 2" in why,
              "motor publicado: dos manifiestos de plantilla son ambiguos, nunca se toma el primero (visto fallar)")
    end()


def test_layer_requires_its_engine():
    """A layer's 'requires' is declared, and instantiate.py refuses the layer
    on an instance whose engine is older; what makes that number true is held
    here: every engine file a gate row of the layer runs is an `engine` row of
    the template as that version was released. What the layer writes into the
    contract cites files that the plan already checks against the instance,
    and the grammar of its rows ('[harness]') is in no manifest: necessary,
    not sufficient. Only the template has layers."""
    begin("test_layer_requires_its_engine")
    import instantiate as I
    folder = os.path.join(V.ROOT, I.LAYERS_DIR)
    names = sorted(n for n in os.listdir(folder) if os.path.isfile(os.path.join(folder, n, I.LAYER_FILE))) if os.path.isdir(folder) else []
    if not names or shutil.which("git") is None:
        check(not names or shutil.which("git") is None, "capas: solo la plantilla tiene capas, y sin git no se leen sus versiones publicadas")
        end()
        return
    current = I.manifest_of(V.ROOT)
    engine, released = {path for path, _ in current["engine"]}, {}
    check([release_tag(version) for version in ("0.2.0", "0.3.0", "0.3.2")] == ["andamio-v0.2.0", "andamio-v0.3.0", "agentic-scaffold-v0.3.2"],
          "capas: 0.2.0 y 0.3.0 conservan la etiqueta andamio-v<version> con la que se publicaron, y las siguientes llevan agentic-scaffold-v<version>"
          " (visto fallar)")
    for name in names:
        data = "%s/%s/%s" % (I.LAYERS_DIR, name, I.LAYER_FILE)
        with open(os.path.join(V.ROOT, *data.split("/")), encoding="utf-8") as handle:
            rows = B.parse_data(handle.read(), data, [])
        version = (B.values_of(rows, "requires") or [""])[0]
        if version not in released:
            released[version] = released_engine(version, current)
        sealed, why = released[version]
        runs = list(dict.fromkeys(path for row in B.values_of(rows, "gate") for path in B.named_files(V.parse_gate_row(row, 0, "python")["raw"], engine)))
        missing = [path for path in runs if sealed is None or path not in sealed]
        check(sealed is not None and not missing, "capas (%s): pide el motor %s, y cada fichero del motor que corren sus puertas es del motor de esa version"
              " publicada (visto fallar) %s" % (name, version, why or ("%s no es del motor de %s" % (", ".join(missing), version) if missing else "")))
    end()


def test_engine_manifest():
    begin("test_engine_manifest")
    check(B.engine_hash(b"a\r\nb\n") == B.engine_hash(b"a\nb\n") != B.engine_hash(b"a\nc\n"),
          "motor: la huella de un fichero del motor no cambia por sus finales de linea, y si por su contenido (visto fallar)")
    sealed = B.engine_hash(b"x\n")
    check(B.engine_files_are_unchanged([("x.py", sealed)], {"x.py": sealed}) == [], "motor: un fichero del motor como lo trajo la plantilla no sale")
    found = B.engine_files_are_unchanged([("x.py", sealed), ("y.py", sealed), ("z.py", "-")], {"x.py": B.engine_hash(b"otro\n"), "y.py": None, "z.py": sealed})
    check([(f["kind"], f["key"]) for f in found] == [(B.KIND_ENGINE, "x.py"), (B.KIND_ENGINE, "y.py"), (B.KIND_ENGINE, "z.py")]
          and "cambio" in found[0]["message"] and "no existe" in found[1]["message"] and "sellar" in found[2]["message"],
          "motor: uno cambiado, uno que falta y uno sin sellar salen, cada uno con su clase propia y excusable (visto fallar)")
    check(all("cabecera de tools/board/MANIFEST.txt" in f["message"] for f in found[:2]),
          "motor: el hallazgo de un fichero del motor cambiado o que falta dice donde se lee como se actualiza el motor (visto fallar)")
    import instantiate as I
    shipped = read_bytes(V.ROOT, I.MANIFEST_FILE).decode("utf-8")
    headers = [text.split(B.LEGEND_OPEN)[0] for text in (shipped, I.instance_manifest(shipped))]
    check(all("tools/board/upgrade.py" in header for header in headers),
          "motor: la cabecera del MANIFEST.txt de este arbol, y la del que recibe una copia, nombra la herramienta que actualiza el motor (visto fallar)")
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "x.py", "print(1)\n")
        append(root, "tools/board/MANIFEST.txt", "\n# El motor.\nengine x.py %s\n" % B.engine_hash(b"print(1)\n"))
        check(findings_of(root) == [], "integracion: el motor tal como se sello no sale")
        write(root, "x.py", "print(2)\n")
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_ENGINE and found[0]["key"] == "x.py", "integracion: un fichero del motor cambiado en la instancia sale (visto fallar)")
        append(root, "tools/board/exceptions.txt", "# Un parche local, a la espera de la version que lo traiga.\n%s x.py\n" % B.KIND_ENGINE)
        check(findings_of(root) == [], "integracion: un parche local del motor se declara con su motivo y deja de salir")
        code, said = quietly(B.main_on, ["seal"], root)
        check(code == 1 and B.engine_hash(b"print(1)\n") in read_bytes(root, "tools/board/MANIFEST.txt").decode("utf-8"),
              "seal: en una instancia (sin rutas de la plantilla) no se sella: el cambio local se declara, no se bendice (visto fallar)")
        append(root, "tools/board/MANIFEST.txt", "\n# Solo en la plantilla.\ntemplate capas\n")
        write(root, "tools/board/exceptions.txt", legend(EXCEPTION_KEYS))
        code, said = quietly(B.main_on, ["seal"], root)
        check(code == 0 and "x.py" in said and findings_of(root) == [],
              "seal: en la plantilla (su MANIFEST.txt declara filas 'template', exista o no su carpeta) sella el motor tal como esta (visto fallar)")
        write(root, "capas/python/notas.md", "sin titulo\n")
        check(findings_of(root) == [], "plantilla: el markdown de una ruta solo de la plantilla no pide casa")
        write(root, "capas/python/notas.md", "sin titulo, y cita `tools/no-existe.py` y `#nadie`\n")
        found = sorted((f["kind"], f["key"]) for f in findings_of(root))
        check(found == [(B.KIND_CITE, "tools/no-existe.py"), (B.KIND_SLUG, "#nadie")],
              "plantilla: el markdown de sus rutas propias cita el motor, y sus citas se comprueban aunque no pida casa (visto fallar)")
        write(root, "capas/python/notas.md", "sin titulo\n")
        write(root, "tools/board/MANIFEST.txt", read_bytes(root, "tools/board/MANIFEST.txt").replace(b"version 0.0.1", b"version 1.0"))
        found = findings_of(root)
        check(len(found) == 1 and found[0]["kind"] == B.KIND_DATA and "'1.0'" in found[0]["message"], "motor: una version que no es X.Y.Z es un hallazgo de datos (visto fallar)")
    end()


UPGRADE_FILE = "upgrade.py"


def upgrade_tool():
    """tools/board/upgrade.py, which brings an instance to the template's
    engine, loaded by its path; None in a copy, which does not have it."""
    path = os.path.join(HERE, UPGRADE_FILE)
    if not os.path.isfile(path):
        return None
    spec = importlib.util.spec_from_file_location("upgrade", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_upgrade_plan():
    """What upgrade.py decides before touching anything, with no git: the
    action for each engine file from its three sha256 (the instance's base,
    its disk and the target), the `engine` exceptions left with nothing to
    excuse, what changed outside the engine, and its command line. Only the
    template has the tool."""
    begin("test_upgrade_plan")
    U = upgrade_tool()
    if U is None:
        check(True, "upgrade: solo la plantilla lo tiene")
        end()
        return
    cases = ((("a", "a", "b"), U.TAKE, "la plantilla lo cambio y la instancia no"),
             (("a", "b", "b"), U.CURRENT, "la instancia ya tiene el del destino, cambiara o no la plantilla"),
             (("a", "a", "a"), U.CURRENT, "nadie lo cambio"),
             ((None, None, "b"), U.ADD, "la plantilla lo trae al motor"),
             ((None, "b", "b"), U.CURRENT, "la plantilla lo trae y la instancia ya lo tiene igual"),
             ((None, "c", "b"), U.STOP, "la plantilla lo trae y la instancia tiene otro"),
             (("a", "a", None), U.REMOVE, "la plantilla lo quita y la instancia no lo cambio"),
             (("a", None, None), U.CURRENT, "la plantilla lo quita y la instancia ya no lo tiene"),
             (("a", "c", None), U.STOP, "la plantilla lo quita y la instancia lo cambio"),
             (("a", "c", "a"), U.KEEP, "un parche local que la plantilla no toco"),
             (("a", None, "a"), U.KEEP, "falta en la instancia y la plantilla no lo cambio"),
             (("a", "c", "b"), U.STOP, "un parche local que la plantilla tambien cambio"),
             (("a", None, "b"), U.STOP, "falta en la instancia y la plantilla lo cambio"))
    for (declared, local, shipped), action, case in cases:
        got = U.engine_action(declared, local, shipped)[0]
        check(got == action, "upgrade: %s -> %s (visto fallar) %s" % (case, action, "" if got == action else "salio " + got))
    planned = U.engine_plan({"b.py": "1", "a.py": "1"}, {"a.py": "1", "b.py": "2", "c.py": None}, {"a.py": "2", "c.py": "3"})
    check([(path, action) for path, action, _ in planned] == [("a.py", U.TAKE), ("b.py", U.STOP), ("c.py", U.ADD)],
          "upgrade: el plan del motor recorre los ficheros de la instancia y los del destino, en orden (visto fallar)")
    check(U.orphan_exceptions(["x.py", "y.py", "z.py"], {"x.py": "n", "y.py": "p"}, {"x.py": "n", "y.py": "s"}) == ["x.py", "z.py"],
          "upgrade: una excepcion 'engine' queda huerfana si el fichero ya es el del destino o ya no es del motor, y no si sigue parcheado (visto fallar)")
    changes = U.data_changes({"a": "1", "b": "2", "c": "3", "capas/l.txt": "4"}, {"a": "1", "b": "9", "d": "5", "capas/l.txt": "8"}, ["capas"])
    check(changes == [("b", "cambiado"), ("c", "quitado"), ("d", "nuevo")],
          "upgrade: fuera del motor, lo cambiado, lo quitado y lo nuevo de la base al destino, sin lo que se salta (visto fallar)")
    for words in (["-h"], ["--help"], ["instancia", "--apply", "abc", "-h"]):
        request = U.parse_args(words)
        check(request.get("help") is True and not request["error"], "upgrade: %s pide la ayuda y no es una instancia (visto fallar)" % " ".join(words))
    check(U.parse_args(["instancia"])["to"] == "HEAD" and U.parse_args(["instancia", "--to", "v1", "--apply", "0123456789ab"]) == {
        "target": "instancia", "to": "v1", "apply": "0123456789ab", "adopt": "", "params": {}, "done": "", "keep": "", "help": False, "error": ""},
          "upgrade: el destino es HEAD de la plantilla salvo que --to diga otra revision, y --apply lleva el id del plan (visto fallar)")
    adopted = U.parse_args(["instancia", "--adopt", "stack:app", "--param", "name=Uno", "--param", "package=com.uno"])
    check(adopted["adopt"] == "stack:app" and adopted["params"] == {"name": "Uno", "package": "com.uno"} and not adopted["error"],
          "upgrade: --adopt lleva el componente y --param, una vez por nombre, sus parametros (visto fallar)")
    check(U.parse_args(["instancia", "--done", "gates.txt"])["done"] == "gates.txt" and U.parse_args(["instancia", "--keep", "a.py"])["keep"] == "a.py",
          "upgrade: --done y --keep llevan una ruta (visto fallar)")
    wrong = ((["-x", "instancia"], "opcion desconocida: -x"), (["instancia", "--to"], "--to necesita"), (["instancia", "--to", "--apply"], "--to necesita"),
             (["instancia", "--to", ""], "--to necesita"), (["uno", "otro"], "sobra 'otro'"), (["instancia", "--apply"], "--apply necesita el id del plan"),
             (["instancia", "--apply", "a", "--apply", "b"], "--apply va una sola vez"), ([], "falta la instancia"),
             (["instancia", "--param", "a=b"], "--param va con --adopt"), (["instancia", "--adopt", "stack:app", "--param", "suelto"], "--param necesita"),
             (["instancia", "--adopt", "stack:app", "--param", "a=1", "--param", "a=2"], "el parametro a va una sola vez"),
             (["instancia", "--done", "x", "--apply", "y"], "--done y --keep van solos"), (["instancia", "--done", "x", "--keep", "y"], "--done y --keep van solos"),
             (["instancia", "--keep", "x", "--to", "v1"], "--keep no lee ninguna revision"))
    for words, says in wrong:
        error = U.parse_args(words)["error"]
        check(says in error, "upgrade: '%s' se rechaza diciendo '%s', sin tomar una opcion por instancia (visto fallar)" % (" ".join(words), says))
    code, said = quietly(U.main, ["-h"])
    check(code == 0 and "uso:" in said and "se lee de git, no del disco" in said and "--adopt" in said and "RESULT" not in said,
          "upgrade: -h dice el uso y que hace cada opcion, sin planificar nada (visto fallar)")
    code, said = quietly(U.main, ["--frobnicate", "instancia"])
    check(code == 2 and "--frobnicate" in said and "plantilla:" not in said, "upgrade: una opcion desconocida sale con 2 sin planificar nada (visto fallar)")
    end()


# The engine of the fake template whose instance test_upgrade brings forward.
UPGRADE_ENGINE = ["verify.py", "tools/board/board.py", "tools/board/viejo.py", "tools/board/parche.py", ".githooks/pre-push"]
PATCHED = b"# parcheado aqui\n"
PLAN_ID = re.compile(r"RESULT: plan ([0-9a-f]{12}) sin escribir nada")


def head(root):
    return git_run(root, "rev-parse", "HEAD").stdout.decode().strip()


def commit_template(repo, folder, message):
    """Seals the fake template in `folder` and commits the whole repository: what upgrade.py copies is what git holds."""
    quietly(B.main_on, ["seal"], folder)
    git_run(repo, "add", "-A")
    git_run(repo, "commit", "-q", "--no-verify", "-m", message)
    return head(repo)


def plan_id_of(said):
    """The id of the plan upgrade.py showed, or '' when it showed none."""
    found = PLAN_ID.search(said)
    return found.group(1) if found else ""


def planned_and_applied(U, instance, folder, *extra):
    """A plan and then its apply, as the owner runs them: the code and words of the apply, and the plan's id."""
    code, said = quietly(U.main, [instance] + list(extra), folder)
    plan = plan_id_of(said)
    if code != 0 or not plan:
        return code or 1, said, plan
    code, said = quietly(U.main, [instance] + list(extra) + ["--apply", plan], folder)
    return code, said, plan


def test_upgrade():
    """upgrade.py on a fake template whose instance was made with
    instantiate.py and patched, and which then moved to another folder of its
    repository: the plan says what it would do, with its id, and writes
    nothing; --apply with that id takes, adds and removes the engine files the
    plan says, keeps the local patch, rewrites the manifest and keeps what is
    left by hand in components.txt, in every plan until --done; a second run
    has nothing to write; a stale id, a patch the template also changes, an
    older target, a dirty tree, a revision that is not a commit, an unsealed
    template or two templates in one tree stop it before it writes anything;
    and what the template has not committed never travels. Only the template
    has the tool."""
    begin("test_upgrade")
    U = upgrade_tool()
    if U is None or shutil.which("git") is None:
        check(U is None or shutil.which("git") is None, "upgrade: solo la plantilla lo tiene, y sin git no se actualiza nada")
        end()
        return
    import instantiate as I
    with scratch_tree() as repo, scratch_tree() as scratch:
        fake_template(repo)
        write(repo, "tools/board/viejo.py", "# se ira\n")
        write(repo, "tools/board/parche.py", "# como vino\n")
        append(repo, "tools/board/MANIFEST.txt", "\n# El motor.\n" + "".join("engine %s -\n" % rel for rel in UPGRADE_ENGINE))
        first = commit_template(repo, repo, "chore: engine")
        instance = os.path.join(scratch, "instancia")
        # With the layer that brings the skill the fake template's contract indexes, as test_instantiate's instance.
        quietly(I.main, [instance, "--layer", "demo", "--apply"], repo, "2026-02-03")
        write(instance, "tools/board/parche.py", PATCHED)
        append(instance, "tools/board/exceptions.txt", "# Un parche local, a la espera de la version que lo traiga.\n%s tools/board/parche.py\n" % B.KIND_ENGINE)
        quietly(B.build, instance)
        commit_all(instance)
        check(findings_of(instance) == [], "upgrade: la instancia de partida, con su parche declarado, pasa el tablero")
        # The template moves to another folder, and its engine and its data files change.
        folder = os.path.join(repo, "plantilla")
        os.makedirs(folder)
        for name in sorted(os.listdir(repo)):
            if name not in (".git", "plantilla"):
                git_run(repo, "mv", name, "plantilla/" + name)
        write(folder, "verify.py", "# el runner, nuevo\n")
        os.remove(os.path.join(folder, "tools", "board", "viejo.py"))
        write(folder, "tools/board/nuevo.sh", "#!/bin/sh\necho nuevo\n")
        manifest = read_bytes(folder, "tools/board/MANIFEST.txt").decode("utf-8")
        write(folder, "tools/board/MANIFEST.txt", "".join(line for line in manifest.splitlines(True) if "viejo.py" not in line) + "engine tools/board/nuevo.sh -\n")
        append(folder, "gates.txt", "dos | - | {python} -c \"print(2)\"\n")
        write(folder, "docs/nuevo.md", "# Nuevo\n")
        append(folder, "STATUS.txt", "otra linea\n")
        append(folder, "overlays/demo/layer.txt", "# Un comentario mas.\n")
        quietly(B.main_on, ["seal"], folder)
        git_run(repo, "add", "-A")
        git_run(repo, "add", "--chmod=+x", "plantilla/tools/board/nuevo.sh")
        git_run(repo, "commit", "-q", "--no-verify", "-m", "chore: move and change")
        second = head(repo)

        def shipped(commit, rel):
            return git_run(repo, "show", "%s:plantilla/%s" % (commit, rel)).stdout

        untouched = tree_bytes(instance)
        # A file whose times changed and whose content did not: a git status that may write refreshes the index for it.
        later = time.time() + 120
        os.utime(os.path.join(instance, "README.md"), (later, later))
        index = read_bytes(instance, ".git/index")
        code, said = quietly(U.main, [instance], folder)
        plan = plan_id_of(said)
        check(code == 0 and plan and said.strip().splitlines()[-1].startswith("RESULT: plan %s sin escribir" % plan) and "--apply %s" % plan in said
              and tree_bytes(instance) == untouched,
              "upgrade: sin --apply ensena el plan con su id y el comando que lo escribe, y no escribe nada (visto fallar) %s" % ("" if code == 0 else last_words(said)))
        check(read_bytes(instance, ".git/index") == index, "upgrade: el plan tampoco escribe el indice de git de la instancia (visto fallar)")
        check(all(line in said for line in ("se toma verify.py:", "se anade tools/board/nuevo.sh:", "se borra tools/board/viejo.py:", "se deja tools/board/parche.py:",
                                            "al dia: 2 ficheros del motor", "se reescribe tools/board/MANIFEST.txt")),
              "upgrade: el plan toma lo que la plantilla cambio, anade lo que trae, borra lo que quita, deja el parche y reescribe el manifiesto (visto fallar)")
        check("motor del commit %s de la plantilla" % first[:7] in said and "plantilla: plantilla en el commit %s" % second[:7] in said,
              "upgrade: la base es el commit cuyo motor tiene la instancia, aunque la plantilla cambiara despues de carpeta (visto fallar)")
        check("a mano: gates.txt (cambiado" in said and "a mano: docs/nuevo.md (nuevo" in said and "STATUS.txt" not in said and "overlays" not in said
              and "diff %s: %s:plantilla -- docs/nuevo.md gates.txt" % (first[:7], second[:7]) in said,
              "upgrade: lo de fuera del motor que cambio desde la base se dice para fusionarlo a mano, con el diff que lo ensena, sin los derivados ni lo"
              " que solo es de la plantilla (visto fallar)")
        code, said = quietly(U.main, [instance, "--apply", "0123456789ab"], folder)
        check(code == 1 and "el plan de ahora es %s, no 0123456789ab" % plan in said and tree_bytes(instance) == untouched,
              "upgrade: --apply con un id que no es el del plan de ahora no escribe nada (visto fallar)")
        code, said = quietly(U.main, [instance, "--apply", plan], folder)
        check(code == 0 and read_bytes(instance, "verify.py") == shipped(second, "verify.py") and read_bytes(instance, "tools/board/nuevo.sh") == shipped(second, "tools/board/nuevo.sh")
              and not os.path.exists(os.path.join(instance, "tools", "board", "viejo.py")) and read_bytes(instance, "tools/board/parche.py") == PATCHED,
              "upgrade: con --apply y el id toma, anade y borra el motor que dice el plan, y conserva el parche local (visto fallar) %s" % ("" if code == 0 else last_words(said)))
        check(read_bytes(instance, "tools/board/MANIFEST.txt").decode("utf-8") == I.instance_manifest(shipped(second, "tools/board/MANIFEST.txt").decode("utf-8"))
              and read_bytes(instance, "gates.txt") != shipped(second, "gates.txt") and not os.path.exists(os.path.join(instance, "docs", "nuevo.md")),
              "upgrade: el MANIFEST.txt es el del destino sin sus filas 'template', y lo de fuera del motor no se escribe (visto fallar)")
        check("git add --chmod=+x -- tools/board/nuevo.sh" in said and (os.name == "nt" or os.access(os.path.join(instance, "tools", "board", "nuevo.sh"), os.X_OK)),
              "upgrade: lo que el arbol de la plantilla tiene ejecutable llega ejecutable, y el plan dice como dejarlo asi en el indice (visto fallar)")
        record = read_bytes(instance, "tools/board/components.txt").decode("utf-8")
        check("quedan 3 cosas a mano" in said and all("pending engine | %s |" % path in record for path in ("gates.txt", "docs/nuevo.md", "tools/board/nuevo.sh")),
              "upgrade: lo que queda a mano no se dice una vez y se pierde: se guarda en components.txt, y el resultado no lo da por terminado (visto fallar)")
        quietly(B.build, instance)
        check(findings_of(instance) == [], "integracion: la instancia actualizada pasa el tablero, con su parche aun excusado (visto fallar)")
        commit_all(instance)
        settled = tree_bytes(instance)
        code, said = quietly(U.main, [instance], folder)
        check(code == 0 and "no hay nada que escribir" in said and "quedan 3 cosas a mano" in said and "pendiente (engine): gates.txt:" in said
              and tree_bytes(instance) == settled,
              "upgrade: una instancia que ya tiene el motor del destino no se toca, y lo pendiente sigue saliendo en cada plan (visto fallar)")
        for path in ("gates.txt", "docs/nuevo.md", "tools/board/nuevo.sh"):
            code, said = quietly(U.main, [instance, "--done", path], folder)
            check(code == 0 and "hecho lo pendiente de %s" % path in said, "upgrade: --done %s quita lo pendiente de esa ruta del registro (visto fallar) %s"
                  % (path, "" if code == 0 else last_words(said)))
        code, said = quietly(U.main, [instance, "--done", "README.md"], folder)
        check(code == 1 and "no hay nada pendiente ni en conflicto" in said, "upgrade: --done de una ruta sin nada pendiente se rechaza (visto fallar)")
        commit_all(instance)
        code, said = quietly(U.main, [instance], folder)
        check(code == 0 and "no hay nada que escribir" in said and "pendiente" not in said and "a mano" not in said,
              "upgrade: con lo pendiente hecho, nada queda a mano (visto fallar)")
        # The template changes a data file and not its engine: what is done stays done.
        append(folder, "gates.txt", "tres | - | {python} -c \"print(3)\"\n")
        git_run(repo, "commit", "-q", "--no-verify", "-am", "chore: a data file only")
        code, said, plan = planned_and_applied(U, instance, folder)
        quietly(U.main, [instance, "--done", "gates.txt"], folder)
        commit_all(instance)
        code, said = quietly(U.main, [instance], folder)
        check(code == 0 and "no hay nada que escribir" in said and "pendiente" not in said and "a mano" not in said,
              "upgrade: lo que se dio por hecho no vuelve aunque el motor no cambiara: lo pendiente se cuenta desde el ultimo commit aplicado (visto fallar) %s"
              % last_words(said))
        settled = tree_bytes(instance)
        code, said = quietly(U.main, [instance, "--to", first], folder)
        check(code == 1 and "no se baja de version" in said, "upgrade: un destino anterior a la base de la instancia se rechaza (visto fallar)")
        write(instance, "suelto.txt", "x\n")
        code, said = quietly(U.main, [instance], folder)
        check(code == 1 and "no esta limpio" in said and "suelto.txt" in said, "upgrade: una instancia con cambios sin commitear no se toca (visto fallar)")
        os.remove(os.path.join(instance, "suelto.txt"))
        code, said = quietly(U.main, [instance, "--to", "no-existe"], folder)
        check(code == 1 and "'no-existe' no es un commit" in said, "upgrade: una revision que no es un commit de la plantilla se rechaza (visto fallar)")
        for target, says in ((folder, "dentro de la plantilla"), (scratch, "no es una instancia")):
            code, said = quietly(U.main, [target], folder)
            check(code == 1 and says in said, "upgrade: %s no se actualiza: '%s' (visto fallar)" % (os.path.basename(target), says))
        # The template changes the file the instance patched: the plan stops, and nothing else is written either.
        write(folder, "tools/board/parche.py", "# la plantilla lo cambia\n")
        write(folder, "verify.py", "# el runner, otra vez\n")
        commit_template(repo, folder, "chore: patch clash")
        code, said = quietly(U.main, [instance], folder)
        check(code == 1 and "tools/board/parche.py: la instancia lo cambio (un parche local) y la plantilla tambien" in said and not plan_id_of(said)
              and tree_bytes(instance) == settled,
              "upgrade: un parche local que la plantilla tambien cambio para el plan, sin id que aplicar, y no se escribe nada (visto fallar)")
        # The template takes the patch: the instance's exception is left with nothing to excuse.
        write(folder, "tools/board/parche.py", PATCHED)
        fourth = commit_template(repo, folder, "chore: take the patch")
        write(folder, "verify.py", "# sin commitear\n")
        code, said, plan = planned_and_applied(U, instance, folder)
        check(code == 0 and "a mano: la excepcion 'engine tools/board/parche.py'" in said and read_bytes(instance, "verify.py") == shipped(fourth, "verify.py")
              and "pending engine | tools/board/exceptions.txt | quita la excepcion 'engine tools/board/parche.py'" in
              read_bytes(instance, "tools/board/components.txt").decode("utf-8"),
              "upgrade: la excepcion de un parche que la plantilla ya trae queda pendiente de quitar, y lo que no esta commiteado no viaja (visto fallar)")
        git(repo, "checkout", "-q", "--", "plantilla/verify.py")
        commit_all(instance)
        # A plan shown and then made stale: the instance moved on before the apply.
        write(folder, "verify.py", "# el runner, una vez mas\n")
        commit_template(repo, folder, "chore: one more")
        code, said = quietly(U.main, [instance], folder)
        stale = plan_id_of(said)
        write(instance, "README.md", read_bytes(instance, "README.md") + b"\nOtra linea.\n")
        commit_all(instance)
        moved = tree_bytes(instance)
        code, said = quietly(U.main, [instance, "--apply", stale], folder)
        check(stale and code == 1 and "el plan de ahora es" in said and "no %s" % stale in said and tree_bytes(instance) == moved,
              "upgrade: un plan que caduco porque la instancia cambio despues de verlo se rechaza sin escribir nada (visto fallar)")
        # A template changed and not sealed, and a tree with two templates, are no target.
        write(folder, "verify.py", "# sin sellar\n")
        git_run(repo, "commit", "-q", "--no-verify", "-am", "chore: unsealed")
        code, said = quietly(U.main, [instance], folder)
        check(code == 1 and "no esta sellada" in said, "upgrade: una revision de la plantilla sin sellar no es un destino (visto fallar)")
        write(repo, "otra/tools/board/MANIFEST.txt", read_bytes(folder, "tools/board/MANIFEST.txt"))
        git_run(repo, "add", "-A")
        git_run(repo, "commit", "-q", "--no-verify", "-m", "chore: two templates")
        code, said = quietly(U.main, [instance], folder)
        check(code == 1 and "con filas 'template', y la plantilla es uno" in said, "upgrade: un arbol con dos plantillas no es un destino (visto fallar)")
    end()


def test_components_model():
    """What components.py decides without git: the record it reads and writes
    back, a piece with two owners refused, a stack template's parameters and
    pieces, a gate compared without its seconds, and the three-way decision
    of a piece kept without a base and of a line found by its text."""
    begin("test_components_model")
    import components as C
    sha = "a" * 64
    text = C.render_record({"components": {"stack:app": {"commit": "abc1234", "params": {"name": "Uno"}}, "layer:demo": {"commit": "abc1234", "params": {}}},
                            "files": {"stack:app": {"tools/x.py": sha, "tools/y.py": C.NO_BASE}, "layer:demo": {}},
                            "items": {"stack:app": {}, "layer:demo": {(C.GATE, "demo"): sha, (C.DOCUMENT, "b" * 64): "b" * 64}},
                            "pending": [{"component": "engine", "path": "gates.txt", "what": "cambiado: fusionalo a mano"}]})
    problems = []
    record = C.read_record(text, problems)
    check(not problems and record["components"]["stack:app"]["params"] == {"name": "Uno"} and record["files"]["stack:app"]["tools/y.py"] == C.NO_BASE
          and record["items"]["layer:demo"][(C.GATE, "demo")] == sha and record["pending"][0]["path"] == "gates.txt" and C.render_record(record) == text,
          "componentes: el registro se lee y se vuelve a escribir igual, con sus parametros, su pieza sin base y lo pendiente (visto fallar) %s" % problems)
    problems = []
    C.read_record(text + "\ncomponent layer:otra | abc1234 | -\nfile layer:otra | tools/x.py | %s\n" % sha, problems)
    check(any("un solo dueno" in problem for problem in problems), "componentes: una pieza de dos componentes se rechaza (visto fallar)")
    problems = []
    C.read_record(text + "\nfile layer:nadie | tools/z.py | %s\npending layer:nadie | a.py | x\n" % sha, problems)
    check(len(problems) == 2, "componentes: un fichero o un pendiente de un componente que no se declaro se rechazan (visto fallar)")
    stack_text = ("# Una plantilla de stack.\n#\n# --- KEYS ---\n# stack : s\n# param : p\n# piece : x\n# rendered : r\n#\nstack app\n"
                  "param name | Demo | el nombre\nparam package | com.demo.app | el paquete\npiece tools/*.py | el ejecutor\n"
                  "rendered src/com/demo/app/Demo*.java | las reglas\n")
    problems = []
    stack = C.read_stack(stack_text, "template.txt", problems)
    params, wrong = C.creation_params(stack, {"name": "Uno"})
    check(not problems and not wrong and params == {"name": "Uno", "package": "com.demo.app"}
          and C.creation_params(stack, {"otro": "x"})[1] and C.creation_params(stack, {"name": "con blanco"})[1],
          "componentes: los parametros toman el valor dado o su defecto, y uno que no se declara o que no es un nombre se rechaza (visto fallar)")
    pieces = C.stack_pieces(stack, ["tools/a.py", "README.md", "src/com/demo/app/DemoRules.java"], problems)
    rendered = C.rendered_pieces(stack, pieces, {"name": "Uno", "package": "org.Demo.uno"},
                                 {"tools/a.py": b"Demo\n", "src/com/demo/app/DemoRules.java": b"package com.demo.app; class DemoRules {}\n"}.get)
    check(rendered == {"tools/a.py": b"Demo\n", "src/org/Demo/uno/UnoRules.java": b"package org.Demo.uno; class UnoRules {}\n"},
          "componentes: una pieza 'piece' se copia tal cual con su ruta con parametros, y una 'rendered' lleva los parametros dentro en una pasada simultanea,"
          " sin que el defecto de otro parametro reescriba un valor ya sustituido (visto fallar) %s" % rendered)
    seed = read_bytes(V.ROOT, C.RECORD_FILE).decode("utf-8")
    is_template = B.is_template(B.read_manifest(B.parse_data(read_bytes(V.ROOT, "tools/board/MANIFEST.txt").decode("utf-8"), "tools/board/MANIFEST.txt", []), []))
    check(seed == C.RECORD_HEADER if is_template else seed.startswith(C.RECORD_HEADER),
          "componentes: tools/board/components.txt lleva exactamente la cabecera RECORD_HEADER, sin filas en la semilla de la plantilla (visto fallar)")
    problems = []
    C.stack_pieces(stack, ["README.md"], problems)
    check(len(problems) == 2, "componentes: un patron de pieza que no casa con nada se rechaza (visto fallar)")
    label, managed, reference = C.gate_parts("build [harness] | 7.0 | {python} tools/run.py build")
    local = C.local_lines({C.GATES_FILE: "# x\nbuild [harness] | 3.1 | {python} tools/run.py build\n", C.DOCUMENTS_FILE: "extension .cs\n"})
    check(label == "build" and reference == "7.0" and C.local_item_sha(local, C.GATE, "build") == C.line_hash(managed)
          and C.local_item_sha(local, C.DOCUMENT, C.line_hash("extension .cs")) is not None,
          "componentes: una puerta se compara sin sus segundos de referencia, que son de la instancia (visto fallar)")
    cases = (((C.NO_BASE, "c", "b"), C.STOP, "una pieza sin base y distinta del destino"), ((C.NO_BASE, "b", "b"), C.CURRENT, "una pieza sin base que ya es el destino"),
             ((C.NO_BASE, None, None), C.CURRENT, "una pieza sin base que ya no esta en ningun lado"), ((C.NO_BASE, None, "b"), C.STOP, "una pieza sin base que falta"))
    for (declared, mine, shipped), action, case in cases:
        got = C.three_way(declared, mine, shipped, "a la capa x")[0]
        check(got == action, "componentes: %s -> %s (visto fallar) %s" % (case, action, "" if got == action else "salio " + got))
    lines = ((("s", "s", "s"), C.CURRENT), (("s", None, "s"), C.KEEP), ((None, None, "s"), C.ADD), (("s", "s", None), C.REMOVE), (("s", None, None), C.CURRENT))
    for (declared, mine, shipped), action in lines:
        got = C.set_item_action(declared, mine, shipped, "a la capa x")[0]
        check(got == action, "componentes: una linea por su texto %s -> %s (visto fallar) %s" % ((declared, mine, shipped), action, "" if got == action else got))
    planned = C.plan_files({"a": "1", "b": "1"}, {"a": "1", "b": "1"}, {"a": "2"}, "x", released={"b"})
    check([(path, action) for path, action, _ in planned] == [("a", C.TAKE), ("b", C.RELEASE)],
          "componentes: una pieza que la plantilla ya no declara pero sigue teniendo se suelta, sin tocarla (visto fallar)")
    conflicts = C.owner_conflicts({"verify.py"}, {"layer:demo": ["tools/x.py", "verify.py"],
                                                  "stack:app": ["tools/x.py", C.IGNORE_FILE, C.RECORD_FILE, "tools/y.py"]})
    said = " | ".join(conflicts)
    check(len(conflicts) == 4 and "verify.py: lo trae layer:demo y es del motor" in said and "%s: lo trae stack:app y es del motor" % C.RECORD_FILE in said
          and "%s: lo trae stack:app entero" % C.IGNORE_FILE in said and "tools/x.py: lo traen layer:demo y stack:app" in said and "tools/y.py" not in said,
          "componentes: una ruta que traen dos componentes, una del motor o de un registro de las herramientas y un fichero con lineas de otros duenos"
          " tienen dos duenos (visto fallar) %s" % said)
    check(C.owner_conflicts({"verify.py"}, {"layer:demo": ["tools/x.py"], "stack:app": ["tools/y.py"]}) == [],
          "componentes: rutas distintas de componentes distintos, fuera del motor, tienen un dueno cada una")
    end()


# A stack template for the suite, in a folder beside the template, and the
# layer whose 'external' row names it.
APP_STACK = ("# Una plantilla de stack de prueba.\n#\n# --- KEYS ---\n# stack : s\n# param : p\n# piece : x\n# rendered : r\n#\nstack demo-app\n"
             "param name | Demo | el nombre del producto\npiece tools/runner.py | el ejecutor\npiece tools/viejo.py | una pieza que se ira\n"
             "piece tools/quitado.py | una pieza que se ira con un cambio local\nrendered src/Demo/Rules.txt | las reglas con el nombre\n")
APP_LAYER = ("# La capa de la plantilla de stack de prueba.\n" + LAYER_LEGEND + "requires 0.0.1\nexternal stack/app | la prueba de los componentes\n"
             "needs tools/runner.py | el ejecutor del producto\ngate app | - | {python} tools/runner.py\ndocument extension .toml\nignore build/\n"
             "standard app | **El ejecutor corre.** Se comprueba.\n")
APP_SKILL = "---\nname: app-skill\ndescription: Cuando haga falta el producto.\n---\n# Producto\n"


def component_template(repo):
    """A fake template in `repo`/plantilla, sealed and committed with a stack
    template beside it, in stack/app, and its layer; the template's folder."""
    fake_template(repo)
    folder = os.path.join(repo, "plantilla")
    os.makedirs(folder)
    for name in sorted(os.listdir(repo)):
        if name not in (".git", "plantilla"):
            git_run(repo, "mv", name, "plantilla/" + name)
    write(folder, "overlays/app/layer.txt", APP_LAYER)
    write(folder, "overlays/app/files/.agents/skills/app-skill/SKILL.md", APP_SKILL)
    write(repo, "stack/app/template.txt", APP_STACK)
    write(repo, "stack/app/README.md", "# Demo\n\nEl producto Demo.\n")
    write(repo, "stack/app/tools/runner.py", "print('corre')\n")
    write(repo, "stack/app/tools/viejo.py", "# se ira\n")
    write(repo, "stack/app/tools/quitado.py", "# se ira, con un cambio local\n")
    write(repo, "stack/app/src/Demo/Rules.txt", "las reglas de Demo\n")
    write(repo, "stack/app/src/Demo/App.txt", "app Demo\n")
    commit_template(repo, folder, "chore: components")
    return folder


def created_product(I, folder, scratch, name="producto"):
    """A product created from the suite's stack template with name=Billing,
    its derivatives built as its first run of verify.py writes them, and
    committed."""
    product = os.path.join(scratch, name)
    code, said = quietly(I.main, [product, "--stack", "demo-app", "--param", "name=Billing", "--apply"], folder, "2026-02-03")
    if code == 0:
        quietly(B.build, product)
        commit_all(product)
    return product, code, said


def test_component_creation_and_update():
    """A product created from a stack template with instantiate.py --stack has
    its starter with the parameters, the scaffold, the stack's layer, and a
    record of both; upgrade.py then brings each piece to the template: it
    takes what the template changed and the product did not, with the
    parameters, adds and removes pieces, takes a gate keeping its seconds and
    adds a row, stops on a conflict without writing anything until the owner
    reconciles it (--done) or keeps the piece (--keep), and a second run has
    nothing to write."""
    begin("test_component_creation_and_update")
    U = upgrade_tool()
    if U is None or shutil.which("git") is None:
        check(U is None or shutil.which("git") is None, "componentes: solo la plantilla tiene upgrade.py, y sin git no se crea nada")
        end()
        return
    import components as C
    import instantiate as I
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        record = read_bytes(product, C.RECORD_FILE).decode("utf-8") if code == 0 else ""
        check(code == 0 and read_bytes(product, "src/Billing/App.txt") == b"app Billing\n" and read_bytes(product, "src/Billing/Rules.txt") == b"las reglas de Billing\n"
              and not os.path.exists(os.path.join(product, "template.txt")) and "{python} tools/runner.py" in read_bytes(product, "gates.txt").decode("utf-8"),
              "componentes: --stack escribe el producto con sus parametros en rutas y textos, sin template.txt, y le aplica su capa (visto fallar) %s"
              % ("" if code == 0 else last_words(said)))
        check("component stack:demo-app | " in record and "| name=Billing" in record and "file stack:demo-app | src/Billing/Rules.txt |" in record
              and "component layer:app | " in record and "item layer:app | gates.txt | gate | app |" in record
              and "file layer:app | .agents/skills/app-skill/SKILL.md |" in record and "item layer:app | .gitignore | ignore" in record,
              "componentes: el registro guarda la capa, con su fichero y sus lineas, y la plantilla de stack, con sus parametros y sus piezas (visto fallar)")
        check(findings_of(product) == [], "integracion: el producto creado pasa el tablero")
        settled = tree_bytes(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 0 and "no hay nada que escribir" in said and tree_bytes(product) == settled,
              "componentes: un producto recien creado no tiene nada que actualizar (visto fallar) %s" % last_words(said))
        # The product changes two pieces; the template changes what it ships.
        write(product, "tools/runner.py", "print('corre')\n# un parche del producto\n")
        write(product, "tools/quitado.py", "# se ira, con un cambio local\n# del producto\n")
        commit_all(product)
        stack = os.path.join(repo, "stack", "app")
        write(stack, "tools/runner.py", "print('corre mejor')\n")
        write(stack, "src/Demo/Rules.txt", "las reglas de Demo, mejores\n")
        write(stack, "tools/nuevo.py", "# llega\n")
        os.remove(os.path.join(stack, "tools", "viejo.py"))
        os.remove(os.path.join(stack, "tools", "quitado.py"))
        write(stack, "template.txt", APP_STACK.replace("piece tools/viejo.py | una pieza que se ira\n", "piece tools/nuevo.py | una pieza nueva\n")
              .replace("piece tools/quitado.py | una pieza que se ira con un cambio local\n", ""))
        write(folder, "overlays/app/layer.txt", APP_LAYER.replace("gate app | - | {python} tools/runner.py", "gate app | - | {python} tools/runner.py --estricto")
              .replace("ignore build/\n", "ignore build/\ndocument extension .lock\n"))
        write(folder, "overlays/app/files/.agents/skills/app-skill/SKILL.md", APP_SKILL + "\nMejor.\n")
        write(product, "gates.txt", read_bytes(product, "gates.txt").decode("utf-8").replace("app | - | {python} tools/runner.py", "app | 2.5 | {python} tools/runner.py"))
        commit_all(product)
        commit_template(repo, folder, "chore: the template moves")
        before = tree_bytes(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 1 and "tools/runner.py: la instancia lo cambio (un parche local) y la plantilla tambien" in said
              and "tools/quitado.py: la plantilla lo quita a las piezas de demo-app y la instancia lo cambio" in said and not plan_id_of(said)
              and tree_bytes(product) == before,
              "componentes: una pieza que cambiaron los dos y otra que la plantilla quita con un cambio local paran el plan, y no se escribe nada (visto fallar)"
              " %s" % last_words(said))
        write(product, "tools/runner.py", "print('corre mejor')\n# un parche del producto\n")
        code, said = quietly(U.main, [product, "--done", "tools/runner.py"], folder)
        check(code == 0 and "tools/runner.py conciliado a mano" in said, "componentes: --done de una pieza en conflicto toma el destino como su base (visto fallar) %s"
              % last_words(said))
        code, said = quietly(U.main, [product, "--keep", "tools/quitado.py"], folder)
        check(code == 0 and "tools/quitado.py deja de ser de stack:demo-app" in said, "componentes: --keep saca una pieza de su componente (visto fallar) %s"
              % last_words(said))
        commit_all(product)
        code, said, plan = planned_and_applied(U, product, folder)
        gates = read_bytes(product, "gates.txt").decode("utf-8")
        check(code == 0 and read_bytes(product, "src/Billing/Rules.txt") == b"las reglas de Billing, mejores\n" and read_bytes(product, "tools/nuevo.py") == b"# llega\n"
              and not os.path.exists(os.path.join(product, "tools", "viejo.py")) and read_bytes(product, "tools/quitado.py").endswith(b"# del producto\n")
              and read_bytes(product, "tools/runner.py") == b"print('corre mejor')\n# un parche del producto\n",
              "componentes: se toma la pieza con parametros, se anade la nueva, se borra la que la plantilla quita, y quedan la soltada y la conciliada"
              " (visto fallar) %s" % last_words(said))
        check(code == 0 and "app | 2.5 | {python} tools/runner.py --estricto" in gates and "extension .lock" in read_bytes(product, "tools/board/documents.txt").decode("utf-8")
              and read_bytes(product, ".agents/skills/app-skill/SKILL.md").endswith(b"Mejor.\n"),
              "componentes: de la capa se toma la puerta con los segundos de la instancia, se anade su fila y se toma su skill (visto fallar)")
        record = read_bytes(product, C.RECORD_FILE).decode("utf-8")
        check("file stack:demo-app | tools/quitado.py | kept" in record and "tools/viejo.py" not in record and "file stack:demo-app | tools/nuevo.py |" in record,
              "componentes: el registro deja lo borrado, conserva la decision --keep y gana lo anadido (visto fallar)")
        quietly(B.build, product)
        check(findings_of(product) == [], "integracion: el producto actualizado pasa el tablero")
        commit_all(product)
        settled = tree_bytes(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 0 and "no hay nada que escribir" in said and tree_bytes(product) == settled,
              "componentes: la segunda corrida no tiene nada que escribir (visto fallar) %s" % last_words(said))
        write(stack, ".gitignore", "build/\n")
        write(stack, "template.txt", read_bytes(stack, "template.txt").decode("utf-8") + "piece .gitignore | lo ignorado\n")
        commit_template(repo, folder, "chore: the stack claims a shared file")
        other = os.path.join(scratch, "otro")
        code, said = quietly(I.main, [other, "--stack", "demo-app", "--param", "name=Otro", "--apply"], folder, "2026-02-03")
        check(code != 0 and "%s: lo trae stack:demo-app entero" % C.IGNORE_FILE in said and not os.path.exists(other),
              "componentes: crear desde una plantilla de stack cuya pieza es un fichero con lineas de otros duenos se rechaza sin escribir nada (visto fallar) %s"
              % last_words(said))
    end()


def test_component_safety():
    """What keeps an apply from leaving a product half written or a decision
    lost: a write that fails puts every file back as it was, a plan that went
    stale is refused, and what a layer changed in the contract, which is the
    product's prose, stays pending in every plan until --done."""
    begin("test_component_safety")
    U = upgrade_tool()
    if U is None or shutil.which("git") is None:
        check(U is None or shutil.which("git") is None, "componentes: solo la plantilla tiene upgrade.py, y sin git no se crea nada")
        end()
        return
    import components as C
    import instantiate as I
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        stack = os.path.join(repo, "stack", "app")
        write(stack, "tools/runner.py", "print('otra vez')\n")
        write(stack, "src/Demo/Rules.txt", "otras reglas de Demo\n")
        write(folder, "overlays/app/layer.txt", APP_LAYER.replace("**El ejecutor corre.**", "**El ejecutor corre, y termina.**"))
        commit_template(repo, folder, "chore: more")
        before = tree_bytes(product)
        code, said = quietly(U.main, [product], folder)
        plan = plan_id_of(said)
        calls = []

        def failing(path, text):
            calls.append(path)
            if len(calls) == 2:
                raise OSError("disco lleno")
            B.write_atomically(path, text)
        with patched(U, write_file=failing):
            code, said = quietly(U.main, [product, "--apply", plan], folder)
        check(plan and code == 1 and "devolvio todo lo escrito como estaba" in said and tree_bytes(product) == before and len(calls) == 2,
              "componentes: si una escritura falla, lo ya escrito vuelve a como estaba y la instancia queda como antes (visto fallar) %s" % last_words(said))
        code, said = quietly(U.main, [product], folder)
        plan = plan_id_of(said)
        calls = []

        def edited_then_failing(path, text):
            calls.append(path)
            if len(calls) == 2:
                with open(calls[0], "w", encoding="utf-8", newline="") as stream:
                    stream.write("de otra sesion\n")
                raise OSError("disco lleno")
            B.write_atomically(path, text)
        with patched(U, write_file=edited_then_failing):
            code, said = quietly(U.main, [product, "--apply", plan], folder)
        edited = os.path.relpath(calls[0], product).replace(os.sep, "/") if calls else "-"
        kept = os.path.isfile(os.path.join(product, *edited.split("/"))) and read_bytes(product, edited) == b"de otra sesion\n"
        check(plan and code == 1 and kept and "no pudo devolver todo como estaba" in said and edited in said and "devolvio todo" not in said,
              "componentes: si otra sesion cambia lo ya escrito antes de que falle una escritura, deshacer no lo pisa y no dice que todo volvio (visto fallar) %s"
              % last_words(said))
        if git(product, "ls-files", "--error-unmatch", "--", edited):
            git(product, "checkout", "-q", "--", edited)
        elif os.path.isfile(os.path.join(product, *edited.split("/"))):
            os.remove(os.path.join(product, *edited.split("/")))
        check(tree_bytes(product) == before, "componentes: con lo de la otra sesion apartado, la instancia es la de antes")
        code, said, plan = planned_and_applied(U, product, folder)
        record = read_bytes(product, C.RECORD_FILE).decode("utf-8")
        check(code == 0 and "pending layer:app | AGENTS.md | la capa trae ahora esta linea del contrato" in record and "quedan 2 cosas a mano" in said,
              "componentes: lo que la capa cambio en el contrato no se escribe: queda pendiente en el registro (visto fallar) %s" % last_words(said))
        commit_all(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 0 and "pendiente (layer:app): AGENTS.md: la capa trae ahora" in said and "pendiente (layer:app): AGENTS.md: la capa ya no trae" in said,
              "componentes: lo pendiente sale en cada plan, tambien sin nada que escribir (visto fallar) %s" % last_words(said))
        code, said = quietly(U.main, [product, "--done", "AGENTS.md"], folder)
        commit_all(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 0 and "pendiente" not in said and "no hay nada que escribir" in said,
              "componentes: --done deja el registro sin lo pendiente de esa ruta (visto fallar) %s" % last_words(said))
        write(stack, "tools/runner.py", "print('y otra')\n")
        commit_template(repo, folder, "chore: and more")
        code, said = quietly(U.main, [product], folder)
        stale = plan_id_of(said)
        write(stack, "tools/runner.py", "print('y otra mas')\n")
        commit_template(repo, folder, "chore: the template moves again")
        before = tree_bytes(product)
        code, said = quietly(U.main, [product, "--apply", stale], folder)
        check(stale and code == 1 and "el plan de ahora es" in said and tree_bytes(product) == before,
              "componentes: un plan que caduco porque la plantilla cambio despues de verlo se rechaza sin escribir nada (visto fallar)")
        write(folder, "overlays/app/files/tools/runner.py", "print('de la capa')\n")
        commit_template(repo, folder, "chore: layer claims stack file")
        before = tree_bytes(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 1 and "tools/runner.py: lo traen layer:app y stack:demo-app, y una pieza tiene un solo dueno" in said and not plan_id_of(said)
              and tree_bytes(product) == before,
              "componentes: si una capa y una plantilla de stack traen la misma ruta con bytes distintos, el plan se rechaza sin escribir nada (visto fallar) %s"
              % last_words(said))
        write(folder, "overlays/app/files/tools/runner.py", read_bytes(stack, "tools/runner.py").decode("utf-8"))
        commit_template(repo, folder, "chore: layer brings the stack file byte for byte")
        code, said = quietly(U.main, [product], folder)
        check(code == 1 and "tools/runner.py: lo traen layer:app y stack:demo-app" in said and tree_bytes(product) == before,
              "componentes: dos componentes tampoco traen la misma ruta con los mismos bytes (visto fallar) %s" % last_words(said))
        os.remove(os.path.join(folder, "overlays", "app", "files", "tools", "runner.py"))
        write(stack, ".gitignore", "build/\n")
        write(stack, "tools/board/board.py", "# no es del producto\n")
        write(stack, "template.txt", APP_STACK + "piece .gitignore | lo ignorado\npiece tools/board/board.py | lo del motor\n")
        append(folder, "tools/board/MANIFEST.txt", "engine tools/board/board.py %s\n" % ("0" * 64))
        commit_template(repo, folder, "chore: the stack claims the engine and a shared file")
        code, said = quietly(U.main, [product], folder)
        check(code == 1 and "%s: lo trae stack:demo-app entero" % C.IGNORE_FILE in said and "tools/board/board.py: lo trae stack:demo-app y es del motor" in said
              and tree_bytes(product) == before,
              "componentes: una pieza de stack no es un fichero del motor ni uno cuyas lineas tienen otros duenos (visto fallar) %s" % last_words(said))
    with scratch_tree() as root:
        for name in ("intacto.txt", "tocado.txt", "quitado.txt"):
            write(root, name, "como estaba\n")
        journal = U.Journal(root)
        for name in ("intacto.txt", "tocado.txt", "nueva/nuevo.txt"):
            journal.write(name, "del apply\n")
        journal.remove("quitado.txt")
        for name in ("tocado.txt", "nueva/nuevo.txt", "quitado.txt"):
            write(root, name, "de otra sesion\n")
        failed = journal.undo()
        said = " | ".join(failed)
        others = all(read_bytes(root, name) == b"de otra sesion\n" and (name + " (alguien lo cambio") in said
                     for name in ("tocado.txt", "nueva/nuevo.txt", "quitado.txt"))
        check(read_bytes(root, "intacto.txt") == b"como estaba\n" and others and "intacto.txt" not in said and len(failed) == 3,
              "componentes: deshacer devuelve lo que nadie mas toco y deja como lo dejo otra sesion lo cambiado despues, tambien lo recien creado y lo"
              " quitado, y lo dice (visto fallar) %s" % said)
    end()


def test_component_review_safety():
    """Missing history, a kept piece and an edited row never become a
    silently completed upgrade. The same public commands replan after the
    missing history or the owner's explicit reconciliation is available."""
    begin("test_component_review_safety")
    U = upgrade_tool()
    if U is None or shutil.which("git") is None:
        check(U is None or shutil.which("git") is None, "revision: solo la plantilla actualiza componentes, y necesita git")
        end()
        return
    import components as C
    import instantiate as I
    from pathlib import Path

    def recorded(product):
        problems = []
        result = C.read_record(read_bytes(product, C.RECORD_FILE).decode("utf-8"), problems)
        if problems:
            raise AssertionError(problems)
        return result

    def bring_forward(product, folder):
        code, said = quietly(U.main, [product], folder)
        plan = plan_id_of(said)
        return quietly(U.main, [product, "--apply", plan], folder) if code == 0 and plan else (code, said)

    with scratch_tree() as repo, scratch_tree() as scratch, scratch_tree() as clones:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        old = recorded(product)["components"]["layer:app"]["commit"]
        write(folder, "overlays/app/layer.txt", APP_LAYER.replace("**El ejecutor corre.**", "**El ejecutor valida sus permisos.**"))
        write(folder, "overlays/app/files/.agents/skills/app-skill/SKILL.md", APP_SKILL + "\nActualizada.\n")
        commit_template(repo, folder, "chore: contract and skill")
        clone = os.path.join(clones, "shallow")
        cloned = git_run(clones, "clone", "--depth=1", Path(repo).as_uri(), clone)
        shallow = os.path.join(clone, "plantilla")
        before = tree_bytes(product)
        missing = git_run(clone, "cat-file", "-e", old + "^{commit}").returncode != 0
        code, said = quietly(U.main, [product], shallow)
        check(cloned.returncode == 0 and missing and code == 1 and old[:7] in said and "contrato" in said
              and not plan_id_of(said) and tree_bytes(product) == before,
              "revision: sin el commit base de la capa, el plan se para antes de tomar su skill o perder la revision del contrato (visto fallar) %s"
              % last_words(said))
        fetched = git_run(clone, "fetch", "--unshallow")
        code, said, plan = planned_and_applied(U, product, shallow)
        check(fetched.returncode == 0 and code == 0 and "pending layer:app | AGENTS.md |" in read_bytes(product, C.RECORD_FILE).decode("utf-8")
              and "**El ejecutor corre.**" in read_bytes(product, "AGENTS.md").decode("utf-8"),
              "revision: recuperada la historia, el mismo producto actualiza la skill y conserva pendiente la revision contractual (visto fallar) %s"
              % last_words(said))
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        original = read_bytes(product, "tools/quitado.py")
        code, said = quietly(U.main, [product, "--keep", "tools/quitado.py"], folder)
        commit_all(product)
        write(repo, "stack/app/template.txt", APP_STACK.replace("piece tools/quitado.py | una pieza que se ira con un cambio local\n", ""))
        commit_template(repo, folder, "chore: release a kept piece")
        code, said = bring_forward(product, folder)
        check(code == 0 and recorded(product)["files"]["stack:demo-app"].get("tools/quitado.py") == C.KEPT,
              "revision: retirar una pieza no borra la decision --keep del producto (visto fallar) %s" % last_words(said))
        commit_all(product)
        write(repo, "stack/app/template.txt", APP_STACK)
        commit_template(repo, folder, "chore: reintroduce the same bytes")
        code, said = bring_forward(product, folder)
        check(code == 0 and recorded(product)["files"]["stack:demo-app"].get("tools/quitado.py") == C.KEPT,
              "revision: reintroducir los mismos bytes no recupera la propiedad de una pieza --keep (visto fallar) %s" % last_words(said))
        commit_all(product)
        write(repo, "stack/app/tools/quitado.py", "# cambio posterior de la plantilla\n")
        commit_template(repo, folder, "chore: change the kept piece")
        code, said = quietly(U.main, [product], folder)
        check(code == 0 and "es del producto (--keep)" in said and "no hay nada que escribir" in said
              and read_bytes(product, "tools/quitado.py") == original,
              "revision: una version posterior nunca pisa la pieza retirada y reintroducida que el producto conservo (visto fallar) %s"
              % last_words(said))
        code, said = quietly(U.main, [product, "--done", "tools/quitado.py"], folder)
        check(code == 0 and recorded(product)["files"]["stack:demo-app"].get("tools/quitado.py") != C.KEPT
              and read_bytes(product, "tools/quitado.py") == original,
              "revision: solo --done explicito devuelve la pieza al componente y tampoco cambia sus bytes (visto fallar) %s" % last_words(said))
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        path = C.DOCUMENTS_FILE
        write(product, path, read_bytes(product, path).decode("utf-8").replace("extension .toml", "extension .local"))
        commit_all(product)
        write(folder, "overlays/app/layer.txt", APP_LAYER.replace("document extension .toml", "document extension .cfg"))
        commit_template(repo, folder, "chore: change a row edited by the product")
        before = tree_bytes(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 1 and "--done" in said and path in said and not plan_id_of(said) and tree_bytes(product) == before,
              "revision: una fila registrada ausente que la capa cambia requiere conciliacion, no agrega otra junto a la editada (visto fallar) %s"
              % last_words(said))
        code, said = quietly(U.main, [product, "--done", path], folder)
        commit_all(product)
        code, said = quietly(U.main, [product], folder)
        text = read_bytes(product, path).decode("utf-8")
        check(code == 0 and "no hay nada que escribir" in said and "extension .local" in text and "extension .cfg" not in text,
              "revision: --done registra la decision de conservar la fila del producto sin reinsertar la nueva y el replan queda estable (visto fallar) %s"
              % last_words(said))
    end()


def test_component_rendered_paths():
    """Every consumer validates the complete rendered tree before content
    reads or writes, including upgrades of an already created product."""
    begin("test_component_rendered_paths")
    import components as C
    wrong = ("../outside", "/absolute", "C:/outside", "C:outside", "a\\b", "a/./b", "a//b", "a/../b",
             "a/", "a ", "a.", "NUL.txt", "CON", "aux/x", "com1.txt", "lpt9/x", "a\0b", "a:b", "a b")
    for path in wrong:
        raised = False
        try:
            C.rendered_paths([path], [])
        except ValueError:
            raised = True
        check(raised, "rutas: se rechaza la salida no portable o fuera del destino %r" % path)
    for paths in (("Demo/a", "Billing/a"), ("Demo/a", "billing/a"), ("Demo", "Billing/a")):
        raised = False
        try:
            C.rendered_paths(paths, [("Demo", "Billing")])
        except ValueError:
            raised = True
        check(raised, "rutas: no se colapsan destinos exactos, casefold ni fichero/padre %r" % (paths,))
    check(C.rendered_paths(["src/Demo/one.py", "assets/innocent..name.bin"], [("Demo", "Billing")]) == {
        "assets/innocent..name.bin": "assets/innocent..name.bin", "src/Demo/one.py": "src/Billing/one.py"},
        "rutas: un nombre seguro con puntos internos y directorios distintos conserva su identidad")
    reads = []
    stack = {"params": [{"name": "name", "default": "Demo"}]}
    raised = False
    try:
        C.rendered_pieces(stack, {"src/Demo/a": False, "src/Billing/a": False}, {"name": "Billing"}, lambda path: reads.append(path))
    except ValueError:
        raised = True
    check(raised and not reads, "rutas: las piezas colisionadas se rechazan antes de raw_of, sin escoger bytes por orden (visto fallar)")
    U = upgrade_tool()
    if U is not None and shutil.which("git") is not None:
        import instantiate as I
        with scratch_tree() as repo, scratch_tree() as scratch:
            folder = component_template(repo)
            product, code, said = created_product(I, folder, scratch)
            write(repo, "stack/app/src/Billing/Rules.txt", "otra pieza que no se puede descartar\n")
            write(repo, "stack/app/template.txt", APP_STACK + "piece src/Billing/Rules.txt | otra pieza\n")
            commit_template(repo, folder, "chore: colliding upgrade paths")
            before, source_before = tree_bytes(product), tree_bytes(repo)
            code, said = quietly(U.main, [product], folder)
            check(code == 1 and "misma ruta" in said and not plan_id_of(said) and tree_bytes(product) == before,
                  "rutas: upgrade no declara actualizada una pieza descartada por colision renderizada (visto fallar) %s" % last_words(said))
            code, said = quietly(U.main, [product, "--apply", "000000000000"], folder)
            check(code == 1 and "misma ruta" in said and tree_bytes(product) == before and tree_bytes(repo) == source_before,
                  "rutas: ni apply con id inventado toca el producto o la plantilla cuando las piezas colisionan")
        with scratch_tree() as repo, scratch_tree() as scratch:
            folder = component_template(repo)
            product, code, said = created_product(I, folder, scratch)
            record = C.read_record(read_bytes(product, C.RECORD_FILE).decode("utf-8"), [])
            record["components"]["stack:demo-app"]["params"]["name"] = ".."
            write(product, C.RECORD_FILE, C.render_record(record))
            commit_all(product)
            write(repo, "stack/app/Demo/escaped.txt", "no debe escribirse\n")
            write(repo, "stack/app/template.txt", APP_STACK + "rendered Demo/escaped.txt | raiz nombrada\n")
            commit_template(repo, folder, "chore: path outside old parameterized product")
            write(scratch, "escaped.txt", "centinela\n")
            before = tree_bytes(product)
            code, said = quietly(U.main, [product, "--apply", "000000000000"], folder)
            check(code == 1 and "ruta no segura" in said and tree_bytes(product) == before and read_bytes(scratch, "escaped.txt") == b"centinela\n",
                  "rutas: un parametro historico inseguro no permite actualizar fuera del producto ni siquiera al rechazar apply")
    end()


def test_component_blob_failure():
    begin("test_component_blob_failure")
    U = upgrade_tool()
    if U is None or shutil.which("git") is None:
        check(U is None or shutil.which("git") is None, "blob: solo la plantilla actualiza, y necesita git")
        end()
        return
    import instantiate as I
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        write(repo, "stack/app/tools/runner.py", "print('otra version')\n")
        commit_template(repo, folder, "chore: target blob")
        object_id = git_run(repo, "rev-parse", "HEAD:stack/app/tools/runner.py").stdout.decode().strip()
        before, original_blob = tree_bytes(product), U.blob

        def missing(source, identity):
            return None if identity == object_id else original_blob(source, identity)
        with patched(U, blob=missing):
            code, said = quietly(U.main, [product], folder)
            requested = plan_id_of(said) or "000000000000"
            check(code == 1 and "tools/runner.py" in said and "leer" in said and not plan_id_of(said) and tree_bytes(product) == before,
                  "blob: una lectura fallida de Git no se convierte en contenido vacio ni en un plan aplicable (visto fallar) %s" % last_words(said))
            code, said = quietly(U.main, [product, "--apply", requested], folder)
            check(code == 1 and tree_bytes(product) == before,
                  "blob: aplicar mientras Git no da la pieza conserva todos los bytes del producto (visto fallar)")
        if tree_bytes(product) != before:
            git_run(product, "checkout", "--", ".")
        code, said, plan = planned_and_applied(U, product, folder)
        check(code == 0 and read_bytes(product, "tools/runner.py") == b"print('otra version')\n",
              "blob: recuperada la lectura, el replan toma los bytes reales de la pieza")
        commit_all(product)
        write(repo, "stack/app/tools/runner.py", "")
        commit_template(repo, folder, "chore: intentionally empty blob")
        code, said, plan = planned_and_applied(U, product, folder)
        check(code == 0 and read_bytes(product, "tools/runner.py") == b"",
              "blob: un blob valido vacio sigue siendo contenido, no un fallo de lectura")
        commit_all(product)
        before = tree_bytes(product)
        for rel in ("overlays/app/layer.txt", "overlays/app/files/tools/app.py"):
            shipped = U.template_at(folder, git_run(repo, "rev-parse", "HEAD").stdout.decode().strip())
            if rel not in shipped["files"]:
                rel = next(path for path in shipped["files"] if path.startswith("overlays/app/files/"))
            object_id = shipped["files"][rel]["object"]
            with patched(U, blob=missing):
                code, said = quietly(U.main, [product, "--apply", "000000000000"], folder)
            check(code == 1 and rel in said and "leer" in said and tree_bytes(product) == before,
                  "blob: la metadata y los archivos de una capa tampoco se interpretan como retirados si Git no los entrega: %s" % rel)
    end()


def directory_link(path, destination):
    if os.name == "nt":
        command = "New-Item -ItemType Junction -Path '%s' -Target '%s' -ErrorAction Stop | Out-Null" % (
            path.replace("'", "''"), destination.replace("'", "''"))
        result = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
                                capture_output=True, timeout=15)
        if result.returncode:
            raise OSError(result.stderr.decode("utf-8", "replace"))
    else:
        os.symlink(destination, path, target_is_directory=True)


def unlink_directory(path):
    if os.name == "nt":
        os.rmdir(path)
    else:
        os.unlink(path)


def test_component_physical_paths():
    begin("test_component_physical_paths")
    U = upgrade_tool()
    if U is None or shutil.which("git") is None:
        check(U is None or shutil.which("git") is None, "rutas fisicas: solo la plantilla actualiza y necesita git")
        end()
        return
    import instantiate as I
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        write(repo, "stack/app/src/Demo/Rules.txt", "reglas nuevas de Demo\n")
        commit_template(repo, folder, "chore: physical destination guard")
        planned = U.plan(folder, product, "HEAD")
        original = os.path.join(product, "src", "Billing")
        outside = os.path.join(scratch, "outside")
        os.rename(original, outside)
        directory_link(original, outside)
        try:
            before = tree_bytes(product)
            external = tree_bytes(outside)
            code, said = quietly(U.main, [product, "--apply", planned["id"]], folder)
            # Git on Windows walks the junction and sees a clean tree, so only the
            # physical guard refuses; on POSIX git sees the symlink that replaced a
            # tracked directory as a change and the clean-tree check refuses first.
            # The physical guard is held on both by the direct apply check below.
            refused = "enlace" in said or (os.name != "nt" and "no esta limpio" in said)
            check(code == 1 and refused and tree_bytes(product) == before and tree_bytes(outside) == external,
                  "rutas fisicas: el replan rechaza una junction o enlace y no escribe fuera ni dentro (visto fallar)")
            result = U.apply(product, planned)
            check(result["code"] == 1 and not result["done"] and not result["failed"] and tree_bytes(product) == before
                  and tree_bytes(outside) == external,
                  "rutas fisicas: aplicar un plan previo tambien revalida todos los destinos antes de la primera escritura")
            incoming = os.path.join(original, "nuevo")
            code, said = quietly(I.main, [incoming, "--apply"], folder)
            check(code == 1 and "enlace" in said and not os.path.exists(os.path.join(outside, "nuevo")) and tree_bytes(outside) == external,
                  "rutas fisicas: instanciar bajo un padre enlazado falla antes de crear el producto")
        finally:
            unlink_directory(original)
            os.rename(outside, original)
        result = U.apply(product, planned)
        check(result["code"] == 0 and read_bytes(product, "src/Billing/Rules.txt") == b"reglas nuevas de Billing\n",
              "rutas fisicas: un destino ordinario sigue aplicando el mismo plan")
    with scratch_tree() as scratch:
        product = os.path.join(scratch, "product")
        write(product, "parent/a.txt", "original\n")
        journal = U.Journal(product)
        journal.write("parent/a.txt", "del apply\n")
        parent, outside = os.path.join(product, "parent"), os.path.join(scratch, "outside")
        os.rename(parent, outside)
        directory_link(parent, outside)
        try:
            failed = journal.undo()
            check(len(failed) == 1 and "enlace" in failed[0] and read_bytes(outside, "a.txt") == b"del apply\n",
                  "rutas fisicas: rollback rechaza un padre sustituido, conserva los bytes externos y declara que no pudo restaurar")
            rejected = False
            try:
                journal.write("parent/nuevo.txt", "no debe salir\n")
            except OSError:
                rejected = True
            check(rejected and not os.path.exists(os.path.join(outside, "nuevo.txt")),
                  "rutas fisicas: cada nueva escritura del journal vuelve a comprobar el padre")
        finally:
            unlink_directory(parent)
            os.rename(outside, parent)
    end()


def test_accept_posix_lifetime():
    begin("test_accept_posix_lifetime")
    tool = accept_tool()
    if tool is None or os.name != "posix":
        check(True, "aceptacion POSIX NO EJECUTADA: requiere plantilla y host POSIX; no acredita grupos de procesos")
    else:
        import shlex
        script = os.path.join(V.ROOT, "overlays", "test_accept_processes.py")
        result = V.run_gate(" ".join(shlex.quote(part) for part in [sys.executable, script, "-v"]), 90, V.ROOT)
        lines = result["lines"]
        check(result["code"] == 0 and not result["timed_out"] and lines and lines[-1] == "OK"
              and any(re.fullmatch(r"Ran [1-9][0-9]* tests in .*", line) for line in lines),
              "aceptacion POSIX: timeout y senales recogen los grupos de verify; el limite forzado informa incompleto")
    end()


def test_stack_rendered_destinations():
    begin("test_stack_rendered_destinations")
    if shutil.which("git") is None:
        check(True, "rutas de stack: sin git no se puede crear la plantilla de prueba")
        end()
        return
    import instantiate as I
    import components as C
    cases = (("escape", "..", "Demo/escaped.txt"),
             ("same-path", "Billing", "src/Billing/Rules.txt"),
             ("case-alias", "Billing", "src/billing/Rules.txt"))
    for label, name, added in cases:
        with scratch_tree() as repo, scratch_tree() as scratch:
            folder = component_template(repo)
            write(repo, "stack/app/" + added, "contenido que no debe llegar al destino\n")
            commit_template(repo, folder, "chore: unsafe rendered destination fixture")
            product = os.path.join(scratch, "producto")
            os.makedirs(product)
            write(scratch, "escaped.txt", "centinela exterior\n")
            before = tree_bytes(product)
            source_before = tree_bytes(repo)
            reads, original_read = [], I.read_bytes

            def read(path):
                reads.append(path)
                return original_read(path)

            with patched(I, read_bytes=read):
                code, said = quietly(I.main, [product, "--stack", "demo-app", "--param", "name=" + name, "--apply"], folder, "2026-02-03")
            check(code == 1 and "no se escribio nada" in said,
                  "stack %s: un destino escapado o ambiguo se rechaza antes de aplicar %s" % (label, last_words(said)))
            check(tree_bytes(product) == before and read_bytes(scratch, "escaped.txt") == b"centinela exterior\n"
                  and tree_bytes(repo) == source_before,
                  "stack %s: rechazo conserva el destino, el centinela exterior y la plantilla" % label)
            content_root = os.path.join(repo, "stack", "app") + os.sep
            content_reads = [path for path in reads if path.startswith(content_root) and not path.endswith(os.sep + C.STACK_FILE)]
            check(content_reads == [],
                  "stack %s: valida todas las rutas antes de leer el contenido de la plantilla (visto fallar)" % label)
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        write(repo, "stack/app/Demo/escaped.txt", "contenido de Demo\n")
        write(repo, "stack/app/Demo/blob.bin", b"\xff\x00\x01")
        commit_template(repo, folder, "chore: valid rendered destination fixture")
        write(scratch, "escaped.txt", "centinela exterior\n")
        source_before = tree_bytes(repo)
        product = os.path.join(scratch, "producto")
        code, said = quietly(I.main, [product, "--stack", "demo-app", "--param", "name=Billing", "--apply"], folder, "2026-02-03")
        check(code == 0 and read_bytes(product, "Billing/escaped.txt") == b"contenido de Billing\n"
              and read_bytes(product, "src/Billing/Rules.txt") == b"las reglas de Billing\n"
              and read_bytes(product, "Billing/blob.bin") == b"\xff\x00\x01",
              "stack: renombrado seguro conserva contenido renderizado y bytes binarios %s" % last_words(said))
        record = read_bytes(product, C.RECORD_FILE).decode("utf-8") if code == 0 else ""
        check("file stack:demo-app | src/Billing/Rules.txt |" in record and "name=Billing" in record
              and read_bytes(scratch, "escaped.txt") == b"centinela exterior\n" and tree_bytes(repo) == source_before,
              "stack: renombrado seguro registra la procedencia sin tocar la plantilla ni el exterior")
    end()


def test_component_adoption():
    """A product that already has a stack template's pieces and its layer
    without a record (copied by hand, or from before the record existed)
    adopts them with --adopt, which writes only components.txt: a piece that
    some revision had gets that content as its base, one that no revision had
    gets none and stops the next upgrade until the owner decides, and what the
    product lacks is left for the next upgrade to bring."""
    begin("test_component_adoption")
    U = upgrade_tool()
    if U is None or shutil.which("git") is None:
        check(U is None or shutil.which("git") is None, "componentes: solo la plantilla tiene upgrade.py, y sin git no se adopta nada")
        end()
        return
    import components as C
    import instantiate as I
    with scratch_tree() as repo, scratch_tree() as scratch:
        folder = component_template(repo)
        product, code, said = created_product(I, folder, scratch)
        # The record is lost, and the product has moved on: one piece patched, one gone.
        os.remove(os.path.join(product, *C.RECORD_FILE.split("/")))
        write(product, "tools/runner.py", "print('a mano')\n")
        os.remove(os.path.join(product, "tools", "viejo.py"))
        commit_all(product)
        before = tree_bytes(product)
        code, said, plan = planned_and_applied(U, product, folder, "--adopt", "stack:demo-app", "--param", "name=Billing")
        record = read_bytes(product, C.RECORD_FILE).decode("utf-8") if code == 0 else ""
        after = tree_bytes(product)
        commit_all(product)
        check(code == 0 and {path for path in after if after[path] != before.get(path)} == {C.RECORD_FILE},
              "componentes: --adopt solo escribe components.txt (visto fallar) %s" % last_words(said))
        check("file stack:demo-app | tools/runner.py | -" in record and "file stack:demo-app | src/Billing/Rules.txt | " + C.content_hash(b"las reglas de Billing\n") in record
              and "tools/viejo.py" not in record and "no lo tiene la instancia: la proxima actualizacion lo trae: tools/viejo.py" in said,
              "componentes: la pieza que una revision tuvo gana esa base, la que ninguna tuvo queda sin base, y la que falta la trae la proxima vez (visto fallar)")
        code, said = quietly(U.main, [product, "--adopt", "stack:demo-app", "--param", "name=Billing"], folder)
        check(code == 1 and "ya esta registrado" in said, "componentes: un componente ya registrado no se adopta otra vez (visto fallar)")
        code, said, plan = planned_and_applied(U, product, folder, "--adopt", "layer:app")
        commit_all(product)
        check(code == 0 and "item layer:app | gates.txt | gate | app | " + C.line_hash("app | {python} tools/runner.py") in
              read_bytes(product, C.RECORD_FILE).decode("utf-8"),
              "componentes: una capa se adopta con la base de sus puertas como alguna revision las tuvo (visto fallar) %s" % last_words(said))
        commit_all(product)
        before = tree_bytes(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 1 and "tools/runner.py: no tiene base verificable" in said and tree_bytes(product) == before,
              "componentes: la pieza adoptada sin base para la actualizacion hasta que se decide, sin escribir nada (visto fallar) %s" % last_words(said))
        code, said = quietly(U.main, [product, "--keep", "tools/runner.py"], folder)
        commit_all(product)
        code, said, plan = planned_and_applied(U, product, folder)
        check(code == 0 and read_bytes(product, "tools/viejo.py") == b"# se ira\n" and read_bytes(product, "tools/runner.py") == b"print('a mano')\n",
              "componentes: soltada la pieza sin base, la actualizacion trae lo que faltaba y deja lo del producto (visto fallar) %s" % last_words(said))
        commit_all(product)
        code, said = quietly(U.main, [product, "--done", "tools/runner.py"], folder)
        check(code == 0 and "vuelve a ser de su componente" in said and "file stack:demo-app | tools/runner.py | " + C.content_hash(b"print('corre')\n") in
              read_bytes(product, C.RECORD_FILE).decode("utf-8"),
              "componentes: --done de una pieza soltada la vuelve a su componente, con el destino como base (visto fallar) %s" % last_words(said))
        commit_all(product)
        code, said = quietly(U.main, [product], folder)
        check(code == 0 and "se deja tools/runner.py: se conserva su parche local" in said and "no hay nada que escribir" in said,
              "componentes: la pieza recuperada guarda lo del producto como cambio local (visto fallar) %s" % last_words(said))
    end()


def test_stack_templates():
    """Every stack template of the repository that holds this template, end to
    end on a committed snapshot of it: a product created with --stack has its
    pieces and its layer recorded, with the parameters, and passes its board;
    a piece and its layer's gate changed in the template come to the product
    with one plan, the gate with the product's seconds; and a second run has
    nothing to write. The products' own gates run outside this suite, as
    their layers' are (overlays/accept.py)."""
    begin("test_stack_templates")
    U = upgrade_tool()
    tool = accept_tool()
    if U is None or tool is None or shutil.which("git") is None:
        check(U is None or tool is None or shutil.which("git") is None, "plantillas de stack: solo la plantilla las tiene, y sin git no se crea nada")
        end()
        return
    import components as C
    import instantiate as I
    top = I.run_git(V.ROOT, "rev-parse", "--show-toplevel")["out"].strip()
    listed = I.run_git(top, "ls-files", "-z", "--cached", "--others", "--exclude-standard")["out"].split("\0")
    stacks = sorted(path[:-len(C.STACK_FILE) - 1] for path in listed if path.endswith("/" + C.STACK_FILE))
    scaffold = os.path.relpath(V.ROOT, top).replace("\\", "/")
    check(len(stacks) == 4, "plantillas de stack: el repositorio tiene las cuatro, cada una con su template.txt (visto fallar) %s" % stacks)
    with scratch_tree() as repo, scratch_tree() as scratch:
        for folder in [scaffold] + stacks:
            for path, source in tool.sources(os.path.join(top, *folder.split("/"))).items():
                write(repo, folder + "/" + path, source["data"])
        template = os.path.join(repo, *scaffold.split("/"))
        quietly(B.main_on, ["seal"], template)
        commit_all(repo)
        for folder in stacks:
            text = read_bytes(repo, folder + "/" + C.STACK_FILE).decode("utf-8")
            stack = C.read_stack(text, folder, [])
            params = {param["name"]: param["default"].replace("Starter", "Solar").replace("Template", "Solar").replace("template", "solar")
                      for param in stack["params"]}
            product = os.path.join(scratch, stack["id"])
            words = [word for name, value in sorted(params.items()) for word in ("--param", "%s=%s" % (name, value))]
            code, said = quietly(I.main, [product, "--stack", stack["id"]] + words + ["--apply"], template, "2026-02-03")
            record = C.read_record(read_bytes(product, C.RECORD_FILE).decode("utf-8"), []) if code == 0 else C.empty_record()
            layer = next((cid for cid in record["components"] if cid.startswith("layer:")), "")
            pieces = record["files"].get("stack:" + stack["id"], {})
            check(code == 0 and layer and len(pieces) == len(C.stack_pieces(stack, [p[len(folder) + 1:] for p in listed if p.startswith(folder + "/")], []))
                  and record["components"]["stack:" + stack["id"]]["params"] == params,
                  "plantillas de stack (%s): --stack crea el producto con su capa y registra todas sus piezas con sus parametros (visto fallar) %s"
                  % (stack["id"], "" if code == 0 else last_words(said)))
            if code != 0:
                continue
            quietly(B.build, product)
            commit_all(product)
            check(findings_of(product) == [], "plantillas de stack (%s): el producto creado pasa el tablero" % stack["id"])
            created = tree_bytes(product)
            code, said = quietly(U.main, [product], template)
            check(code == 0 and "no hay nada que escribir" in said and tree_bytes(product) == created,
                  "plantillas de stack (%s): un producto recien creado no tiene nada que actualizar: las lineas que ya tenia antes de la capa siguen"
                  " siendo suyas (visto fallar) %s" % (stack["id"], last_words(said)))
            piece = sorted(pieces)[0]
            source = next(rel for rel in C.stack_pieces(stack, [p[len(folder) + 1:] for p in listed if p.startswith(folder + "/")], [])
                          if C.render_text(rel, C.substitutions(stack, params)) == piece)
            label = sorted(key for kind, key in record["items"][layer] if kind == C.GATE)[0]
            gates = read_bytes(product, "gates.txt").decode("utf-8").split("\n")
            measured = [line for line in gates if line.split("|", 1)[0].strip().replace(" [harness]", "") == label][0]
            write(product, "gates.txt", "\n".join(gates).replace(measured, measured.split("|", 2)[0].rstrip() + " | 9.9 |" + measured.split("|", 2)[2]))
            commit_all(product)
            append(repo, folder + "/" + source, "\n// la plantilla cambia\n" if source.endswith((".cs", ".java", ".ts", ".js", ".dart")) else "\n# la plantilla cambia\n")
            data = I.LAYERS_DIR + "/" + layer.partition(":")[2] + "/" + I.LAYER_FILE
            rows = read_bytes(template, data).decode("utf-8")
            row = [line for line in rows.split("\n") if line.startswith("gate ") and line[5:].split("|", 1)[0].strip().replace(" [harness]", "") == label][0]
            write(template, data, rows.replace(row, row + " --la-plantilla-cambia"))
            quietly(B.main_on, ["seal"], template)
            git_run(repo, "add", "-A")
            git_run(repo, "commit", "-q", "--no-verify", "-m", "chore: %s moves" % stack["id"])
            code, said, plan = planned_and_applied(U, product, template)
            taken = [line for line in read_bytes(product, "gates.txt").decode("utf-8").split("\n")
                     if "|" in line and line.split("|", 1)[0].strip().replace(" [harness]", "") == label]
            check(code == 0 and "se toma %s:" % piece in said and taken and "| 9.9 |" in taken[0] and taken[0].endswith("--la-plantilla-cambia"),
                  "plantillas de stack (%s): un cambio de su pieza %s y de la puerta '%s' de su capa llegan con un plan, la puerta con los segundos del"
                  " producto (visto fallar) %s" % (stack["id"], piece, label, last_words(said)))
            commit_all(product)
            settled = tree_bytes(product)
            code, said = quietly(U.main, [product], template)
            check(code == 0 and "no hay nada que escribir" in said and tree_bytes(product) == settled,
                  "plantillas de stack (%s): la segunda corrida no tiene nada que escribir (visto fallar) %s" % (stack["id"], last_words(said)))
    end()


def test_adopt():
    begin("test_adopt")
    # Imported here: a missing adopt.py fails this test, not the whole suite.
    import adopt as A
    with scratch_tree() as root:
        minimal_tree(root)
        write(root, "gates.txt", "uno | - | {python} -c \"print(1)\"\n")
        write(root, "docs/registry/lessons/lesson-a-cap-schedules-the-next-crisis.md", "---\ntitle: Un tope\ndate: 2026-01-01\norigin: x\n---\n**Un tope.** x\n")
        quietly(B.build, root)
        code, said = quietly(A.main, [], root, "2026-02-03")
        path = "docs/registry/decisions/%s.md" % A.DECISION_ID
        text = read_bytes(root, path).decode("utf-8") if os.path.exists(os.path.join(root, *path.split("/"))) else ""
        check(code == 0 and text.startswith("---\ntitle: ") and "\nstate: confirmed\ndate: 2026-02-03\n---\n" in text and path in said,
              "adopt: escribe la decision de adopcion, confirmada y con la fecha del dia en que corre (visto fallar)")
        quietly(B.build, root)
        check(findings_of(root) == [], "adopt: la decision que escribe pasa todas las comprobaciones del tablero")
        write(root, path, "otra\n")
        verdict = read_bytes(root, B.VERDICT_FILE)
        code, said = quietly(A.main, [], root, "2026-02-04")
        check(code == 1 and read_bytes(root, path) == b"otra\n" and "ya existe" in said and read_bytes(root, B.VERDICT_FILE) == verdict,
              "adopt: no reescribe una decision de adopcion que ya existe, ni toca nada mas (visto fallar)")
        code, said = quietly(A.main, ["--x"], root)
        check(code == 2 and "uso" in said and read_bytes(root, path) == b"otra\n", "adopt: un argumento desconocido dice el uso y no escribe nada")
    with scratch_tree() as root:
        write(root, "tools/board/documents.txt", legend(DOCUMENT_KEYS) + "live README.md\n")
        code, said = quietly(A.main, [], root, "2026-02-03")
        check(code == 1 and "'decisions'" in said, "adopt: sin directorio de decisiones declarado no escribe nada y dice por que")
    with scratch_tree() as root:
        minimal_tree(root)
        append(root, "tools/board/MANIFEST.txt", "\n# Solo en la plantilla.\ntemplate capas\n")
        summary = read_bytes(root, B.SUMMARY_FILE)
        code, said = quietly(A.main, [], root, "2026-02-03")
        check(code == 1 and "plantilla" in said and read_bytes(root, B.SUMMARY_FILE) == summary and not os.path.exists(os.path.join(root, *B.VERDICT_FILE.split("/")))
              and not os.path.exists(os.path.join(root, *("docs/registry/decisions/%s.md" % A.DECISION_ID).split("/"))),
              "adopt: en la plantilla (su MANIFEST.txt declara filas 'template', existan o no sus rutas) se niega y no toca nada: la adopcion es de una copia (visto fallar)")
    with scratch_tree() as root:
        # The template ships its verdict and its derivatives sealed on the days it was built.
        minimal_tree(root)
        write(root, "gates.txt", "uno | - | {python} -c \"print(1)\"\n")
        write(root, "docs/registry/lessons/lesson-a-cap-schedules-the-next-crisis.md", "---\ntitle: Un tope\ndate: 2026-01-01\norigin: x\n---\n**Un tope.** x\n")
        shipped = "2001-01-01"
        write(root, B.VERDICT_FILE, V.render_verdict([("board: tests", V.GREEN)], shipped))
        quietly(B.build, root)
        for path in derived_on_disk(root):
            write(root, path, read_bytes(root, path).replace(B.today().encode("utf-8"), shipped.encode("utf-8")))
        write(root, B.INDEX_DIR + "/mine.md", "# Mio\n")
        consistent = findings_of(root)
        code, said = quietly(A.main, [], root, B.today())
        emptied = B.parse_verdict(read_bytes(root, B.VERDICT_FILE).decode("utf-8"))
        left = [path for path in [B.SUMMARY_FILE, B.DECISIONS_INDEX_FILE, B.NOTES_INDEX_FILE] + B.index_paths(root)
                if os.path.exists(os.path.join(root, *path.split("/")))]
        check(code == 0 and emptied == {"date": B.today(), "rows": []} and left == [B.INDEX_DIR + "/mine.md"],
              "adopt: vacia el veredicto con la fecha del dia y borra los derivados que llevan la huella del tablero, y solo esos (visto fallar)")
        quietly(B.build, root)
        V.store_verdict([("board: tests", V.GREEN)], root)
        quietly(B.build, root)
        dated = [path for path in derived_on_disk(root) + [B.VERDICT_FILE] if shipped.encode("utf-8") in read_bytes(root, path)]
        check(len(consistent) == 1 and "mine.md" in consistent[0]["key"] and dated == [] and findings_of(root) == consistent and B.today() in said,
              "adopt: la instancia no hereda las fechas de la plantilla, ni en el veredicto ni en ningun derivado (visto fallar)")
    end()


def main():
    B.utf8_console()
    print("=== TESTS DEL TABLERO ===")
    tests = [test_data_files, test_docs, test_citations, test_order_and_titles, test_records,
             test_record_checks, test_sections_and_lists, test_startup_and_timeless, test_model_and_render,
             test_settled_citations_and_verify, test_encoding, test_links_and_comments, test_derived_strict,
             test_gates_file, test_run_gate, test_gate_environment, test_kill_report, test_verify_main, test_atomic_writes, test_board_end_to_end,
             test_tree_listing_with_git, test_adapters, test_harness_rows, test_skills, test_commit_message, test_pre_push,
             test_hooks_through_git, test_long_paths, test_python_discovery, test_hook_modes, test_guard_adapters, test_dart_test_adapter, test_runner_by_its_path, test_instantiate_merges, test_instantiate, test_instantiate_command_line, test_layer_readiness, test_template_layers, test_accept, test_accept_posix_lifetime, test_python_layer_needs, test_released_engine, test_layer_requires_its_engine, test_engine_manifest, test_upgrade_plan, test_upgrade, test_components_model, test_component_creation_and_update, test_component_safety, test_component_review_safety, test_component_rendered_paths, test_component_blob_failure, test_component_physical_paths, test_stack_rendered_destinations, test_component_adoption, test_stack_templates, test_record_rules, test_prose_is_data, test_order_line_and_parts, test_split_indexes,
             test_adopt]
    for test in tests:
        try:
            test()
        except Exception as error:
            # A test that blows up is a failure, never a silent green.
            print("[FAIL] %s revento: %r" % (test.__name__, error))
    declared = [name for name in dir(sys.modules[__name__]) if name.startswith("test_")]
    check(started == completed, "guard finished: todas las funciones de test terminaron sin errores (%d/%d)" % (completed, started))
    check(declared and len(declared) == started, "guard registered: toda funcion test_* declarada se ejecuta, y hay al menos una (%d declaradas, %d ejecutadas)" % (len(declared), started))
    check(not mute, "guard silent: ninguna funcion de test se quedo sin ejecutar un solo check%s" % ("" if not mute else " -> " + ", ".join(mute)))
    print("RESULT: %d checks, %d fallos" % (total, failures))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
