#!/usr/bin/env python3
"""Instantiates the scaffold from this template into a target directory, adds
a stack layer to an instance, and creates a new product from a stack template
with its layer. It shows its plan and writes nothing without --apply, and it
checks before writing everything that would stop it half way.

    python tools/board/instantiate.py <target> [--layer <name>] [--apply]
    python tools/board/instantiate.py <target> --stack <id> [--param <name>=<value>]... [--apply]
    python tools/board/instantiate.py -h

The template is the folder whose tools/board/MANIFEST.txt declares `template`
rows, and what it ships is what its git repository versions there: a template
folder with changes that are not committed (an untracked `.env`, a modified
engine file) stops it, and what git ignores (a virtual environment, a cache)
never travels. The copy's MANIFEST.txt is written without the `template`
rows, so nothing ever takes a copy for the template.

New repository (the target is empty or does not exist): everything the
template versions is copied but what only the template has; git is
initialised, the hooks are activated and marked executable in the index, and
adopt.py writes the adoption decision.

Existing repository (the target has files): it must be a git repository with a
clean tree, so that what this writes is exactly the diff to review, and with no
hooks of its own active (another core.hooksPath, or hooks in .git/hooks), which
activating the scaffold's would silence. Nothing that exists is overwritten:
README.md, AGENTS.md, CLAUDE.md, opencode.json, .gitignore, .gitattributes and
.editorconfig are merged, each as its function says; any other file of the
scaffold that already exists stops it, and so does a file to merge that cannot
be merged.

A layer (--layer, a folder of the template's overlays) adds its gate rows, its
standards, its rows of documents.txt and of the authority table, its .gitignore
lines and its files to an instance: after a new instantiation, or alone on a
repository that already has the scaffold. Its engine has to be at least the
version the layer requires. The plan refuses it while the instance lacks a file
the layer `needs` (a test runner's first test), and while what it writes into
the contract cites a path that neither the instance has nor the layer brings:
either would surely leave a gate red. That is necessary, not sufficient: once
the layer is in, its gates judge the product. A layer whose gates the
template's suite cannot run names in an `external` row the stack template its
product lives in, and in `prepare` rows what its acceptance runs before its
gates; neither writes anything into an instance.

A stack template (--stack, the id its template.txt declares, in a folder of
the template's repository) becomes a new product: the target is empty or does
not exist, every file the stack template commits is written there with the
parameters (--param, or each one's default) in its path and text, and then
the scaffold is instantiated over it as over an existing product, with the
layer whose `external` row names that folder. A product that already exists
incorporates a stack template's pieces with upgrade.py --adopt.

Whatever a run brings in beyond the engine is recorded in
tools/board/components.txt (components.py): the layer, with the files it
copied and the lines it wrote, and the stack template, with its parameters
and its pieces, each with the commit of the template it came from. It is the
base that upgrade.py compares against, so the owner never writes it.

Requires Python 3.8+ and git.
"""
import fnmatch
import json
import os
import shutil
import stat
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import adopt as A
import board as B
import components as C
import pre_push as P

MANIFEST_FILE = B.BOARD_DIR + "/" + B.MANIFEST_FILE
LAYERS_DIR = "overlays"
LAYER_FILE = "layer.txt"
LAYER_FILES = "files"
# The smallest product with which the layer's gates are green: the acceptance
# of every layer whose gates the template's suite runs (test_board.py) puts it
# in an instance before applying the layer, and nothing ever copies it to a
# real one.
LAYER_READY = "ready"
# 'external' and 'prepare' write nothing into an instance: they tell the
# template's acceptance where the layer's product lives, why its gates are
# accepted outside the suite, and what runs before them there.
LAYER_KEYS = {"requires": "requires", "needs": "needs", "gate": "gates", "document": "documents", "ignore": "ignore",
              "standard": "standards", "authority": "authority", "external": "external", "prepare": "prepare"}
# The headings of the contract a layer writes under, read from the instance's
# prose.txt: the team language decides them, not this script.
STANDARDS_KEY, AUTHORITY_KEY = "standards", "authority"
GATES_FILE, DOCUMENTS_FILE, PROSE_FILE = "gates.txt", "tools/board/documents.txt", "tools/board/prose.txt"
CONTRACT, IGNORE_FILE, OPENCODE_FILE = "AGENTS.md", ".gitignore", "opencode.json"
SCAFFOLD_MARKS = ("verify.py", "tools/board/board.py")
# git keeps examples of hooks in .git/hooks that never run.
SAMPLE_HOOK = ".sample"
GIT_SECONDS = 30
FROM_US = "# From the agentic scaffold"
USAGE = "uso: python tools/board/instantiate.py <destino> [--layer <nombre> | --stack <id> [--param <nombre>=<valor>]...] [--apply]"
HELP_WORDS = ("-h", "--help")
HELP = USAGE + """

Crea una instancia del andamio desde esta plantilla commiteada, le anade una
capa de tecnologia, o crea un producto nuevo desde una plantilla de stack con
su capa. Sin --apply ensena el plan y no escribe nada; con --apply escribe
solo si el plan no encontro nada que lo pararia, y registra en
tools/board/components.txt la capa y la plantilla de stack que trajo.

  <destino>         un directorio vacio o que no existe (repositorio nuevo), un
                    repositorio git con el arbol limpio (uno que ya existe) o
                    una instancia del andamio (solo la capa)
  --layer <nombre>  la capa de overlays/<nombre>; entra cuando el destino tiene
                    lo que la capa necesita (en la de python, el primer test)
  --stack <id>      la plantilla de stack de ese id (su template.txt): crea en
                    el destino, vacio, un producto con ella y con su capa
  --param <n>=<v>   un parametro de creacion de esa plantilla de stack; el que
                    no se da toma su valor por defecto
  --apply           escribe lo que dice el plan
  -h, --help        esta ayuda"""

# ----------------------------------------------------------------- merges
#
# Each takes the target's text and the template's and returns the merged text,
# or raises ValueError when the target's cannot be merged: the target's lines
# are all kept, and the template's are added where they do not change what the
# target already decided. They are pure, so the plan runs them before writing.


def merge_ignore(existing, ours):
    """.gitignore: the template's patterns the target lacks, appended."""
    have = {line.strip() for line in existing.split("\n")}
    missing = [line for line in ours.split("\n") if line.strip() and not line.startswith("#") and line.strip() not in have]
    if not missing:
        return existing
    return existing.rstrip("\n") + "\n\n" + FROM_US + "\n" + "\n".join(missing) + "\n"


def merge_attributes(existing, ours):
    """.gitattributes: the template's rules the target lacks go FIRST, as
    defaults: a later line wins in git, so the target's own rules still decide
    the paths they name."""
    have = {line.strip() for line in existing.split("\n")}
    missing = [line for line in ours.split("\n") if line.strip() and not line.startswith("#") and line.strip() not in have]
    if not missing:
        return existing
    return FROM_US + ": defaults first; the rules below, the repository's, win.\n" + "\n".join(missing) + "\n\n" + existing


def editorconfig_parts(text):
    """The preamble lines and the sections (header, lines) of an .editorconfig."""
    preamble, sections = [], []
    for line in text.split("\n"):
        if line.strip().startswith("[") and line.strip().endswith("]"):
            sections.append((line.strip(), [line]))
        elif sections:
            sections[-1][1].append(line)
        else:
            preamble.append(line)
    return preamble, sections


def merge_editorconfig(existing, ours):
    """.editorconfig: the template's sections the target lacks go before the
    target's, so a later section of the target still wins; 'root = true' is
    added to the preamble when the target does not say it."""
    preamble, sections = editorconfig_parts(existing)
    _, template_sections = editorconfig_parts(ours)
    have = {header for header, _ in sections}
    missing = [lines for header, lines in template_sections if header not in have]
    if not missing and any(line.replace(" ", "") == "root=true" for line in preamble):
        return existing
    if not any(line.replace(" ", "") == "root=true" for line in preamble):
        preamble = ["root = true"] + preamble
    body = [line for lines in missing for line in lines]
    while body and not body[-1].strip():
        body.pop()
    joined = "\n".join(preamble).rstrip("\n") + "\n\n" + FROM_US + "\n" + "\n".join(body) + "\n"
    rest = "\n".join(line for _, lines in sections for line in lines)
    return joined + ("\n" + rest if rest.strip() else "")


def merge_readme(existing, ours):
    """README.md: the target's README stays first and whole; the template's
    sections (how to work here, what there is, the instantiation steps) follow."""
    at = ours.find("\n## ")
    return existing.rstrip("\n") + "\n\n" + (ours[at + 1:] if at >= 0 else ours)


def merge_contract(existing, ours, pending):
    """AGENTS.md: the scaffold's contract first, because it is the authority
    the startup reading opens with, and the target's contract whole, under the
    heading `pending`, which says it is still to merge: each conflict between
    the two is a decision, and the section goes when the merge is done. The
    board finds the contract while it keeps that section."""
    return ours.rstrip("\n") + "\n\n## " + pending + "\n\n" + existing


def merge_imports(existing, ours):
    """CLAUDE.md: the template's '@' imports are the startup reading, which a
    tool loads once and in order, so they open the file in that order and the
    target's own copies of them go; every other line of the target is kept
    after them. A file that already loads them in order is left as it is."""
    startup = [line.strip() for line in ours.split("\n") if line.strip().startswith(B.IMPORT_MARK)]
    lines = existing.split("\n")
    if [line.strip() for line in lines if line.strip() in startup] == startup:
        return existing
    rest = "\n".join(line for line in lines if line.strip() not in startup).strip("\n")
    return "\n".join(startup) + "\n" + ("\n" + rest + "\n" if rest else "")


def merge_instructions(existing, ours):
    """opencode.json: the target's settings kept, and its instructions with
    the template's first, in their order (the startup reading), then its own.
    It is written back as JSON with its keys in their order; a file that
    already lists them in order is left as it is. Raises ValueError on a file
    that is not strict JSON (comments, a trailing comma) or is not an object
    with a list of instructions."""
    data, template = json.loads(existing), json.loads(ours)
    if not isinstance(data, dict) or not isinstance(data.get(B.ADAPTER_LIST, []), list):
        raise ValueError("no es un objeto JSON con una lista '%s'" % B.ADAPTER_LIST)
    startup = template.get(B.ADAPTER_LIST, [])
    listed = data.get(B.ADAPTER_LIST, [])
    merged = list(startup) + [path for path in listed if path not in startup]
    if merged == listed and (B.ADAPTER_LIST in data or not merged):
        return existing
    data[B.ADAPTER_LIST] = merged
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def merges(pending):
    """Each file of the scaffold that the target may already have, with the
    merge that takes the target's text and the template's. The contract's
    leaves the target's under `pending`, the heading the template's prose.txt
    declares, in the team language."""
    return {"README.md": merge_readme, CONTRACT: lambda existing, ours: merge_contract(existing, ours, pending), "CLAUDE.md": merge_imports,
            OPENCODE_FILE: merge_instructions, IGNORE_FILE: merge_ignore, ".gitattributes": merge_attributes, ".editorconfig": merge_editorconfig}


# What the plan says of a merge beyond keeping everything the target has.
MERGE_NOTES = {OPENCODE_FILE: "; JSON no guarda formato, asi que se reescribe con sangria de 2 si le falta algo"}


def instance_manifest(text):
    """The template's MANIFEST.txt as a copy keeps it: its version and its
    engine, without the `template` rows, which only the template has, so that
    no copy is ever taken for the template. A group whose rows were all
    `template` rows goes with its comment."""
    kept = []
    for group in text.split("\n\n"):
        lines = group.split("\n")
        rows = [line for line in lines if line.strip() and not line.strip().startswith("#")]
        own = [line for line in rows if line.strip().split(" ", 1)[0] == B.TEMPLATE_KEY]
        if rows and len(own) == len(rows):
            continue
        kept.append("\n".join(line for line in lines if line not in own))
    return "\n\n".join(kept).rstrip("\n") + "\n"

# ----------------------------------------------------------------- sections


def section_bounds(lines, heading):
    """The index of a section's heading line and of the line after its end, or None."""
    for start, line in enumerate(lines):
        if B.heading_matches(line, heading):
            end = start + 1
            while end < len(lines) and not lines[end].startswith("## "):
                end += 1
            return start, end
    return None


def last_bullet(lines, start, end):
    """The last line of the section's bullet lists, continuation lines included."""
    found, inside = None, False
    for at in range(start + 1, end):
        line = lines[at]
        inside = line.startswith("- ") or (inside and line.startswith("  "))
        if inside:
            found = at
    return found


def last_table_row(lines, start, end):
    rows = [at for at in range(start + 1, end) if lines[at].lstrip().startswith("|")]
    return rows[-1] if rows else None


def insert_in_section(text, heading, added, anchor):
    """`added` lines right after the anchor line of a section (its last bullet,
    its last table row), or after its last line with text. None when the
    section does not exist."""
    lines = text.split("\n")
    bounds = section_bounds(lines, heading)
    if bounds is None:
        return None
    start, end = bounds
    at = anchor(lines, start, end)
    if at is None:
        at = max([i for i in range(start, end) if lines[i].strip()])
        added = [""] + added if at == start else added
    lines[at + 1:at + 1] = added
    return "\n".join(lines)

# ----------------------------------------------------------------- layers


def read_layer(source, name, listing, text_of=None):
    """A layer's rows by kind and the files it brings, or its problems. The
    layer is what the template's git versions under its folder; `text_of`
    reads a path of `listing` when it is not the disk (upgrade.py reads a
    revision of the template from git's objects)."""
    layer = {kind: [] for kind in LAYER_KEYS.values()}
    layer.update({"name": name, "files": [], "problems": []})
    data = "%s/%s/%s" % (LAYERS_DIR, name, LAYER_FILE)
    if data not in listing:
        layer["problems"].append("no hay capa '%s': la plantilla no versiona %s" % (name, data))
        return layer
    if text_of is None:
        reader = B.TreeReader(source)
        rows = B.parse_data(reader.text(data), data, layer["problems"])
        layer["problems"] += [f["message"] for f in reader.findings]
    else:
        rows = B.parse_data(text_of(data), data, layer["problems"])
    for row in rows:
        if row["keyword"] not in LAYER_KEYS:
            layer["problems"].append("%s:%d: la clave '%s' no es de una capa (validas: %s)" % (data, row["line"], row["keyword"], ", ".join(LAYER_KEYS)))
            continue
        layer[LAYER_KEYS[row["keyword"]]].append(row["value"])
    if len(layer["requires"]) != 1 or not B.VERSION_SHAPE.match(layer["requires"][0]):
        layer["problems"].append("%s tiene que declarar exactamente un 'requires X.Y.Z': la version del motor que sus filas necesitan" % data)
    externals = [parse_external(row) for row in layer["external"]]
    layer["problems"] += ["la fila 'external %s' de %s %s" % (row, data, ext["problem"]) for row, ext in zip(layer["external"], externals) if ext["problem"]]
    if len(externals) > 1:
        layer["problems"].append("%s declara %d filas 'external' y va una como mucho: donde vive su producto y por que la suite de la plantilla"
                                 " no corre sus puertas" % (data, len(externals)))
    layer["external"] = [ext for ext in externals if not ext["problem"]]
    if layer["prepare"] and not externals:
        layer["problems"].append("%s declara filas 'prepare' sin una 'external': solo las corre la aceptacion de una capa cuyas puertas se aceptan"
                                 " fuera de la suite, y aqui nadie las correria" % data)
    labels, runners = set(), []
    for row in layer["gates"]:
        try:
            gate = B.V.parse_gate_row(row, 0, "python")
        except B.V.GatesFileError as error:
            layer["problems"].append("la fila de puerta '%s' no vale: %s" % (row, error))
            continue
        labels.add(gate["label"])
        if gate["harness"]:
            runners.append(gate["label"])
    for standard in layer["standards"]:
        label = standard.split("|", 1)[0].strip()
        if "|" not in standard or label not in labels:
            layer["problems"].append("el estandar '%s' no nombra una puerta de la capa ('<etiqueta> | <vineta>'): un estandar sin puerta es una preferencia" % standard)
    needs = [parse_need(row) for row in layer["needs"]]
    layer["problems"] += ["la fila 'needs %s' de %s %s" % (row, data, need["problem"]) for row, need in zip(layer["needs"], needs) if need["problem"]]
    if runners and not needs:
        layer["problems"].append("%s trae el runner de tests '%s' y no dice con que entra ('needs'): un runner sin nada que ejecutar es rojo,"
                                 " asi que la capa entraria antes de poder estar en verde" % (data, runners[0]))
    layer["needs"] = [need for need in needs if not need["problem"]]
    files = "%s/%s/%s/" % (LAYERS_DIR, name, LAYER_FILES)
    layer["files"] = [path[len(files):] for path in listing if path.startswith(files)]
    return layer


def parse_need(row):
    """A 'needs' row: '<pattern> | <what it is>', a file the instance has to
    have before the layer enters, and what that is in the team language,
    which the refusal asks for. A folder is not a need: it can exist with
    nothing in it a gate runs. 'problem' says why a row is not one."""
    pattern, _, what = row.partition("|")
    pattern, what = pattern.strip(), what.strip()
    problem = ""
    if not what:
        problem = "no dice que es ('<patron> | <que es, en el idioma del equipo>'): la negativa no sabria que pedir"
    elif not C.is_relative_path(pattern):
        problem = "no es un fichero del repositorio: una ruta relativa con '/', sin '..', sin blancos y sin '/' al final"
    return {"pattern": pattern, "what": what, "problem": problem}


def parse_external(row):
    """An 'external' row: '<stack template> | <why>', the folder, from the
    root of the repository that holds the scaffold, of the stack template whose
    sources the template's suite instantiates with the layer without running
    its gates, and why it cannot run them, in the team language, which the
    suite's checks say. 'problem' says why a row is not one."""
    folder, _, why = row.partition("|")
    folder, why = folder.strip(), why.strip()
    problem = ""
    if not why:
        problem = "no dice por que ('<plantilla de stack> | <por que, en el idioma del equipo>'): la suite no sabria decir por que no corre sus puertas"
    elif not C.is_relative_path(folder):
        problem = "no es una carpeta del repositorio de la plantilla: una ruta relativa con '/', sin '..', sin blancos y sin '/' al final"
    return {"folder": folder, "why": why, "problem": problem}


def readiness_problems(name, needs, files, known, lines, extensions, generated, mode):
    """What would surely leave the instance red if the layer entered now: a
    need that no file of the instance matches, so a gate of the layer has
    nothing to run; and, once every need is met, a citation in what the layer
    writes into the contract (`lines`) that the board would find broken
    (while a need is missing, a citation of it is broken for that same
    reason). `files` and `known` are the instance as it will be: its files,
    and its paths with their suffixes. Passing says that much and no more:
    the layer's gates judge the rest."""
    later = ("instancia ahora sin --layer, y aplica la capa sola cuando lo tenga (el mismo comando con --layer %s)" % name
             if mode in ("new", "existing") else "aplicala cuando lo tenga")
    found = ["la capa %s entra con %s, y el destino no tiene ningun fichero que case con %s: sus puertas no pueden estar en verde todavia; %s"
             % (name, need["what"], need["pattern"], later) for need in needs if not any(C.matches(need["pattern"], path) for path in files)]
    if found:
        return found
    citations = [{"value": span["value"], "line": span["line"], "doc": CONTRACT, "dir": ""} for span in B.inline_code("\n".join(lines))]
    for broken in B.cited_files_exist(citations, extensions, known, generated):
        found.append("la capa %s escribe en %s una cita de `%s`, que ni el destino tiene ni trae la capa: el tablero la daria por rota;"
                     " si es del producto, %s, y si no, la capa tiene que traerlo" % (name, CONTRACT, broken["key"], later))
    return found


def version_numbers(text):
    return tuple(int(part) for part in text.split(".")) if B.VERSION_SHAPE.match(text or "") else None


def engine_problems(required, version):
    """A layer's rows run files and grammar of the engine: the engine its rows
    go into must be at least the version the layer requires."""
    if version_numbers(version) is None:
        return ["la instancia no declara la version de su motor en %s: es anterior a %s, la que pide la capa; actualiza antes el andamio"
                " (README, «Actualizar el andamio»)" % (MANIFEST_FILE, required)]
    if version_numbers(version) < version_numbers(required):
        return ["la capa pide el motor %s y el que tendria la instancia es %s: actualiza antes el andamio (README, «Actualizar el"
                " andamio»)" % (required, version)]
    return []


def skill_line(path, text):
    """The line of the contract's skills index for a skill the layer brings."""
    fields = B.skill_frontmatter(text)["fields"]
    return "- **%s** — %s: `%s`" % (fields.get("name", ""), fields.get("description", ""), path)


def layer_texts(layer, read, prose):
    """The new texts of the instance's files the layer writes into, and the
    conflicts that stop it. `read` gives an instance file's text."""
    texts, conflicts = {}, []
    gates = read(GATES_FILE)
    try:
        labels = {g["label"] for g in B.V.parse_gates(gates, "python")["gates"]}
    except B.V.GatesFileError as error:
        return {"texts": {}, "conflicts": ["%s no se puede leer: %s" % (GATES_FILE, error)]}
    for row in layer["gates"]:
        label = B.V.parse_gate_row(row, 0, "python")["label"]
        if label in labels:
            conflicts.append("%s ya tiene una puerta '%s': la capa no la pisa" % (GATES_FILE, label))
    rows = "".join(row + "\n" for row in layer["gates"])
    texts[GATES_FILE] = gates.rstrip("\n") + "\n#\n# The %s layer:\n%s" % (layer["name"], rows) if rows else gates
    documents = read(DOCUMENTS_FILE)
    have = {line.strip() for line in documents.split("\n")}
    added = [row for row in layer["documents"] if row not in have]
    texts[DOCUMENTS_FILE] = documents.rstrip("\n") + "\n\n# --- The %s layer ---\n%s" % (layer["name"], "".join(r + "\n" for r in added)) if added else documents
    texts[IGNORE_FILE] = merge_ignore(read(IGNORE_FILE), "\n".join(layer["ignore"]))
    contract = read(CONTRACT)
    for key, lines, anchor in contract_lines(layer):
        if not lines:
            continue
        heading = prose.get(key, "")
        changed = insert_in_section(contract, heading, lines, anchor) if heading else None
        if changed is None:
            conflicts.append("%s no tiene la seccion '%s' que declara %s ('%s'): no se sabe donde escribir" % (CONTRACT, heading, PROSE_FILE, key))
            continue
        contract = changed
    texts[CONTRACT] = contract
    return {"texts": texts, "conflicts": conflicts}


def contract_lines(layer):
    """What the layer writes into the contract, by the prose key of the
    section it goes to and the anchor it follows there: each standard with
    the gate that holds it, the authority rows, and the index line of each
    skill it brings."""
    return [(STANDARDS_KEY, ["- " + s.split("|", 1)[1].strip() + " Puerta: `%s`." % s.split("|", 1)[0].strip() for s in layer["standards"]], last_bullet),
            (AUTHORITY_KEY, list(layer["authority"]), last_table_row),
            (B.SKILLS_KEY, [skill_line(path, read_layer_file(layer, path)) for path in layer["files"] if is_skill(path)], last_bullet)]


def is_skill(path):
    parts = path.split("/")
    return len(parts) == 4 and parts[0] == ".agents" and parts[1] == "skills" and parts[3] == B.SKILL_FILE


def read_layer_file(layer, path):
    return layer.get("file_texts", {}).get(path, "")

# ----------------------------------------------------------------- planning


def manifest_of(root):
    """The version, engine rows and template paths of a tree's MANIFEST.txt;
    a tree without one has no version and no template paths."""
    problems = []
    rows = B.parse_data(B.TreeReader(root).text(MANIFEST_FILE), MANIFEST_FILE, problems)
    return B.read_manifest(rows, problems)


def run_git(root, *args):
    env = B.V.without_git_location(os.environ)
    try:
        done = subprocess.run(["git"] + list(args), cwd=root, env=env, stdin=subprocess.DEVNULL, capture_output=True, timeout=GIT_SECONDS)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"code": -1, "out": "", "err": str(error)}
    return {"code": done.returncode, "out": done.stdout.decode("utf-8", "replace"), "err": done.stderr.decode("utf-8", "replace").strip()}


def template_listing(source):
    """What the template's git versions under its folder, or what keeps it
    from being instantiated: no git, or changes that are not committed, which
    nobody reviewed and no version names."""
    listed = run_git(source, "ls-files", "-z")
    if listed["code"] != 0:
        return {"files": [], "problem": "git no lista la plantilla (%s): se instancia desde su repositorio, para copiar solo lo versionado"
                                        % (listed["err"] or "salio con %d" % listed["code"])}
    status = run_git(source, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ".")
    if status["code"] != 0:
        return {"files": [], "problem": "git status fallo en la plantilla: %s" % status["err"]}
    changes = P.tree_changes(status["out"])
    dirty = changes["tracked"] + changes["untracked"]
    if dirty:
        return {"files": [], "problem": "la plantilla tiene cambios sin commitear (%s): se copia solo lo commiteado, para que una instancia"
                                        " venga de una version y no lleve lo que nadie reviso; commitealo, ignoralo o apartalo antes" % P.shown(dirty)}
    return {"files": sorted(set(path for path in listed["out"].split("\0") if path)), "problem": ""}


def nested(inner, outer):
    """Whether `inner` is `outer` or lies under it, as the file system sees
    them: links resolved, and without case on Windows."""
    inner, outer = os.path.normcase(os.path.realpath(inner)), os.path.normcase(os.path.realpath(outer))
    return inner == outer or inner.startswith(outer.rstrip(os.sep) + os.sep)


def contained_path(root, rel=""):
    """A destination without links or reparse points in its existing path.
    Recheck before each effect: a validated plan does not own the filesystem.
    """
    if rel and not C.is_relative_path(rel):
        raise OSError("ruta de destino no relativa o ambigua: %s" % rel)
    root = os.path.abspath(root)
    path = os.path.join(root, *rel.split("/")) if rel else root
    current = path
    while True:
        try:
            info = os.lstat(current)
        except (FileNotFoundError, NotADirectoryError):
            # Absent. POSIX says NotADirectoryError under a regular file where
            # Windows says FileNotFoundError; the parents are still checked.
            pass
        else:
            if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400):
                raise OSError("ruta de destino con enlace o reparse point: %s" % current)
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    if not nested(path, root):
        raise OSError("ruta de destino fuera de su raiz: %s" % path)
    return path


def destination_problems(target, paths):
    """Validate every destination before reading or writing any of them."""
    problems = []
    for rel in sorted(set(paths) | {""}):
        try:
            contained_path(target, rel)
        except OSError as error:
            problems.append(str(error))
    return problems


def hooks_of(files):
    return [path for path in files if path.startswith(B.HOOKS_DIR + "/") and "." not in path.rsplit("/", 1)[-1]]


def is_empty(target):
    return not os.path.isdir(target) or not [name for name in os.listdir(target) if name != ".git"]


def active_hooks(target):
    """The hooks of .git/hooks that git runs while core.hooksPath is unset:
    every file there but the examples git writes."""
    where = run_git(target, "rev-parse", "--git-path", "hooks")
    if where["code"] != 0:
        return None
    folder = where["out"].strip()
    folder = folder if os.path.isabs(folder) else os.path.join(target, folder)
    if not os.path.isdir(folder):
        return []
    return sorted(name for name in os.listdir(folder) if not name.endswith(SAMPLE_HOOK) and os.path.isfile(os.path.join(folder, name)))


def repository_problems(target):
    """What keeps a git repository from receiving the scaffold: a tree that is
    not clean, or hooks of its own that activating the scaffold's would silence."""
    found = []
    status = run_git(target, "status", "--porcelain")
    if status["code"] != 0 or status["out"].strip():
        found.append("el arbol del destino no esta limpio (o git fallo: %s): commitea o aparta antes, para que lo escrito sea el diff que se revisa"
                     % (status["err"] or "cambios sin commitear"))
    hooks_path = run_git(target, "config", "--get", "core.hooksPath")["out"].strip()
    if hooks_path and hooks_path != B.HOOKS_DIR:
        found.append("core.hooksPath ya es '%s': activar %s apagaria esos hooks; decidelo antes" % (hooks_path, B.HOOKS_DIR))
    elif not hooks_path:
        active = active_hooks(target)
        if active is None:
            found.append("git no dice donde estan los hooks del destino: sin saberlo, activar %s podria apagar alguno" % B.HOOKS_DIR)
        elif active:
            found.append("el destino tiene hooks en .git/hooks (%s): activar %s los apagaria sin avisar; decide antes que hacer con ellos"
                         % (", ".join(active), B.HOOKS_DIR))
    return found


def plan(source, target, layer_name, stack_request=None):
    """What instantiating, adding a layer, or creating a product from a stack
    template (`stack_request`: its id and the parameters given) would do,
    without doing it."""
    found = {"mode": "", "copy": [], "merge": [], "conflicts": [], "git": [], "layer": None, "problems": [], "version": "", "pending": "",
             "stack": None, "incoming": {}}
    source, target = os.path.abspath(source), os.path.abspath(target)
    found["problems"] += destination_problems(target, [MANIFEST_FILE, C.RECORD_FILE, ".git"] + list(SCAFFOLD_MARKS))
    if found["problems"]:
        return found
    manifest = manifest_of(source)
    if not B.is_template(manifest):
        found["problems"].append("%s no es la plantilla: su %s no declara ninguna fila '%s'; se instancia desde la plantilla" % (source, MANIFEST_FILE, B.TEMPLATE_KEY))
        return found
    if nested(target, source) or nested(source, target):
        found["problems"].append("el destino %s esta dentro de la plantilla, o la contiene" % target)
        return found
    if os.path.lexists(target) and not os.path.isdir(target):
        found["problems"].append("el destino %s es un fichero: se instancia en un directorio vacio o que no existe, en un repositorio o en una instancia" % target)
        return found
    listing = template_listing(source)
    if listing["problem"]:
        found["problems"].append(listing["problem"])
        return found
    if stack_request:
        if layer_name:
            found["problems"].append("--stack aplica la capa de su plantilla de stack: va sin --layer")
            return found
        if not is_empty(target):
            found["problems"].append("--stack crea un producto nuevo, y %s no esta vacio: un producto que ya existe incorpora sus piezas con"
                                     " upgrade.py <instancia> --adopt %s:%s" % (target, C.STACK, stack_request["id"]))
            return found
        found["stack"] = stack_plan(source, stack_request, listing["files"])
        found["problems"] += found["stack"]["problems"]
        if found["problems"]:
            return found
        found["incoming"], layer_name = found["stack"]["files"], found["stack"]["layer"]
    if layer_name:
        found["layer"] = read_layer(source, layer_name, listing["files"])
        found["problems"] += found["layer"]["problems"]
    if found["stack"]:
        brought = {"%s:%s" % (C.STACK, found["stack"]["id"]): found["stack"]["pieces"]}
        if layer_name:
            brought["%s:%s" % (C.LAYER, layer_name)] = found["layer"]["files"]
        found["problems"] += C.owner_conflicts(set(manifest["engine"]), brought)
    files = [path for path in listing["files"] if not B.under_any(path, manifest["template"])]
    adoption = A.adoption_path(B.parse_data(B.TreeReader(source).text(DOCUMENTS_FILE), DOCUMENTS_FILE, []))
    destinations = files + list(found["incoming"]) + (found["layer"]["files"] if found["layer"] else []) + list(C.ITEM_FILES.values())
    found["problems"] += destination_problems(target, destinations + ([adoption] if adoption else []))
    if found["problems"]:
        return found
    if all(os.path.isfile(os.path.join(target, *mark.split("/"))) for mark in SCAFFOLD_MARKS):
        if not layer_name:
            found["problems"].append("%s ya tiene el andamio: para anadirle una capa, --layer <nombre>" % target)
        found["mode"], found["version"] = "layer", manifest_of(target)["version"]
        return found
    found["mode"] = "stack" if found["stack"] else ("new" if is_empty(target) else "existing")
    found["version"] = manifest["version"]
    found["pending"] = prose_of(B.TreeReader(source).text(PROSE_FILE))[B.PENDING_KEY]
    merging = merges(found["pending"])
    for path in files:
        if path not in found["incoming"] and not os.path.lexists(os.path.join(target, *path.split("/"))):
            found["copy"].append(path)
        elif path in merging:
            found["merge"].append(path)
            found["problems"] += merge_problems(source, path, merging[path], lambda rel=path: their_text(target, found, rel))
        else:
            found["conflicts"].append("%s ya existe en el destino y no es de los que se fusionan: renombralo o decide antes" % path)
    if CONTRACT in found["merge"] and not found["pending"]:
        found["problems"].append("%s de la plantilla no declara '%s', la cabecera bajo la que el %s del destino queda por fusionar" % (PROSE_FILE, B.PENDING_KEY, CONTRACT))
    adoption = A.adoption_path(B.parse_data(B.TreeReader(source).text(DOCUMENTS_FILE), DOCUMENTS_FILE, []))
    if not adoption:
        found["problems"].append("%s de la plantilla no declara el directorio de 'decisions': adopt.py no sabria donde escribir" % DOCUMENTS_FILE)
    elif adoption in found["incoming"] or os.path.lexists(os.path.join(target, *adoption.split("/"))):
        found["problems"].append("%s ya existe en el destino: la adopcion se escribe una vez, y adopt.py se pararia a medias" % adoption)
    git_dir = os.path.exists(os.path.join(target, ".git"))
    if found["mode"] == "existing" and not git_dir:
        found["problems"].append("un repositorio que ya existe se instancia sobre git con el arbol limpio, para que lo escrito sea el diff que se revisa: git init y un commit antes")
    elif git_dir:
        found["problems"] += repository_problems(target)
    # git on Windows refuses a path past 260 characters without it, and a record id under a clone's path can get there.
    long_paths = ["git config core.longpaths true"] if os.name == "nt" else []
    executable = hooks_of(files) + sorted(path for path, incoming in found["incoming"].items() if incoming["executable"])
    found["git"] = ([] if git_dir else ["git init"]) + long_paths + \
                   ["git config core.hooksPath %s" % B.HOOKS_DIR, "git add --chmod=+x -- %s" % " ".join(executable)]
    return found


def stack_plan(source, request, listing):
    """A stack template of the template's repository as a new product gets
    it: the template is the folder whose template.txt declares the id asked
    for, and what it ships is what git versions there, committed. Every path
    takes the parameters, and so does the text of every file but a 'piece',
    copied byte for byte, and a file that is not UTF-8. It also names the
    layer whose 'external' row is that folder, and the pieces the record
    keeps, with the sha256 of what is written."""
    found = {"id": request["id"], "folder": "", "params": {}, "files": {}, "pieces": {}, "layer": "", "problems": []}
    top = run_git(source, "rev-parse", "--show-toplevel")
    if top["code"] != 0:
        found["problems"].append("git no dice cual es el repositorio de la plantilla (%s): las plantillas de stack se leen de el" % top["err"])
        return found
    root = os.path.normpath(top["out"].strip())
    staged = run_git(root, "ls-files", "-z", "--stage")
    if staged["code"] != 0:
        found["problems"].append("git no lista el repositorio de la plantilla: %s" % staged["err"])
        return found
    modes = {}
    for entry in staged["out"].split("\0"):
        if "\t" in entry:
            meta, path = entry.split("\t", 1)
            modes[path] = meta.split()[0]
    declared, matched = [], []
    for path in sorted(modes):
        if path.rsplit("/", 1)[-1] != C.STACK_FILE:
            continue
        text = read_bytes(os.path.join(root, *path.split("/"))).decode("utf-8", "replace")
        if C.STACK_KEY not in B.legend_keys(text):
            continue
        problems = []
        stack = C.read_stack(text, path, problems)
        declared.append(stack["id"] or path)
        if stack["id"] == request["id"]:
            matched.append((path, stack, problems))
    if len(matched) != 1:
        found["problems"].append("%s la plantilla de stack '%s' (las hay: %s)" % ("ninguna carpeta del repositorio declara" if not matched else
                                 "%d carpetas declaran" % len(matched), request["id"], ", ".join(sorted(declared)) or "ninguna"))
        return found
    path, stack, problems = matched[0]
    found["problems"] += problems
    folder = path[:-len(C.STACK_FILE)].rstrip("/")
    found["folder"] = folder
    status = run_git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", folder or ".")
    dirty = P.tree_changes(status["out"]) if status["code"] == 0 else None
    if dirty is None or dirty["tracked"] or dirty["untracked"]:
        found["problems"].append("la plantilla de stack %s tiene cambios sin commitear (%s): se copia solo lo commiteado; commitealo, ignoralo o apartalo"
                                 " antes" % (folder, status["err"] if dirty is None else P.shown(dirty["tracked"] + dirty["untracked"])))
    prefix = folder + "/" if folder else ""
    files = sorted(p[len(prefix):] for p in modes if p.startswith(prefix) and p[len(prefix):] != C.STACK_FILE)
    found["params"], wrong = C.creation_params(stack, request["params"])
    found["problems"] += wrong
    pieces = C.stack_pieces(stack, files, found["problems"])
    if found["problems"]:
        return found
    pairs = C.substitutions(stack, found["params"])
    try:
        destinations = C.rendered_paths(files, pairs)
    except ValueError as error:
        found["problems"].append(str(error))
        return found
    for rel in files:
        raw = read_bytes(os.path.join(root, *(prefix + rel).split("/")))
        data = raw
        if pieces.get(rel) is not False:
            try:
                data = C.render_text(raw.decode("utf-8"), pairs).encode("utf-8")
            except UnicodeDecodeError as error:
                if rel in pieces:
                    found["problems"].append("%s es una pieza 'rendered' y no es UTF-8 (byte %d): no se le pueden poner los parametros" % (rel, error.start))
                    continue
        product = destinations[rel]
        found["files"][product] = {"data": data, "executable": modes[prefix + rel] == B.EXECUTABLE_MODE}
        if rel in pieces:
            found["pieces"][product] = C.content_hash(data)
    layers = sorted({p.split("/")[1] for p in listing if p.startswith(LAYERS_DIR + "/") and p.endswith("/" + LAYER_FILE) and p.count("/") == 2})
    for name in layers:
        externals = read_layer(source, name, listing)["external"]
        if externals and externals[0]["folder"] == folder:
            found["layer"] = name
    return found


def their_text(target, found, rel):
    """A file of the target that a merge reads: what a stack template brings
    when the product is being created, else the file on disk."""
    if rel in found["incoming"]:
        return found["incoming"][rel]["data"].decode("utf-8-sig")
    return theirs_text(target, rel)


def merge_problems(source, rel, merge, theirs):
    """A file of the target that would be merged and cannot be, said before
    anything is written: the merges are pure, so the plan runs them. `theirs`
    gives the target's text, and may raise as reading it would."""
    try:
        merge(theirs(), ours_text(source, rel))
    except UnicodeDecodeError as error:
        return ["%s no es UTF-8 (byte %d): conviertelo antes; fusionarlo perderia sus bytes" % (rel, error.start)]
    except ValueError as error:
        return ["%s no se puede fusionar (%s): arreglalo, o fusionalo a mano y quitalo del destino, antes" % (rel, error)]
    return []


def layer_plan(source, target, layer, projected, incoming=()):
    """The texts a layer writes and its file copies, over the instance as it
    is or as the instantiation will leave it (`projected` gives the texts it
    will write, `incoming` every path it will write)."""
    problems = destination_problems(target, layer["files"] + list(C.ITEM_FILES.values()) + [PROSE_FILE, C.RECORD_FILE])
    if problems:
        return {"texts": {}, "copies": [], "conflicts": problems}

    def read(rel):
        if rel in projected:
            return projected[rel]
        path = contained_path(target, rel)
        return B.TreeReader(target).text(rel) if os.path.isfile(path) else ""
    layer["file_texts"] = {}
    copies, conflicts = [], []
    for path in layer["files"]:
        if os.path.lexists(os.path.join(target, *path.split("/"))) or path in incoming:
            conflicts.append("la capa trae %s y el destino ya lo tiene: la capa no lo pisa" % path)
            continue
        with open(os.path.join(source, LAYERS_DIR, layer["name"], LAYER_FILES, *path.split("/")), "rb") as handle:
            layer["file_texts"][path] = handle.read().decode("utf-8", "replace")
        copies.append(path)
    prose = prose_of(read(PROSE_FILE))
    result = layer_texts(layer, read, prose)
    return {"texts": result["texts"], "copies": copies, "conflicts": conflicts + result["conflicts"]}


def projected_texts(source, target, found):
    """The texts a layer writes into, as the instantiation will leave them,
    so that a layer's conflicts stop it before anything is written."""
    projected = {}
    for rel in (GATES_FILE, DOCUMENTS_FILE, IGNORE_FILE, CONTRACT, PROSE_FILE):
        if rel in found["copy"]:
            projected[rel] = ours_text(source, rel)
        elif rel in found["merge"]:
            projected[rel] = merges(found["pending"])[rel](their_text(target, found, rel), ours_text(source, rel))
    return projected


def instance_tree(target, incoming, generated):
    """The instance as it will be, as the board will list it: what the board
    lists in the target today (git's listing, or the walk without git) plus
    `incoming`, every path the instantiation and the layer will write."""
    listed = B.tree_listing(target, generated) if os.path.isdir(target) else {"files": [], "dirs": []}
    files = list(dict.fromkeys(list(listed["files"]) + list(incoming)))
    dirs = set(listed["dirs"])
    for path in incoming:
        parts = path.split("/")
        dirs.update("/".join(parts[:end]) for end in range(1, len(parts)))
    return B.index_tree(files, sorted(dirs), generated)


def layer_readiness(target, found, layered):
    """The readiness of the layer over the instance as it will be, with the
    path suffixes and generated trees of its documents.txt as the layer
    leaves it."""
    documents = B.parse_data(layered["texts"].get(DOCUMENTS_FILE, ""), DOCUMENTS_FILE, [])
    generated, extensions = B.values_of(documents, "generated"), B.values_of(documents, "extension")
    tree = instance_tree(target, found["copy"] + list(found["incoming"]) + layered["copies"], generated)
    lines = [line for _, written, _ in contract_lines(found["layer"]) for line in written]
    return readiness_problems(found["layer"]["name"], found["layer"]["needs"], tree["sources"], tree["known"], lines, extensions, generated, found["mode"])


def prose_of(text):
    rows = B.parse_data(text, PROSE_FILE, [])
    return {key: (B.values_of(rows, key) or [""])[0] for key in (STANDARDS_KEY, AUTHORITY_KEY, B.SKILLS_KEY, B.PENDING_KEY)}

# ----------------------------------------------------------------- applying


def read_bytes(path):
    with open(path, "rb") as handle:
        return handle.read()


def ours_text(source, rel):
    return read_bytes(os.path.join(source, *rel.split("/"))).decode("utf-8")


def theirs_text(target, rel):
    """A target file that is merged, as text: UTF-8, its BOM dropped so that
    it does not end up in the middle of a merge. Raises UnicodeDecodeError on
    other bytes: replacing them would lose them."""
    return read_bytes(contained_path(target, rel)).decode("utf-8-sig")


def write_text(path, text):
    B.write_atomically(path, text)


def layer_written(source, layer, read, copies):
    """What a layer brings into an instance, as the record keeps it: each file
    it copies with the sha256 of its content, every gate row (the plan
    refuses a label the instance already has), the rows of documents.txt and
    lines of .gitignore it adds, and the index line of each skill it copies.
    A row the instance already had stays the instance's. `read` gives an
    instance file's text before the layer writes into it."""
    documents = {line.strip() for line in read(DOCUMENTS_FILE).split("\n")}
    ignored = {line.strip() for line in read(IGNORE_FILE).split("\n")}
    skills = [skill_line(path, read_layer_file(layer, path)) for path in copies if is_skill(path)]
    items = {}
    for kind, key, sha, row in C.layer_lines(layer, skills):
        if (kind == C.DOCUMENT and row.strip() in documents) or (kind == C.IGNORE and row.strip() in ignored):
            continue
        items[(kind, key)] = sha
    files = {path: C.content_hash(read_bytes(os.path.join(source, LAYERS_DIR, layer["name"], LAYER_FILES, *path.split("/")))) for path in copies}
    return {"files": files, "items": items}


def record_problems(target):
    """What keeps the instance's components.txt from being read, which a run
    that records a component would rewrite and lose."""
    if not os.path.isfile(os.path.join(target, *C.RECORD_FILE.split("/"))):
        return []
    problems = []
    C.read_record(B.TreeReader(target).text(C.RECORD_FILE), problems)
    return ["%s no se puede leer y esta corrida lo reescribiria (%s): arreglalo antes" % (C.RECORD_FILE, problem) for problem in problems]


def recorded(target, found, written, commit):
    """The text of the instance's components.txt with what this run brought
    in: the layer, with what layer_written says, and the stack template the
    product is created from, with its parameters and its pieces; the
    components it already recorded stay as they are."""
    path = os.path.join(target, *C.RECORD_FILE.split("/"))
    record = C.read_record(B.TreeReader(target).text(C.RECORD_FILE) if os.path.isfile(path) else "", [])
    if written is not None:
        cid = "%s:%s" % (C.LAYER, found["layer"]["name"])
        record["components"][cid] = {"commit": commit, "params": {}}
        record["files"][cid], record["items"][cid] = written["files"], written["items"]
    if found["stack"]:
        cid = "%s:%s" % (C.STACK, found["stack"]["id"])
        record["components"][cid] = {"commit": commit, "params": dict(found["stack"]["params"])}
        record["files"][cid], record["items"][cid] = dict(found["stack"]["pieces"]), {}
    return C.render_record(record)


def apply(source, target, found, day):
    """Writes what the plan says: the stack template's files, copies, merges,
    git, the adoption, the layer, and the record of what came in."""
    done = []
    try:
        return apply_checked(source, target, found, day, done)
    except OSError as error:
        return {"code": 1, "done": done, "said": str(error)}


def apply_checked(source, target, found, day, done):
    source, target = os.path.abspath(source), os.path.abspath(target)
    destinations = found["copy"] + found["merge"] + list(found["incoming"]) + list(C.ITEM_FILES.values()) + [C.RECORD_FILE, ".git"]
    if found["layer"]:
        destinations += found["layer"]["files"]
    adoption = A.adoption_path(B.parse_data(B.TreeReader(source).text(DOCUMENTS_FILE), DOCUMENTS_FILE, []))
    problems = destination_problems(target, destinations + ([adoption] if adoption else []))
    if problems:
        raise OSError("; ".join(problems))
    commit = run_git(source, "rev-parse", "HEAD")["out"].strip()
    if found["mode"] == "stack":
        os.makedirs(contained_path(target), exist_ok=True)
        for path, incoming in sorted(found["incoming"].items()):
            destination = contained_path(target, path)
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            with open(destination, "wb") as handle:
                handle.write(incoming["data"])
            if incoming["executable"]:
                os.chmod(destination, 0o755)
        done.append("escritos %d ficheros de la plantilla de stack %s (%s)" % (len(found["incoming"]), found["stack"]["id"], found["stack"]["folder"]))
    if found["mode"] in ("new", "existing", "stack"):
        os.makedirs(contained_path(target), exist_ok=True)
        for path in found["copy"]:
            destination = contained_path(target, path)
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            if path == MANIFEST_FILE:
                write_text(destination, instance_manifest(ours_text(source, path)))
            else:
                shutil.copyfile(os.path.join(source, *path.split("/")), destination)
            if path in hooks_of(found["copy"]):
                os.chmod(destination, 0o755)
        done.append("copiados %d ficheros (%s sin las filas '%s')" % (len(found["copy"]), MANIFEST_FILE, B.TEMPLATE_KEY))
        merging = merges(found["pending"])
        for path in found["merge"]:
            write_text(contained_path(target, path), merging[path](theirs_text(target, path), ours_text(source, path)))
            done.append("fusionado %s" % path)
        for command in found["git"]:
            contained_path(target, ".git")
            result = run_git(target, *command.split()[1:])
            if result["code"] != 0:
                return {"code": 1, "done": done, "said": "'%s' fallo: %s" % (command, result["err"])}
            done.append(command)
        contained_path(target, adoption)
        adopted = A.adopt(target, day)
        if adopted["code"] != 0:
            return {"code": 1, "done": done, "said": adopted["said"]}
        done.append("adopt: " + adopted["said"].split(";")[0])
    written = None
    if found["layer"]:
        planned = layer_plan(source, target, found["layer"], {})
        if planned["conflicts"]:
            return {"code": 1, "done": done, "said": "; ".join(planned["conflicts"])}

        def read(rel):
            return B.TreeReader(target).text(rel) if os.path.isfile(contained_path(target, rel)) else ""
        written = layer_written(source, found["layer"], read, planned["copies"])
        for path in planned["copies"]:
            destination = contained_path(target, path)
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            shutil.copyfile(os.path.join(source, LAYERS_DIR, found["layer"]["name"], LAYER_FILES, *path.split("/")), destination)
        for rel, text in planned["texts"].items():
            path = contained_path(target, rel)
            if not os.path.isfile(path) or B.TreeReader(target).text(rel) != text:
                write_text(path, text)
        done.append("capa %s: %d filas de puerta, %d estandares, %d ficheros" % (found["layer"]["name"], len(found["layer"]["gates"]),
                                                                                  len(found["layer"]["standards"]), len(planned["copies"])))
    if written is not None or found["stack"]:
        write_text(contained_path(target, C.RECORD_FILE), recorded(target, found, written, commit))
        brought = (["%s:%s" % (C.LAYER, found["layer"]["name"])] if written is not None else []) + \
                  (["%s:%s" % (C.STACK, found["stack"]["id"])] if found["stack"] else [])
        done.append("registrado en %s: %s, del commit %s de la plantilla" % (C.RECORD_FILE, ", ".join(brought), commit[:7]))
    return {"code": 0, "done": done, "said": ""}

# ----------------------------------------------------------------- command line


def parse_args(argv):
    """The request a command line makes. A word that opens with '-' is an
    option, never the target: an unknown one, one given twice (--param once
    per name), --layer or --stack without a name, --param without
    '<name>=<value>' or without --stack is an error, and -h or --help
    anywhere asks for the help."""
    request = {"target": "", "layer": "", "stack": "", "params": {}, "apply": False, "help": False, "error": ""}
    if any(word in HELP_WORDS for word in argv):
        request["help"] = True
        return request
    rest, seen = list(argv), set()
    while rest and not request["error"]:
        word = rest.pop(0)
        if word in seen:
            request["error"] = "la opcion %s va una sola vez" % word
        elif word == "--apply":
            request["apply"] = True
        elif word in ("--layer", "--stack"):
            if not rest or not rest[0] or rest[0].startswith("-"):
                request["error"] = "%s necesita el nombre de una capa" % word if word == "--layer" else "--stack necesita el id de una plantilla de stack"
            else:
                request[word[2:]] = rest.pop(0)
        elif word == "--param":
            name, equals, value = (rest.pop(0) if rest and not rest[0].startswith("-") else "").partition("=")
            if not equals or not name or not value:
                request["error"] = "--param necesita '<nombre>=<valor>'"
            elif name in request["params"]:
                request["error"] = "el parametro %s va una sola vez" % name
            else:
                request["params"][name] = value
        elif word.startswith("-"):
            request["error"] = "opcion desconocida: %s" % word
        elif request["target"]:
            request["error"] = "sobra '%s': el destino ya es '%s'" % (word, request["target"])
        else:
            request["target"] = word
        if word.startswith("-") and word != "--param":
            seen.add(word)
    if not request["error"] and not request["target"]:
        request["error"] = "falta el destino"
    if not request["error"] and request["params"] and not request["stack"]:
        request["error"] = "--param va con --stack: son los parametros de una plantilla de stack"
    return request


def describe(found, target):
    lines = ["modo: %s" % {"new": "repositorio nuevo", "existing": "repositorio que ya existe", "layer": "solo la capa",
                           "stack": "producto nuevo desde una plantilla de stack"}.get(found["mode"], "-")]
    if found["stack"] and not found["stack"]["problems"]:
        stack = found["stack"]
        lines.append("plantilla de stack %s (%s): se escriben sus %d ficheros, y %d son piezas que se registran" % (stack["id"], stack["folder"],
                                                                                                                 len(stack["files"]), len(stack["pieces"])))
        lines += ["parametro %s = %s" % (name, value) for name, value in sorted(stack["params"].items())]
        lines.append("capa de la plantilla de stack: %s" % (stack["layer"] or "ninguna (ninguna capa la nombra en su fila 'external')"))
    if found["copy"]:
        lines.append("se copian %d ficheros a %s (%s, sin las filas '%s')" % (len(found["copy"]), target, MANIFEST_FILE, B.TEMPLATE_KEY))
    lines += ["se fusiona %s, sin perder nada de lo que tiene%s" % (path, MERGE_NOTES.get(path, "")) for path in found["merge"]]
    lines += ["git: %s" % command for command in found["git"]]
    if found["mode"] in ("new", "existing", "stack"):
        lines.append("adopt: la decision de adopcion, con la fecha de hoy")
    if found["layer"] and not found["layer"]["problems"]:
        layer = found["layer"]
        lines.append("capa %s: %d filas de puerta, %d de documents.txt, %d de .gitignore, %d estandares, %d filas de autoridad, %d ficheros"
                     % (layer["name"], len(layer["gates"]), len(layer["documents"]), len(layer["ignore"]), len(layer["standards"]),
                        len(layer["authority"]), len(layer["files"])))
        lines += ["capa %s: entra con %s (%s)" % (layer["name"], need["what"], need["pattern"]) for need in layer["needs"]]
    if found["layer"] or found["stack"]:
        lines.append("se registra en %s lo que entra, con el commit de la plantilla del que viene" % C.RECORD_FILE)
    return lines


def main(argv, source=B.ROOT, day=None):
    B.utf8_console()
    request = parse_args(argv)
    if request["help"]:
        print(HELP)
        return 0
    if request["error"]:
        print(USAGE)
        print("RESULT: %s; no se escribio nada" % request["error"])
        return 2
    stack_request = {"id": request["stack"], "params": request["params"]} if request["stack"] else None
    found = plan(source, request["target"], request["layer"], stack_request)
    if found["layer"] and not found["problems"]:
        found["problems"] += engine_problems(found["layer"]["requires"][0], found["version"])
    if found["layer"] and not found["problems"]:
        layered = layer_plan(source, request["target"], found["layer"], projected_texts(source, request["target"], found),
                             found["copy"] + found["merge"] + list(found["incoming"]))
        found["conflicts"] += layered["conflicts"] + layer_readiness(request["target"], found, layered)
    if (found["layer"] or found["stack"]) and not found["problems"]:
        found["problems"] += record_problems(request["target"])
    for line in describe(found, request["target"]):
        print("  " + line)
    stops = found["problems"] + found["conflicts"]
    for stop in stops:
        print("  NO: " + stop)
    if stops:
        print("RESULT: %d problemas; no se escribio nada" % len(stops))
        return 1
    if not request["apply"]:
        print("RESULT: plan sin escribir nada; con --apply se escribe")
        return 0
    result = apply(source, request["target"], found, day or B.today())
    for line in result["done"]:
        print("  hecho: " + line)
    if result["code"] != 0:
        print("RESULT: se paro a medias: %s; lo hecho queda en el destino para revisarlo con git" % result["said"])
        return 1
    merge = ("lleva al contrato lo de la seccion '%s' de %s y borrala, porque el tablero sale rojo mientras este; " % (found["pending"], CONTRACT)
             if CONTRACT in found["merge"] else "")
    print("RESULT: listo. Sigue: %spython verify.py hasta verde (la primera corrida dice que el veredicto cambio), y la entrega de la parte"
          " que lo instalo, con lo que dijeron las puertas" % merge)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
