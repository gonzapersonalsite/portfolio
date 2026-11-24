#!/usr/bin/env python3
"""What an instance incorporates beyond the scaffold's engine, and the
decisions that keep it in step with the template: the stack layers that
instantiate.py applies (overlays/<name>) and the pieces of the stack template a
product is created from (a folder of the template's repository with a
template.txt). instantiate.py records each component when it first brings it
in; upgrade.py plans and applies its updates, and adopts what an instance
already has. Both share this module, which writes nothing: it reads what they
hand it and says what to do.

Every piece of an instance has one owner:
- the engine: the files of tools/board/MANIFEST.txt, which upgrade.py keeps;
- a layer: the files under its files/ folder, its gate rows (by label), the
  rows it added to documents.txt and the lines it added to .gitignore, and
  the index line of each skill it brings. The standards and authority rows it
  wrote into the contract are the instance's prose from then on: a change of
  them is said to merge by hand, never written;
- a stack template: the files its template.txt declares;
- the product: everything else, which no tool here writes. A guide of the
  starter (a `guide` row of its template.txt) is the product's too: the
  creation declares it to the board once, and no update reads or writes it.
No piece has two owners: what two components bring at one path, even with the
same bytes, what a component brings at a path of the engine or of a file whose
lines have their own owners, and a record that gives one path to two
components are refused before anything is written.

Requires Python 3.8+ and nothing else.
"""
import fnmatch
import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import board as B

V = B.V

RECORD_FILE = B.BOARD_DIR + "/components.txt"
RECEIPT_FILE = ".template-receipt.txt"
STACK_FILE = "template.txt"
LAYER, STACK, ENGINE = "layer", "stack", "engine"
NO_BASE = "-"
KEPT = "kept"
NO_PARAMS = "-"
SOURCE_KEY = "source"
COMPONENT_KEY, FILE_KEY, ITEM_KEY, PENDING_KEY, APPLIED_KEY = "component", "file", "item", "pending", "applied"
STACK_KEY, PARAM_KEY, PIECE_KEY, RENDERED_KEY = "stack", "param", "piece", "rendered"
# A guide is a document of the starter that the product owns and that has
# authority in it; a receipt keeps which ones the starter delivered.
GUIDE_KEY, DELIVERED_KEY = "guide", "delivered"
GATES_FILE, DOCUMENTS_FILE, IGNORE_FILE, CONTRACT = "gates.txt", B.BOARD_DIR + "/documents.txt", ".gitignore", "AGENTS.md"
# The host launcher files shared between standalone stack templates and the
# scaffold engine: in a scaffolded repository the engine owns them; in a
# stack-only repository its receipt tracks them until the scaffold enters.
LAUNCHER_FILES = frozenset({"dev.cmd", "dev", "tools/launcher/dev.ps1", "tools/launcher/dev.sh", "tools/launcher/run-step.sh"})
SHARED_GUARDS = frozenset({"tools/guards/junit.py", "tools/guards/dart_test.py", "tools/guards/python_unittest.py"})
# The lines a layer writes into files the instance shares, by kind, with the
# file each one lives in. A gate is found by its label; the others by their
# whole text, so the only change an instance can make to one is to remove it.
GATE, DOCUMENT, IGNORE, SKILL = "gate", "document", "ignore", "skill"
ITEM_FILES = {GATE: GATES_FILE, DOCUMENT: DOCUMENTS_FILE, IGNORE: IGNORE_FILE, SKILL: CONTRACT}
ID_SHAPE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
SOURCE_SHAPE = re.compile(r"^[A-Za-z0-9._:/-]+$")
COMMIT_SHAPE = re.compile(r"^[0-9a-f]{7,40}$")
SHA_SHAPE = re.compile(r"^[0-9a-f]{64}$")
PARAM_VALUE = re.compile(r"^[A-Za-z0-9_.-]+$")

RECORD_HEADER = """# What this instance incorporated beyond the engine (whose record is
# MANIFEST.txt): the stack layers instantiate.py applied and the pieces of the
# stack template it was created from, each with the commit of the template it
# came from, and what an applied upgrade left to do by hand. instantiate.py and
# upgrade.py write it; a hand edit makes the next plan compare against a base
# that never existed, so nobody edits it: `upgrade.py --done` and `--keep`
# change it when the owner decides.
#
# --- KEYS ---
# source    : '<catalog-id>': optional public catalog provenance identifier, at
#             most once (used by standalone receipts and distribution catalogs).
# component : '<id> | <commit> | <parameters>': a component (layer:<name> or
#             stack:<id>), the commit of the template its pieces came from,
#             and the parameters it was created with ('<name>=<value>', comma
#             separated, or '-').
# file      : '<id> | <path> | <sha256>': a file the component keeps, with the
#             sha256 of its content as the component shipped it (its base,
#             line ends folded to LF); '-' when no revision of the template
#             had the content the instance has, adopted without inventing
#             where it came from; or 'kept' when the product keeps it
#             (`upgrade.py --keep`) and no update touches it.
# item      : '<id> | <file> | <kind> | <key> | <sha256>': a line the
#             component wrote into a file the instance shares (gate,
#             document, ignore or skill), the gate's label as its key or '-',
#             and the sha256 of the line as the component shipped it; a gate
#             adopted without a base anyone can verify says '-'.
# delivered : '<id> | <path> | <what it is consulted for> | <its authority>':
#             a guide the stack template delivered when it created this
#             product without the scaffold, with the two cells of its row of
#             the authority table. It says where the file came from, whatever
#             it holds today and whatever commit an upgrade brings the
#             component to, so only the creation writes it. When the scaffold
#             enters, a guide still at its path is declared to the board, and
#             one that is not there is neither recreated nor declared.
# applied   : '<commit>': the commit of the template the last upgrade that
#             wrote anything brought this instance to, at most once; what
#             changed outside the engine up to it is pending or done already.
# pending   : '<id> | <path> | <what>': what an applied upgrade left to do by
#             hand, in every plan until `upgrade.py --done <path>`.
"""

# ----------------------------------------------------------------- paths


def is_relative_path(path):
    """A path of a repository as its rows write it: relative, with '/', inside it."""
    return (bool(path) and not any(c.isspace() or c in "\\:\0" for c in path)
            and all(part not in ("", ".", "..") for part in path.split("/")))


def matches(pattern, path):
    """Whether a file of the tree matches a pattern, segment by segment as in
    a shell: '*' and '?' never cross a '/', and a '**' segment takes any
    number of segments, none included (a runner that finds its tests at any
    depth)."""
    return segments_match(pattern.split("/"), path.split("/"))


def segments_match(wanted, parts):
    if not wanted:
        return not parts
    if wanted[0] == "**":
        return any(segments_match(wanted[1:], parts[at:]) for at in range(len(parts) + 1))
    return bool(parts) and fnmatch.fnmatchcase(parts[0], wanted[0]) and segments_match(wanted[1:], parts[1:])


def content_hash(raw):
    """The sha256 a record keeps for a file: the engine's, line ends folded."""
    return B.engine_hash(raw)


def line_hash(line):
    return hashlib.sha256(line.strip().encode("utf-8")).hexdigest()

# ----------------------------------------------------------------- the record


def empty_record():
    return {"source": "", "components": {}, "files": {}, "items": {}, "delivered": {}, "pending": [], "applied": ""}


def split_fields(value, count):
    fields = [part.strip() for part in value.split("|", count - 1)]
    return fields if len(fields) == count and all(fields) else None


def parse_params(text):
    """'<name>=<value>,...' or '-' as {name: value}, or None when it is neither."""
    if text == NO_PARAMS:
        return {}
    params = {}
    for pair in text.split(","):
        name, equals, value = pair.strip().partition("=")
        if not equals or not ID_SHAPE.match(name) or not PARAM_VALUE.match(value) or name in params:
            return None
        params[name] = value
    return params


def params_text(params):
    return ",".join("%s=%s" % (name, params[name]) for name in sorted(params)) or NO_PARAMS


def component_kind(cid):
    """'layer' or 'stack' for a component id with a valid name, else ''."""
    kind, colon, name = cid.partition(":")
    return kind if colon and kind in (LAYER, STACK) and ID_SHAPE.match(name) else ""


def read_record(text, problems):
    """An instance's components.txt as its components, the files and items each
    keeps with their bases, and what is pending; '' (no record) is an instance
    whose only component is the engine."""
    record = empty_record()
    if not text:
        return record
    rows = B.parse_data(text, RECORD_FILE, problems)
    owners = {}
    for row in rows:
        where = "%s:%d" % (RECORD_FILE, row["line"])
        if row["keyword"] == SOURCE_KEY:
            if record["source"] or not SOURCE_SHAPE.match(row["value"]):
                problems.append("%s: '%s %s' va una vez y es un identificador de catalogo" % (where, SOURCE_KEY, row["value"]))
            else:
                record["source"] = row["value"]
        elif row["keyword"] == COMPONENT_KEY:
            fields = split_fields(row["value"], 3)
            params = parse_params(fields[2]) if fields else None
            if not fields or not component_kind(fields[0]) or not COMMIT_SHAPE.match(fields[1]) or params is None:
                problems.append("%s: '%s' no es '<layer:nombre|stack:id> | <commit> | <parametros>'" % (where, row["value"]))
                continue
            if fields[0] in record["components"]:
                problems.append("%s: el componente %s ya se declaro antes" % (where, fields[0]))
                continue
            record["components"][fields[0]] = {"commit": fields[1], "params": params}
            record["files"][fields[0]], record["items"][fields[0]] = {}, {}
        elif row["keyword"] == FILE_KEY:
            fields = split_fields(row["value"], 3)
            if not fields or not is_relative_path(fields[1]) or not (fields[2] in (NO_BASE, KEPT) or SHA_SHAPE.match(fields[2])):
                problems.append("%s: '%s' no es '<componente> | <ruta> | <sha256, - o kept>'" % (where, row["value"]))
            elif fields[0] not in record["components"]:
                problems.append("%s: el fichero %s es de %s, que no se declaro antes" % (where, fields[1], fields[0]))
            elif fields[1] in owners:
                problems.append("%s: %s ya lo tiene %s, y una pieza tiene un solo dueno" % (where, fields[1], owners[fields[1]]))
            else:
                owners[fields[1]] = fields[0]
                record["files"][fields[0]][fields[1]] = fields[2]
        elif row["keyword"] == ITEM_KEY:
            fields = split_fields(row["value"], 5)
            unverified = fields and fields[2] == GATE and fields[4] == NO_BASE
            if not fields or fields[2] not in ITEM_FILES or ITEM_FILES[fields[2]] != fields[1] or not (unverified or SHA_SHAPE.match(fields[4])):
                problems.append("%s: '%s' no es '<componente> | <fichero> | <clase> | <clave o -> | <sha256>'" % (where, row["value"]))
            elif fields[0] not in record["components"]:
                problems.append("%s: la linea es de %s, que no se declaro antes" % (where, fields[0]))
            else:
                key = item_key(fields[2], fields[3], fields[4])
                owner = owners.get((fields[2], key))
                if owner:
                    problems.append("%s: esa linea de %s ya la tiene %s, y una pieza tiene un solo dueno" % (where, fields[1], owner))
                    continue
                owners[(fields[2], key)] = fields[0]
                record["items"][fields[0]][(fields[2], key)] = fields[4]
        elif row["keyword"] == DELIVERED_KEY:
            fields = split_fields(row["value"], 4)
            if not fields or not is_relative_path(fields[1]) or "|" in fields[3]:
                problems.append("%s: '%s' no es '<componente> | <ruta> | <para saber> | <manda sobre>'" % (where, row["value"]))
            elif component_kind(fields[0]) != STACK or fields[0] not in record["components"]:
                problems.append("%s: la guia %s es de %s, que no es una plantilla de stack declarada antes" % (where, fields[1], fields[0]))
            elif any(fields[1] in guides for guides in record["delivered"].values()):
                problems.append("%s: la guia %s ya se declaro antes" % (where, fields[1]))
            else:
                record["delivered"].setdefault(fields[0], {})[fields[1]] = {"learn": fields[2], "rules": fields[3]}
        elif row["keyword"] == APPLIED_KEY:
            if record["applied"] or not COMMIT_SHAPE.match(row["value"]):
                problems.append("%s: '%s %s' va una vez y es un commit" % (where, APPLIED_KEY, row["value"]))
            else:
                record["applied"] = row["value"]
        elif row["keyword"] == PENDING_KEY:
            fields = split_fields(row["value"], 3)
            if not fields or not (fields[0] == ENGINE or fields[0] in record["components"]) or not is_relative_path(fields[1]):
                problems.append("%s: '%s' no es '<engine o componente> | <ruta> | <que queda>'" % (where, row["value"]))
            else:
                record["pending"].append({"component": fields[0], "path": fields[1], "what": fields[2]})
    return record


def item_key(kind, key, sha):
    """How an item is found in its file: a gate by its label, the rest by the
    sha256 of their whole text."""
    return key if kind == GATE else sha


def render_record(record):
    """The text of components.txt or a standalone receipt: its legend, optional
    source provenance, each component with its files, its items and the guides
    it delivered, applied commit and what is pending, each group in a stable
    order."""
    lines = [RECORD_HEADER.rstrip("\n")]
    if record.get("source"):
        lines.append("%s %s" % (SOURCE_KEY, record["source"]))
    for cid in sorted(record["components"]):
        component = record["components"][cid]
        group = ["%s %s | %s | %s" % (COMPONENT_KEY, cid, component["commit"], params_text(component["params"]))]
        group += ["%s %s | %s | %s" % (FILE_KEY, cid, path, sha) for path, sha in sorted(record["files"].get(cid, {}).items())]
        for (kind, key), sha in sorted(record["items"].get(cid, {}).items()):
            group.append("%s %s | %s | %s | %s | %s" % (ITEM_KEY, cid, ITEM_FILES[kind], kind, key if kind == GATE else NO_BASE, sha))
        group += ["%s %s | %s | %s | %s" % (DELIVERED_KEY, cid, path, guide["learn"], guide["rules"])
                  for path, guide in sorted(record.get("delivered", {}).get(cid, {}).items())]
        lines.append("\n".join(group))
    if record.get("applied"):
        lines.append("%s %s" % (APPLIED_KEY, record["applied"]))
    pending = sorted(record["pending"], key=lambda item: (item["component"], item["path"], item["what"]))
    if pending:
        lines.append("\n".join("%s %s | %s | %s" % (PENDING_KEY, item["component"], item["path"], item["what"]) for item in pending))
    return "\n\n".join(lines) + "\n"


def owner_of(record, path):
    """The component that keeps a file, or ''."""
    return next((cid for cid, files in record["files"].items() if path in files), "")


# The files whose lines have their own owners (a layer's or the instance's)
# and the records the scaffold's tools keep: no component brings one whole.
SHARED_FILES = frozenset(ITEM_FILES.values()) | {B.BOARD_DIR + "/" + B.PROSE_FILE}
TOOL_RECORDS = frozenset({RECORD_FILE, RECEIPT_FILE, B.BOARD_DIR + "/" + B.MANIFEST_FILE})


def owner_conflicts(engine_paths, brought):
    """The problems of a file with two owners among what the engine and each
    component bring ({component: its paths}): a path two components bring,
    even with the same bytes; a path of the engine or of a record of the
    tools; and a path whose lines have their own owners."""
    problems, owners = [], {}
    for cid in sorted(brought):
        for path in sorted(brought[cid]):
            if path in engine_paths or path in TOOL_RECORDS:
                problems.append("%s: lo trae %s y es del motor, y una pieza tiene un solo dueno" % (path, cid))
            elif path in SHARED_FILES:
                problems.append("%s: lo trae %s entero, y sus lineas ya tienen sus duenos: una pieza tiene un solo dueno" % (path, cid))
            elif path in owners:
                problems.append("%s: lo traen %s y %s, y una pieza tiene un solo dueno" % (path, owners[path], cid))
            else:
                owners[path] = cid
    return problems

# ----------------------------------------------------------------- stack templates


def read_stack(text, source, problems):
    """A stack template's template.txt: its identity, its creation parameters,
    the patterns of its pieces, each copied byte for byte or rendered, and the
    guides the product owns."""
    stack = {"id": "", "params": [], "pieces": [], "guides": {}, "source": source}
    rows = B.parse_data(text, source, problems)
    stack["shared"] = B.values_of(rows, "shared")
    for path in stack["shared"]:
        if path not in SHARED_GUARDS or stack["shared"].count(path) != 1:
            problems.append("%s: guardia compartida desconocida o repetida: %s" % (source, path))
    ids = B.values_of(rows, STACK_KEY)
    if len(ids) != 1 or not ID_SHAPE.match(ids[0]):
        problems.append("%s tiene que declarar exactamente un 'stack <id>' en minusculas, cifras y guiones: la identidad de su componente" % source)
    else:
        stack["id"] = ids[0]
    by_name = {}
    for value in B.values_of(rows, PARAM_KEY):
        fields = split_fields(value, 3)
        if not fields or not ID_SHAPE.fullmatch(fields[0]) or not PARAM_VALUE.fullmatch(fields[1]) or fields[0] in by_name:
            problems.append("%s: 'param %s' no es '<nombre> | <valor por defecto> | <que es>', o repite el nombre" % (source, value))
            continue
        name, default, description = fields
        by_name[name] = {"name": name, "default": default, "what": description}
    stack["params"] = list(by_name.values())
    for value in B.values_of(rows, "syntax"):
        fields = split_fields(value, 3)
        if not fields or fields[0] not in by_name or fields[1] not in ("whole", "dotted") or "syntax" in by_name[fields[0]]:
            problems.append("%s: 'syntax %s' necesita un parametro declarado una sola vez, 'whole' o 'dotted', y un patron" % (source, value))
            continue
        name, scope, pattern = fields
        try:
            by_name[name]["syntax"] = (scope, re.compile(pattern, re.ASCII))
        except re.error as error:
            problems.append("%s: patron de '%s' invalido: %s" % (source, name, error))
    for value in B.values_of(rows, "reserved"):
        fields = split_fields(value, 2)
        if not fields or any(name not in by_name for name in fields[0].split()):
            problems.append("%s: 'reserved %s' necesita parametros declarados y palabras reservadas" % (source, value))
            continue
        for name in fields[0].split():
            by_name[name].setdefault("reserved", set()).update(fields[1].split())
    for param in stack["params"]:
        problem = parameter_problem(param, param["default"])
        if problem:
            problems.append("%s: valor por defecto invalido: %s" % (source, problem))
    for row in rows:
        if row["keyword"] not in (PIECE_KEY, RENDERED_KEY):
            continue
        fields = split_fields(row["value"], 2)
        if not fields or not is_relative_path(fields[0]):
            problems.append("%s:%d: '%s %s' no es '<patron> | <que es>'" % (source, row["line"], row["keyword"], row["value"]))
            continue
        stack["pieces"].append({"pattern": fields[0], "what": fields[1], "rendered": row["keyword"] == RENDERED_KEY})
    if not stack["pieces"]:
        problems.append("%s no declara ninguna pieza ('piece' o 'rendered'): una plantilla de stack sin piezas no tiene nada que mantener" % source)
    for value in B.values_of(rows, GUIDE_KEY):
        fields = split_fields(value, 3)
        if not fields or not is_relative_path(fields[0]) or "|" in fields[2] or fields[0] in stack["guides"]:
            problems.append("%s: 'guide %s' no es '<ruta> | <para saber> | <manda sobre>', o repite la ruta" % (source, value))
            continue
        stack["guides"][fields[0]] = {"learn": fields[1], "rules": fields[2]}
    return stack


def shared_paths(stack, paths):
    """The engine files a containerized standalone stack must carry itself."""
    if "tools/stack.txt" not in paths:
        return set()
    return LAUNCHER_FILES.union(stack.get("shared", ()))


def parameter_problem(param, value):
    """A parameter is portable in the receipt and valid everywhere its stack renders it."""
    scope, shape = param.get("syntax", ("whole", PARAM_VALUE))
    parts = value.split(".") if scope == "dotted" else [value]
    reserved = param.get("reserved", ())
    if not PARAM_VALUE.fullmatch(value) or any(not shape.fullmatch(part) or part in reserved for part in parts):
        return "el parametro '%s' no admite '%s' (%s; ejemplo: %s)" % (param["name"], value, param["what"], param["default"])
    return ""


def creation_params(stack, given):
    """The value of every parameter for a product, the given ones over the
    defaults, or the problems: a name the template does not declare, or a
    value that cannot be a name."""
    declared = {param["name"]: param for param in stack["params"]}
    problems = ["la plantilla de stack %s no declara el parametro '%s' (declara: %s)" % (stack["id"], name, ", ".join(sorted(declared)) or "ninguno")
                for name in given if name not in declared]
    values = {name: given.get(name, param["default"]) for name, param in declared.items()}
    for name, value in values.items():
        problem = parameter_problem(declared[name], value)
        if problem:
            problems.append(problem)
    return values, problems


def substitutions(stack, params):
    """(default, value) pairs in the order they are applied: each parameter's
    default and its form with '/' for '.', the longest first, so that a
    default inside another is replaced last."""
    pairs = []
    for param in stack["params"]:
        value = params.get(param["name"], param["default"])
        pairs.append((param["default"], value))
        if "." in param["default"]:
            pairs.append((param["default"].replace(".", "/"), value.replace(".", "/")))
    return sorted(pairs, key=lambda pair: -len(pair[0]))


def render_text(text, pairs):
    table = {old: new for old, new in reversed(pairs) if old}
    if not table:
        return text
    pattern = re.compile("|".join(re.escape(old) for old, _ in pairs if old))
    return pattern.sub(lambda match: table[match.group(0)], text)


def rendered_paths(paths, pairs):
    """The rendered paths, checked before reading or writing any file. A
    portable tree has no traversal, special Windows path or collision, even
    when two distinct template paths acquire the same name or parent."""
    rendered, owners = {}, {}
    devices = {"con", "prn", "aux", "nul"} | {prefix + str(number) for prefix in ("com", "lpt") for number in range(1, 10)}
    for path in sorted(paths):
        destination = render_text(path, pairs)
        parts = destination.split("/")
        unsafe = (not is_relative_path(destination) or any(character in destination for character in "*?\"<>|")
                  or any(ord(character) < 32 for character in destination)
                  or any(part.casefold() == ".git" or len(part.encode("utf-8")) > 255
                         or part.endswith((".", " ")) or part.split(".", 1)[0].casefold() in devices
                         for part in parts))
        if unsafe:
            raise ValueError("%s queda en una ruta no segura, %s, con estos parametros: debe ser relativa y permanecer dentro del destino" % (path, destination))
        key = destination.casefold()
        if key in owners:
            raise ValueError("%s y %s quedan en la misma ruta, %s, con estos parametros" % (owners[key], path, destination))
        rendered[path], owners[key] = destination, path
    for path, destination in rendered.items():
        parts = destination.casefold().split("/")
        for count in range(1, len(parts)):
            parent = "/".join(parts[:count])
            if parent in owners:
                raise ValueError("%s necesita una carpeta que tambien seria el fichero %s con estos parametros" % (path, owners[parent]))
    return rendered


def stack_pieces(stack, files, problems):
    """{template path: rendered?} of the stack template's files that its
    pieces declare. A pattern that matches nothing, or a file that a 'piece'
    and a 'rendered' row both claim, is a problem."""
    found = {}
    for piece in stack["pieces"]:
        matched = [path for path in files if matches(piece["pattern"], path)]
        if not matched:
            problems.append("%s: la pieza '%s' no casa con ningun fichero de la plantilla" % (stack["source"], piece["pattern"]))
        for path in matched:
            if path in found and found[path] != piece["rendered"]:
                problems.append("%s: %s lo declaran a la vez una fila 'piece' y una 'rendered'" % (stack["source"], path))
            found[path] = piece["rendered"]
    return found


def stack_guides(stack, files, pieces, problems):
    """{template path: its row of the authority table} of the guides a stack
    template delivers. A guide is a file of the starter and never a piece:
    the product owns what it says, and a piece is the template's to update."""
    for path in sorted(stack["guides"]):
        if path not in files:
            problems.append("%s: la guia '%s' no es un fichero de la plantilla" % (stack["source"], path))
        elif path in pieces:
            problems.append("%s: %s es a la vez una guia y una pieza: una guia es del producto, y una pieza la actualiza la plantilla"
                            % (stack["source"], path))
    return dict(stack["guides"])


def authority_row(path, guide):
    """The row a guide has in the authority table of the contract."""
    return "| %s | `%s` | %s |" % (guide["learn"], path, guide["rules"])


def rendered_pieces(stack, pieces, params, raw_of):
    """{product path: bytes} of the pieces as a product with `params` has them:
    every path rendered, and the content of the 'rendered' ones; `raw_of`
    gives a template file's bytes. A rendered piece that is not UTF-8 raises
    UnicodeDecodeError: its bytes cannot be rendered."""
    pairs = substitutions(stack, params)
    paths = rendered_paths(pieces, pairs)
    shipped = {}
    for path, rendered in sorted(pieces.items()):
        raw = raw_of(path)
        if rendered:
            raw = render_text(raw.decode("utf-8"), pairs).encode("utf-8")
        shipped[paths[path]] = raw
    return shipped

# ----------------------------------------------------------------- layer items


def gate_parts(row, number=0):
    """A gate row as (label, its managed text, its reference column): the
    label, the harness tag and the command are the layer's; the reference
    seconds are the instance's, measured on its machine, so they never count
    as a change of the row. `number` is its line in gates.txt, for the error
    of a row that does not parse (0 when it comes from elsewhere)."""
    gate = V.parse_gate_row(row, number, "python")
    managed = "%s%s | %s" % (gate["label"], " [harness]" if gate["harness"] else "", gate["raw"])
    parts = row.split("|", 2)
    return gate["label"], managed, parts[1].strip() if len(parts) == 3 else ""


def layer_lines(layer, skill_lines):
    """[(kind, key, sha256, line)] of what a layer writes into the files the
    instance shares, `skill_lines` being the index lines of the skills it
    brings."""
    found = []
    for row in layer["gates"]:
        label, managed, _ = gate_parts(row)
        found.append((GATE, label, line_hash(managed), row))
    for kind, rows in ((DOCUMENT, layer["documents"]), (IGNORE, layer["ignore"]), (SKILL, skill_lines)):
        for row in rows:
            sha = line_hash(row)
            found.append((kind, sha, sha, row))
    return found


def local_lines(texts):
    """What the instance's shared files hold, as the plan compares them: each
    gate row by label, with the sha256 of its managed text, the row and its
    reference column; and for the other kinds the sha256 of every line.
    'problems' names the gate rows it cannot read, which a plan that compared
    them as absent would get wrong."""
    gates, problems = {}, []
    for number, line in enumerate(texts.get(GATES_FILE, "").split("\n"), 1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or V.guard_row(stripped) or "|" not in stripped:
            continue
        try:
            label, managed, reference = gate_parts(stripped, number)
        except V.GatesFileError as error:
            problems.append("la fila de puerta de la instancia no se lee (%s): se corrige antes de actualizar" % error)
            continue
        gates[label] = {"sha": line_hash(managed), "line": line, "reference": reference}
    present = {kind: {line_hash(line) for line in texts.get(path, "").split("\n") if line.strip()} for kind, path in ITEM_FILES.items() if kind != GATE}
    return {"gates": gates, "present": present, "problems": problems}


def local_item_sha(local, kind, key):
    """The sha256 of the line an item names in the instance, or None."""
    if kind == GATE:
        gate = local["gates"].get(key)
        return gate["sha"] if gate else None
    return key if key in local["present"][kind] else None

# ----------------------------------------------------------------- three-way


TAKE, ADD, REMOVE, KEEP, CURRENT, STOP, RELEASE = "take", "add", "remove", "keep", "current", "stop", "release"
WRITES = (TAKE, ADD, REMOVE)


def three_way(declared, local, shipped, owner):
    """The action for one kept piece and why, as (action, reason), from three
    sha256: the base the record declares (None: not kept yet; NO_BASE: kept
    without a base anyone can verify), the instance's and the target's (None:
    there is none). A local change is kept unless the target changes the same
    piece, which stops the plan before anything is written. `owner` says, in
    the team language, whose piece it is ('al motor', 'a la capa dotnet')."""
    if shipped is not None and local == shipped:
        return CURRENT, ""
    if declared == NO_BASE:
        if shipped is None and local is None:
            return CURRENT, ""
        return STOP, ("no tiene base verificable (se adopto distinto de toda version de la plantilla): concilialo a mano con el destino y"
                      " `--done <ruta>`, o `--keep <ruta>` para que pase a ser del producto")
    if declared is None:
        if local is None:
            return ADD, "la plantilla lo trae %s" % owner
        return STOP, "la plantilla lo trae %s y la instancia ya tiene uno distinto: apartalo o decide antes" % owner
    if shipped is None:
        if local is None:
            return CURRENT, ""
        if local == declared:
            return REMOVE, "la plantilla lo quita %s y la instancia no lo cambio" % owner
        return STOP, ("la plantilla lo quita %s y la instancia lo cambio: borralo tu, o `--keep <ruta>` para que pase a"
                      " ser del producto" % owner)
    if local == declared:
        return TAKE, "la plantilla lo cambio y la instancia no"
    if shipped == declared:
        return KEEP, "se conserva su parche local: la plantilla no lo cambio" if local is not None else "falta en la instancia y la plantilla no lo cambio"
    if local is None:
        return STOP, "falta en la instancia y la plantilla lo cambio: restauralo como vino, o decide antes"
    return STOP, ("la instancia lo cambio (un parche local) y la plantilla tambien: concilialo a mano y `--done <ruta>`,"
                  " o quita el parche, y vuelve a correr la actualizacion")


def set_item_action(declared, local, shipped, owner):
    """The action for a line found by its whole text: present or absent is all
    an instance can change of it, so a line it removed stays removed and one
    the template adds or drops follows the template."""
    if shipped is not None:
        if local is not None:
            return CURRENT, ""
        if declared is not None:
            return KEEP, "la instancia la quito y la plantilla no la cambio: se respeta"
        return ADD, "la plantilla la trae %s" % owner
    if local is None:
        return CURRENT, ""
    return REMOVE, "la plantilla la quita %s" % owner


def plan_files(declared, local, shipped, owner, released=()):
    """[(path, action, reason)] of every file a component keeps or brings:
    `declared` the record's bases, `local` the instance's sha256 of each,
    `shipped` the target's; a kept file the target still has but no longer
    declares a piece (`released`) stops being kept, untouched, and a file the
    product took for itself (KEPT) is never touched."""
    planned = []
    for path in sorted(set(declared) | set(shipped)):
        if declared.get(path) == KEPT:
            planned.append((path, KEEP, "es del producto (--keep): ninguna actualizacion lo toca"))
            continue
        if path in released and path not in shipped:
            planned.append((path, RELEASE, "la plantilla ya no la mantiene como pieza: queda en el producto, sin tocarla"))
            continue
        planned.append((path,) + three_way(declared.get(path), local.get(path), shipped.get(path), owner))
    return planned


def plan_items(declared, local, shipped, owner):
    """[((kind, key), action, reason)] of every line a component keeps or
    brings: `declared` {(kind, key): base sha256}, `local` the instance as
    local_lines read it, `shipped` {(kind, key): sha256} of the target."""
    planned = []
    ambiguous = {kind for kind, key in declared if kind != GATE and (kind, key) not in shipped and local_item_sha(local, kind, key) is None}
    for kind, key in sorted(set(declared) | set(shipped)):
        mine = local_item_sha(local, kind, key)
        decide = three_way if kind == GATE else set_item_action
        action, reason = decide(declared.get((kind, key)), mine, shipped.get((kind, key)), owner)
        if kind in ambiguous and (action in WRITES or (kind, key) not in shipped):
            action, reason = STOP, ("una fila registrada falta en la instancia y la plantilla la retira o cambia: puede estar editada, no se adivina"
                                    " cual es; concilia %s y `--done %s` antes de modificar sus filas" % (ITEM_FILES[kind], ITEM_FILES[kind]))
        planned.append(((kind, key), action, reason))
    return planned


def reconcile_transfers(record, components, local_hashes, owner_label):
    """Reconcile per-path ownership transfers atomically across components
    (for example, moving docs/ARCHITECTURE.md from a layer to its stack).
    When one recorded component stops shipping a path and another recorded
    component begins shipping that same path, evaluates three-way against the
    previous owner's base instead of letting the old owner delete the file on
    disk. Two simultaneous shippers in the target always stop before writing."""
    by_path = {}
    for component in components:
        for index, (path, action, reason) in enumerate(component["files"]):
            by_path.setdefault(path, []).append((component, index, action, reason))
    conflicts = []
    for path, entries in sorted(by_path.items()):
        if len(entries) < 2:
            continue
        shippers = [(cp, idx) for cp, idx, _, _ in entries if path in cp["shipped_files"]]
        droppers = [(cp, idx) for cp, idx, _, _ in entries if path not in cp["shipped_files"]]
        if len(shippers) > 1:
            names = ", ".join(sorted(cp["cid"] for cp, _ in shippers))
            conflicts.append("%s: lo traen a la vez %s, y una pieza tiene un solo dueno" % (path, names))
            continue
        if len(shippers) != 1 or len(droppers) != 1:
            continue
        old_cp, old_idx = droppers[0]
        new_cp, new_idx = shippers[0]
        old_declared = record["files"].get(old_cp["cid"], {}).get(path)
        new_shipped = new_cp["shipped_files"][path]
        local = local_hashes.get(path)
        if old_declared == KEPT:
            old_cp["files"][old_idx] = (path, RELEASE, "propiedad transferida a %s (se conserva --keep)" % new_cp["cid"])
            new_cp["files"][new_idx] = (path, KEEP, "es del producto (--keep): ninguna actualizacion lo toca")
            new_cp.setdefault("transferred_kept", set()).add(path)
        elif old_declared == NO_BASE:
            old_cp["files"][old_idx] = (path, RELEASE, "propiedad transferida a %s (sin base verificable)" % new_cp["cid"])
            new_cp["files"][new_idx] = (
                path, STOP,
                "no tiene base verificable durante el traspaso de %s a %s: concilialo a mano con el destino y `--done %s`, o `--keep %s`"
                % (old_cp["cid"], new_cp["cid"], path, path),
            )
        else:
            action, reason = three_way(old_declared, local, new_shipped, owner_label(new_cp["cid"]))
            old_cp["files"][old_idx] = (path, RELEASE, "propiedad transferida a %s" % new_cp["cid"])
            new_cp["files"][new_idx] = (path, action, reason)
            if action == KEEP:
                new_cp.setdefault("transferred_base", {})[path] = new_shipped
    return conflicts
